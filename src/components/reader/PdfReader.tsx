'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Book } from '@/types/book';
import { updateBookProgress } from '@/lib/db';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { playPageTurnSound } from '@/lib/audio/soundEffects';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PdfReaderProps {
  book: Book;
  onPageChange?: (page: number, total: number) => void;
}

export default function PdfReader({ book, onPageChange }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  const initialPage = typeof book.currentLocation === 'number' ? book.currentLocation : 1;
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(book.totalLocations || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev' | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const { settings, setTotalPages: setStoreTotalPages, setCurrentPage: setStoreCurrentPage } = useReaderStore();

  // Load PDF Document
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
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load PDF document:', err);
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [book, setStoreTotalPages]);

  // Render current page to Canvas with HiDPI support
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * (window.innerWidth < 768 ? 0.8 : 1.1) });

      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

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
  }, [scale]);

  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      renderPage(currentPage);
      setStoreCurrentPage(currentPage);
      if (onPageChange) {
        onPageChange(currentPage, totalPages);
      }
      // Save progress to IndexedDB
      const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
      updateBookProgress(book.id, progress, currentPage);
    }
  }, [currentPage, isLoading, totalPages, renderPage, book.id, onPageChange, setStoreCurrentPage]);

  // Page Turn Handlers with Animation
  const goToPage = useCallback((newPage: number, direction: 'next' | 'prev') => {
    if (newPage < 1 || newPage > totalPages || isFlipping) return;

    if (settings.soundEffects) {
      playPageTurnSound();
    }

    if (settings.pageTurnAnimation !== 'none') {
      setIsFlipping(true);
      setTurnDirection(direction);
      setTimeout(() => {
        setCurrentPage(newPage);
        setTimeout(() => {
          setIsFlipping(false);
          setTurnDirection(null);
        }, 250);
      }, 150);
    } else {
      setCurrentPage(newPage);
    }
  }, [totalPages, isFlipping, settings.soundEffects, settings.pageTurnAnimation]);

  const handleNextPage = useCallback(() => {
    goToPage(currentPage + 1, 'next');
  }, [goToPage, currentPage]);

  const handlePrevPage = useCallback(() => {
    goToPage(currentPage - 1, 'prev');
  }, [goToPage, currentPage]);

  // Keyboard navigation
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

  // Theme styling for canvas wrapper
  const getThemeFilter = () => {
    if (settings.theme === 'sepia') {
      return 'sepia(0.35) contrast(0.95) brightness(0.98)';
    }
    if (settings.theme === 'dark') {
      return 'invert(0.88) hue-rotate(180deg) contrast(0.95) brightness(0.92)';
    }
    return 'none';
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] w-full py-6 select-none overflow-x-hidden"
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-4 py-32 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium opacity-70">Membuka dokumen PDF...</p>
        </div>
      ) : (
        <div className="relative group flex items-center justify-center max-w-full">
          {/* Previous Page Click Zone / Floating Button */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isFlipping}
            aria-label="Halaman Sebelumnya"
            className="hidden md:flex absolute left-[-60px] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 backdrop-blur-md transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none shadow-lg active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* 3D Realistic Page Container with GPU acceleration */}
          <div
            style={{
              perspective: '1500px',
              perspectiveOrigin: turnDirection === 'next' ? 'left center' : 'right center',
            }}
            className="relative"
          >
            <div
              style={{
                filter: getThemeFilter(),
                transition: settings.pageTurnAnimation === 'curl' 
                  ? 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.35s ease' 
                  : 'transform 0.25s ease-out, opacity 0.25s ease-out',
                transform: isFlipping
                  ? settings.pageTurnAnimation === 'curl'
                    ? turnDirection === 'next'
                      ? 'rotateY(-22deg) scale(0.98)'
                      : 'rotateY(22deg) scale(0.98)'
                    : turnDirection === 'next'
                      ? 'translateX(-15px) opacity(0.7)'
                      : 'translateX(15px) opacity(0.7)'
                  : 'rotateY(0deg) scale(1) translateX(0)',
                transformOrigin: turnDirection === 'next' ? 'left center' : 'right center',
                willChange: 'transform, filter',
              }}
              className="relative shadow-2xl rounded-sm overflow-hidden bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10"
            >
              {/* Paper Spine crease shadow */}
              <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-black/15 via-black/5 to-transparent z-10" />

              {/* Render Canvas */}
              <canvas ref={canvasRef} className="block max-w-full h-auto cursor-pointer" onClick={handleNextPage} />
            </div>
          </div>

          {/* Next Page Click Zone / Floating Button */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || isFlipping}
            aria-label="Halaman Selanjutnya"
            className="hidden md:flex absolute right-[-60px] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 backdrop-blur-md transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none shadow-lg active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Floating Zoom & Quick Navigation Controls */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-xl transition-all duration-300">
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          title="Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs font-semibold px-2 min-w-[70px] text-center tracking-tight">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30"
          title="Selanjutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

        <button
          onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          title="Perkecil"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={() => setScale(1.2)}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          title="Reset Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setScale((s) => Math.min(2.2, s + 0.15))}
          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          title="Perbesar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
