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

  // Apply Theme & Font Styles with WCAG AAA Contrast
  const applyStyles = useCallback(() => {
    if (!renditionRef.current) return;

    const rendition = renditionRef.current;

    let bgColor = '#FAF9F6';
    let textColor = '#1C1917';

    if (settings.theme === 'sepia') {
      bgColor = '#F5EEDB';
      textColor = '#261B11';
    } else if (settings.theme === 'dark') {
      bgColor = '#0C0C0E';
      textColor = '#F4F4F5';
    }

    let fontFamily = '"Charter", "Bitstream Charter", "Iowan Old Style", Georgia, serif';
    if (settings.fontFamily === 'sans') {
      fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    } else if (settings.fontFamily === 'mono') {
      fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    }

    rendition.themes.default({
      body: {
        background: `${bgColor} !important`,
        color: `${textColor} !important`,
        'font-family': `${fontFamily} !important`,
        'font-size': `${settings.fontSize}px !important`,
        'line-height': `${settings.lineHeight || 1.75} !important`,
        padding: '0 32px !important',
      },
      p: {
        'font-family': `${fontFamily} !important`,
        'line-height': `${settings.lineHeight || 1.75} !important`,
        'margin-bottom': '1.25em !important',
      },
      'h1, h2, h3, h4': {
        color: `${textColor} !important`,
        'font-family': `${fontFamily} !important`,
        'font-weight': 'bold !important',
      },
      a: {
        color: settings.theme === 'dark' ? '#FBBF24 !important' : '#B45309 !important',
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

        epubBook.ready.then(() => {
          return epubBook.locations.generate(1024);
        });

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

          const startLocation =
            typeof book.currentLocation === 'string' && book.currentLocation.length > 0
              ? book.currentLocation
              : undefined;

          rendition.display(startLocation).then(() => {
            if (isMounted) {
              setIsLoading(false);
              applyStyles();
            }
          });

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

  useEffect(() => {
    applyStyles();
  }, [applyStyles]);

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
          <div
            className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Menyiapkan halaman e-book...
          </p>
        </div>
      )}

      {/* Reader Container */}
      <div className="relative w-full max-w-3xl h-[82vh] mx-auto px-4 sm:px-8 py-4 flex items-center justify-center">
        <button
          onClick={handlePrev}
          aria-label="Sebelumnya"
          className="hidden md:flex absolute -left-12 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl items-center justify-center border shadow-md transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* EPUB iframe container */}
        <div
          ref={viewerRef}
          className="w-full h-full rounded-xl border shadow-xl overflow-hidden transition-all duration-300"
          style={{
            backgroundColor:
              settings.theme === 'sepia'
                ? '#F5EEDB'
                : settings.theme === 'dark'
                ? '#0C0C0E'
                : '#FAF9F6',
            borderColor: 'var(--border-color)',
          }}
        />

        <button
          onClick={handleNext}
          aria-label="Selanjutnya"
          className="hidden md:flex absolute -right-12 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl items-center justify-center border shadow-md transition-all active:scale-95"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Progress Indicator */}
      <div
        className="fixed bottom-4 z-20 flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-bold shadow-md"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>Progres:</span>
        <span style={{ color: 'var(--accent)' }}>{currentProgress}%</span>
      </div>
    </div>
  );
}
