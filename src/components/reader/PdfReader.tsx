'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Book } from '@/types/book';
import { updateBookProgress } from '@/lib/db';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { playPageTurnSound } from '@/lib/audio/soundEffects';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Lamp,
  Moon,
} from 'lucide-react';

interface PdfReaderProps {
  book: Book;
  onPageChange?: (page: number, total: number) => void;
}

export default function PdfReader({ book, onPageChange }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const initialPage =
    typeof book.currentLocation === 'number' && book.currentLocation > 0
      ? book.currentLocation
      : 1;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(book.totalLocations || 1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [slidePhase, setSlidePhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  const {
    settings,
    setPdfDarkModeStyle,
    setTotalPages: setStoreTotalPages,
    setCurrentPage: setStoreCurrentPage,
  } = useReaderStore();

  // Load PDF Document & Auto-fit scale to viewport
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      try {
        const pdfjs = await import('pdfjs-dist');
        if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const arrayBuffer = await book.fileData.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setStoreTotalPages(doc.numPages);

        // Auto-fit scale to window height to guarantee zero scrollbars on load
        try {
          const firstPage = await doc.getPage(1);
          const rawViewport = firstPage.getViewport({ scale: 1.0 });
          const availableHeight = Math.max(450, window.innerHeight - 150);
          const fitScale = Math.min(1.4, Math.max(0.65, availableHeight / rawViewport.height));
          setScale(Number(fitScale.toFixed(2)));
        } catch (e) {
          console.debug(e);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load PDF document:', err);
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          console.debug(e);
        }
      }
    };
  }, [book, setStoreTotalPages]);

  // Render current page to Canvas with HiDPI support
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          console.debug(e);
        }
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDocRef.current.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF Page render error:', err);
        }
      }
    },
    [scale]
  );

  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, isLoading, renderPage]);

  useEffect(() => {
    if (isLoading) return;

    setStoreCurrentPage(currentPage);
    if (onPageChangeRef.current) {
      onPageChangeRef.current(currentPage, totalPages);
    }

    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    updateBookProgress(book.id, progress, currentPage);
  }, [currentPage, totalPages, isLoading, book.id, setStoreCurrentPage]);

  // Smooth, fluid e-reader slide transition (Kindle / Apple Books standard)
  const goToPage = useCallback(
    (newPage: number, direction: 'next' | 'prev') => {
      if (newPage < 1 || newPage > totalPages || slidePhase !== 'idle') return;

      if (settings.soundEffects) {
        playPageTurnSound();
      }

      setSlideDirection(direction);
      setSlidePhase('exit');

      setTimeout(() => {
        setCurrentPage(newPage);
        setSlidePhase('enter');
        setTimeout(() => {
          setSlidePhase('idle');
        }, 180);
      }, 140);
    },
    [totalPages, slidePhase, settings.soundEffects]
  );

  const handleNextPage = useCallback(() => {
    goToPage(currentPage + 1, 'next');
  }, [goToPage, currentPage]);

  const handlePrevPage = useCallback(() => {
    goToPage(currentPage - 1, 'prev');
  }, [goToPage, currentPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage]);

  const getThemeFilter = () => {
    if (settings.theme === 'sepia') {
      return 'sepia(0.18) brightness(0.98) contrast(1.02)';
    }
    if (settings.theme === 'dark') {
      if (settings.pdfDarkModeStyle === 'invert') {
        return 'invert(0.9) brightness(0.95) contrast(0.92)';
      }
      return 'brightness(0.90) contrast(1.02)';
    }
    return 'none';
  };

  const getPageBoxShadow = () => {
    if (settings.theme === 'dark') {
      if (settings.pdfDarkModeStyle === 'invert') {
        return '0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.15)';
      }
      return '0 20px 50px -10px rgba(0, 0, 0, 0.85), 0 0 20px rgba(245, 158, 11, 0.05), 0 0 1px rgba(255, 255, 255, 0.15)';
    }
    if (settings.theme === 'sepia') {
      return '2px 2px 0 #D9CDB0, 4px 4px 0 #CFC3A4, 0 20px 35px -10px rgba(45, 30, 15, 0.15)';
    }
    return '2px 2px 0 #E6E2D8, 4px 4px 0 #DED9CD, 0 20px 35px -10px rgba(0, 0, 0, 0.1)';
  };

  // Determine transition transforms
  const getPageMotionStyle = () => {
    if (slidePhase === 'exit') {
      return {
        transform: slideDirection === 'next' ? 'translateX(-30px)' : 'translateX(30px)',
        opacity: 0.35,
        transition: 'transform 0.14s ease-in, opacity 0.14s ease-in',
      };
    }
    if (slidePhase === 'enter') {
      return {
        transform: 'translateX(0)',
        opacity: 1,
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease-out',
      };
    }
    return {
      transform: 'translateX(0)',
      opacity: 1,
      transition: 'none',
    };
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col items-center justify-center relative select-none overflow-hidden"
    >
      {/* Dark Mode Ambient Spotlight */}
      {settings.theme === 'dark' && settings.pdfDarkModeStyle === 'ambient' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.05) 0%, rgba(12, 12, 14, 0) 70%)',
          }}
        />
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-inherit">
          <div
            className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Membuka lembaran buku...
          </p>
        </div>
      )}

      {/* Main Reading Stage */}
      <div
        className={`relative flex items-center justify-center max-w-full max-h-full ${
          isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'
        }`}
      >
        {/* Previous Page Button */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1 || slidePhase !== 'idle'}
          aria-label="Halaman Sebelumnya"
          className="hidden md:flex absolute left-[-64px] top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl items-center justify-center border shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Book Sheet Container with Smooth Slide & Layered Pages */}
        <div className="relative">
          {/* Stacked Pages Edge Depth on the right */}
          <div
            className="absolute -right-2 top-1.5 bottom-1.5 w-2 rounded-r-sm pointer-events-none transition-colors"
            style={{
              backgroundColor: settings.theme === 'dark' ? '#27272A' : '#EFECE4',
              boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.15)',
            }}
          />

          {/* Animated Page Paper */}
          <div
            style={{
              ...getPageMotionStyle(),
              filter: getThemeFilter(),
              boxShadow: getPageBoxShadow(),
              backgroundColor: '#FFFFFF',
            }}
            className="relative rounded-md overflow-hidden border border-black/10 dark:border-white/10"
          >
            {/* Ribbon Bookmark Accent (Top Right) */}
            <div
              className="absolute top-0 right-8 w-3.5 h-7 z-20 pointer-events-none shadow-sm rounded-b-xs"
              style={{
                backgroundColor: 'var(--accent)',
              }}
            />

            {/* Book Spine crease shadow on left */}
            <div className="absolute inset-y-0 left-0 w-5 pointer-events-none bg-gradient-to-r from-black/20 via-black/5 to-transparent z-10" />

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              className="block max-w-full max-h-[calc(100vh-140px)] w-auto h-auto cursor-pointer"
              onClick={handleNextPage}
            />
          </div>
        </div>

        {/* Next Page Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages || slidePhase !== 'idle'}
          aria-label="Halaman Selanjutnya"
          className="hidden md:flex absolute right-[-64px] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-2xl items-center justify-center border shadow-lg transition-all active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Bottom Control Capsule */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          title="Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          className="text-xs font-bold px-2 min-w-[65px] text-center tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          title="Selanjutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Dark Mode Style Toggle */}
        {settings.theme === 'dark' && (
          <>
            <button
              onClick={() =>
                setPdfDarkModeStyle(
                  settings.pdfDarkModeStyle === 'ambient' ? 'invert' : 'ambient'
                )
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all"
              style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--accent)',
                color: 'var(--accent-text)',
              }}
              title="Ganti Mode Tampilan Gelap (Lampu Meja vs Invert Teks)"
            >
              {settings.pdfDarkModeStyle === 'ambient' ? (
                <>
                  <Lamp className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Lampu Meja</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px]">Invert Halus</span>
                </>
              )}
            </button>
            <div className="h-4 w-[1px] mx-1" style={{ backgroundColor: 'var(--border-color)' }} />
          </>
        )}

        <button
          onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.1).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Perkecil"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            const availableHeight = Math.max(450, window.innerHeight - 150);
            const fitScale = Math.min(1.4, Math.max(0.65, availableHeight / 842));
            setScale(Number(fitScale.toFixed(2)));
          }}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Pas ke Layar"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setScale((s) => Math.min(2.0, Number((s + 0.1).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Perbesar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
