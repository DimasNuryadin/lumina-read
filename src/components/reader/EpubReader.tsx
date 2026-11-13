'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Book, TableOfContentsItem } from '@/types/book';
import { updateBookProgress } from '@/lib/db';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { playPageTurnSound } from '@/lib/audio/soundEffects';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EpubReaderProps {
  book: Book;
  onTocLoaded?: (toc: TableOfContentsItem[]) => void;
  onLocationChange?: (progressPercent: number, cfi: string) => void;
}

export default function EpubReader({ book, onTocLoaded, onLocationChange }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookInstanceRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentProgress, setCurrentProgress] = useState<number>(book.readingProgress || 0);

  const { settings, setCurrentCfi } = useReaderStore();

  // Apply Theme & Font Styles to Epubjs Rendition
  const applyStyles = useCallback(() => {
    if (!renditionRef.current) return;

    const rendition = renditionRef.current;

    // Theme backgrounds & text colors
    let bgColor = '#ffffff';
    let textColor = '#18181b';

    if (settings.theme === 'sepia') {
      bgColor = '#f7f2e4';
      textColor = '#3d2e1e';
    } else if (settings.theme === 'dark') {
      bgColor = '#121214';
      textColor = '#d4d4d8';
    }

    // Font families
    let fontFamily = 'Georgia, "Times New Roman", serif';
    if (settings.fontFamily === 'sans') {
      fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    } else if (settings.fontFamily === 'mono') {
      fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    }

    rendition.themes.default({
      body: {
        background: `${bgColor} !important`,
        color: `${textColor} !important`,
        'font-family': `${fontFamily} !important`,
        'font-size': `${settings.fontSize}px !important`,
        'line-height': `${settings.lineHeight} !important`,
        padding: '0 24px !important',
      },
      p: {
        'font-family': `${fontFamily} !important`,
        'line-height': `${settings.lineHeight} !important`,
        'margin-bottom': '1em !important',
      },
      'h1, h2, h3, h4': {
        color: `${textColor} !important`,
        'font-family': `${fontFamily} !important`,
      },
      a: {
        color: settings.theme === 'dark' ? '#38bdf8 !important' : '#0284c7 !important',
      },
    });
  }, [settings]);

  // Initialize EPUB
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function initEpub() {
      try {
        const ePub = (await import('epubjs')).default;
        const arrayBuffer = await book.fileData.arrayBuffer();
        if (!isMounted) return;

        const epubBook = ePub(arrayBuffer);
        bookInstanceRef.current = epubBook;

        // Generate locations for accurate progress calculation
        epubBook.ready.then(() => {
          return epubBook.locations.generate(1024);
        });

        // Load Table of Contents
        epubBook.loaded.navigation.then((nav: any) => {
          if (isMounted && onTocLoaded && nav.toc) {
            const formattedToc: TableOfContentsItem[] = nav.toc.map((item: any) => ({
              id: item.id || item.href,
              label: item.label?.trim() || 'Bab Tanpa Judul',
              href: item.href,
            }));
            onTocLoaded(formattedToc);
          }
        });

        if (viewerRef.current) {
          const rendition = epubBook.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'paginated',
          });

          renditionRef.current = rendition;

          // Display last saved location if available
          const startLocation = typeof book.currentLocation === 'string' && book.currentLocation.length > 0 
            ? book.currentLocation 
            : undefined;

          rendition.display(startLocation).then(() => {
            if (isMounted) {
              setIsLoading(false);
              applyStyles();
            }
          });

          // Relocate event listener for progress tracking
          rendition.on('relocated', (location: any) => {
            if (!isMounted) return;
            const cfi = location.start.cfi;
            setCurrentCfi(cfi);

            let progress = 0;
            if (epubBook.locations && (epubBook.locations as any).total > 0) {
              progress = Math.round(epubBook.locations.percentageFromCfi(cfi) * 100);
            }
            setCurrentProgress(progress);

            if (onLocationChange) {
              onLocationChange(progress, cfi);
            }

            // Auto-save to IndexedDB
            updateBookProgress(book.id, progress, cfi);
          });
        }
      } catch (err) {
        console.error('Failed to initialize EPUB reader:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    initEpub();

    return () => {
      isMounted = false;
      if (renditionRef.current) {
        try {
          renditionRef.current.destroy();
        } catch (e) {
          console.debug('Error destroying rendition:', e);
        }
      }
    };
  }, [book, onTocLoaded, onLocationChange, setCurrentCfi, applyStyles]);

  // Re-apply styles whenever settings change
  useEffect(() => {
    applyStyles();
  }, [applyStyles]);

  // Handlers for next / previous page
  const handleNext = useCallback(() => {
    if (renditionRef.current) {
      if (settings.soundEffects) playPageTurnSound();
      renditionRef.current.next();
    }
  }, [settings.soundEffects]);

  const handlePrev = useCallback(() => {
    if (renditionRef.current) {
      if (settings.soundEffects) playPageTurnSound();
      renditionRef.current.prev();
    }
  }, [settings.soundEffects]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-[calc(100vh-80px)] select-none">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-inherit animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium opacity-70">Menyiapkan halaman e-book...</p>
        </div>
      )}

      {/* Reader Container */}
      <div className="relative w-full max-w-3xl h-[82vh] mx-auto px-4 sm:px-8 py-4 flex items-center justify-center">
        {/* Navigation Floating Buttons */}
        <button
          onClick={handlePrev}
          aria-label="Sebelumnya"
          className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 shadow-md"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* EPUB iframe container */}
        <div
          ref={viewerRef}
          className="w-full h-full rounded-lg shadow-xl overflow-hidden transition-all duration-300"
          style={{
            backgroundColor:
              settings.theme === 'sepia'
                ? '#f7f2e4'
                : settings.theme === 'dark'
                ? '#121214'
                : '#ffffff',
          }}
        />

        <button
          onClick={handleNext}
          aria-label="Selanjutnya"
          className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 backdrop-blur-md transition-all active:scale-95 shadow-md"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Progress Bar */}
      <div className="fixed bottom-4 z-20 flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-lg border border-black/5 dark:border-white/10 text-xs font-medium shadow-md">
        <span>Progres Membaca:</span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">{currentProgress}%</span>
      </div>
    </div>
  );
}
