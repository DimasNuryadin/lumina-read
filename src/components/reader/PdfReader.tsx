'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Book } from '@/types/book';
import { updateBookProgress } from '@/lib/db';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { playPageTurnSound } from '@/lib/audio/soundEffects';
import { goeyToast } from 'goey-toast';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Lamp,
  Moon,
  Search,
  X,
  Minimize2,
  BookOpen,
  FileText,
} from 'lucide-react';

interface PdfReaderProps {
  book: Book;
  onPageChange?: (page: number, total: number) => void;
}

export default function PdfReader({ book, onPageChange }: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftRenderTaskRef = useRef<any>(null);
  const rightRenderTaskRef = useRef<any>(null);
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
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Jump to Page Popover State
  const [isJumpOpen, setIsJumpOpen] = useState<boolean>(false);
  const [jumpInput, setJumpInput] = useState<string>(String(initialPage));

  const {
    settings,
    isControlsVisible,
    toggleZenMode,
    setPdfDarkModeStyle,
    toggleTwoPageSpread,
    setTotalPages: setStoreTotalPages,
    setCurrentPage: setStoreCurrentPage,
  } = useReaderStore();

  // Two-page pairing logic
  const isTwoPage = settings.twoPageSpread;
  const leftPage = isTwoPage
    ? currentPage % 2 === 0
      ? currentPage - 1
      : currentPage
    : currentPage;
  const rightPage = isTwoPage && leftPage + 1 <= totalPages ? leftPage + 1 : null;

  // Auto-fit scale to viewport helper
  const adjustScaleToFit = useCallback(
    async (twoPagesMode: boolean) => {
      if (!pdfDocRef.current) return;
      try {
        const firstPage = await pdfDocRef.current.getPage(1);
        const rawViewport = firstPage.getViewport({ scale: 1.0 });
        const availableHeight = Math.max(450, window.innerHeight - 150);
        const availableWidth = Math.max(600, window.innerWidth - 120);

        if (twoPagesMode) {
          const scaleByWidth = availableWidth / 2 / rawViewport.width;
          const scaleByHeight = availableHeight / rawViewport.height;
          const fitScale = Math.min(1.15, Math.max(0.42, Math.min(scaleByWidth, scaleByHeight)));
          setScale(Number(fitScale.toFixed(2)));
        } else {
          const fitScale = Math.min(1.4, Math.max(0.65, availableHeight / rawViewport.height));
          setScale(Number(fitScale.toFixed(2)));
        }
      } catch (e) {
        console.debug('Failed to auto-fit PDF scale:', e);
      }
    },
    []
  );

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

        // Adjust scale
        try {
          const firstPage = await doc.getPage(1);
          const rawViewport = firstPage.getViewport({ scale: 1.0 });
          const availableHeight = Math.max(450, window.innerHeight - 150);
          const availableWidth = Math.max(600, window.innerWidth - 120);

          if (settings.twoPageSpread) {
            const scaleByWidth = availableWidth / 2 / rawViewport.width;
            const scaleByHeight = availableHeight / rawViewport.height;
            const fitScale = Math.min(1.15, Math.max(0.42, Math.min(scaleByWidth, scaleByHeight)));
            setScale(Number(fitScale.toFixed(2)));
          } else {
            const fitScale = Math.min(1.4, Math.max(0.65, availableHeight / rawViewport.height));
            setScale(Number(fitScale.toFixed(2)));
          }
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
      if (leftRenderTaskRef.current) {
        try {
          leftRenderTaskRef.current.cancel();
        } catch (e) {
          console.debug(e);
        }
      }
      if (rightRenderTaskRef.current) {
        try {
          rightRenderTaskRef.current.cancel();
        } catch (e) {
          console.debug(e);
        }
      }
    };
  }, [book, setStoreTotalPages, settings.twoPageSpread]);

  // Handle responsive resize scale re-calculation on spread change
  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      adjustScaleToFit(settings.twoPageSpread);
    }
  }, [settings.twoPageSpread, isLoading, adjustScaleToFit]);

  // Render a single PDF page into a designated canvas
  const renderPageToCanvas = useCallback(
    async (
      pageNum: number,
      canvas: HTMLCanvasElement | null,
      taskRef: React.MutableRefObject<any>
    ) => {
      if (!pdfDocRef.current || !canvas) return;

      if (taskRef.current) {
        try {
          taskRef.current.cancel();
        } catch (e) {
          console.debug(e);
        }
        taskRef.current = null;
      }

      try {
        const page = await pdfDocRef.current.getPage(pageNum);
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
        taskRef.current = task;
        await task.promise;
        taskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`PDF Page ${pageNum} render error:`, err);
        }
      }
    },
    [scale]
  );

  // Render trigger on page change or spread change
  useEffect(() => {
    if (!isLoading && pdfDocRef.current) {
      if (isTwoPage) {
        renderPageToCanvas(leftPage, leftCanvasRef.current, leftRenderTaskRef);
        if (rightPage) {
          renderPageToCanvas(rightPage, rightCanvasRef.current, rightRenderTaskRef);
        }
      } else {
        renderPageToCanvas(currentPage, leftCanvasRef.current, leftRenderTaskRef);
      }
    }
  }, [currentPage, leftPage, rightPage, isTwoPage, isLoading, renderPageToCanvas]);

  // Store and Progress Syncing
  useEffect(() => {
    if (isLoading) return;

    setStoreCurrentPage(currentPage);
    setJumpInput(String(currentPage));

    if (onPageChangeRef.current) {
      onPageChangeRef.current(currentPage, totalPages);
    }

    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
    updateBookProgress(book.id, progress, currentPage);
  }, [currentPage, totalPages, isLoading, book.id, setStoreCurrentPage]);

  // Rapid Paging without blocking (Instant response)
  const goToPage = useCallback(
    (newPage: number, direction: 'next' | 'prev') => {
      const validPage = Math.max(1, Math.min(totalPages, newPage));
      if (validPage === currentPage && newPage !== currentPage) return;

      if (settings.soundEffects) {
        playPageTurnSound();
      }

      // Immediately change state to allow rapid clicking
      setCurrentPage(validPage);
      setSlideDirection(direction);
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 120);
    },
    [totalPages, currentPage, settings.soundEffects]
  );

  const handleNextPage = useCallback(() => {
    if (isTwoPage) {
      const nextTarget = leftPage + 2;
      if (nextTarget <= totalPages || rightPage !== null) {
        goToPage(Math.min(totalPages, nextTarget), 'next');
      }
    } else {
      goToPage(currentPage + 1, 'next');
    }
  }, [isTwoPage, leftPage, rightPage, totalPages, currentPage, goToPage]);

  const handlePrevPage = useCallback(() => {
    if (isTwoPage) {
      const prevTarget = Math.max(1, leftPage - 2);
      goToPage(prevTarget, 'prev');
    } else {
      goToPage(currentPage - 1, 'prev');
    }
  }, [isTwoPage, leftPage, currentPage, goToPage]);

  // Jump to specific page handler
  const handleExecuteJump = (targetPageNum: number) => {
    const validTarget = Math.max(1, Math.min(totalPages, targetPageNum));
    const dir = validTarget >= currentPage ? 'next' : 'prev';
    goToPage(validTarget, dir);
    setIsJumpOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isJumpOpen) {
        if (e.key === 'Escape') setIsJumpOpen(false);
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Escape' && settings.zenMode) {
        toggleZenMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage, isJumpOpen, settings.zenMode, toggleZenMode]);

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

  const isPrevDisabled = isTwoPage ? leftPage <= 1 : currentPage <= 1;
  const isNextDisabled = isTwoPage
    ? rightPage ? rightPage >= totalPages : leftPage >= totalPages
    : currentPage >= totalPages;

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

      {/* Floating Exit Zen Mode Button if in Zen Mode */}
      {settings.zenMode && (
        <button
          onClick={toggleZenMode}
          title="Keluar dari Zen Mode (Esc)"
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md opacity-40 hover:opacity-100"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Keluar Zen Mode</span>
        </button>
      )}

      {/* Loading Skeleton */}
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
          isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'
        }`}
      >
        {/* Previous Page Button - Rapid Clicking Enabled */}
        <button
          onClick={handlePrevPage}
          disabled={isPrevDisabled}
          aria-label="Halaman Sebelumnya"
          className="hidden md:flex absolute left-[-64px] top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl items-center justify-center border shadow-lg transition-all active:scale-90 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* BOOK CONTAINER */}
        {!isTwoPage ? (
          /* SINGLE PAGE VIEW */
          <div className="relative">
            {/* Stacked Pages Edge Depth on the right */}
            <div
              className="absolute -right-2 top-1.5 bottom-1.5 w-2 rounded-r-sm pointer-events-none transition-colors"
              style={{
                backgroundColor: settings.theme === 'dark' ? '#27272A' : '#EFECE4',
                boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.15)',
              }}
            />

            {/* Book Paper with Smooth Transition */}
            <div
              style={{
                transform: isAnimating
                  ? slideDirection === 'next'
                    ? 'translateX(-12px)'
                    : 'translateX(12px)'
                  : 'translateX(0)',
                transition: isAnimating ? 'transform 0.08s ease-out' : 'transform 0.12s ease-out',
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
                ref={leftCanvasRef}
                className="block max-w-full max-h-[calc(100vh-140px)] w-auto h-auto cursor-pointer"
                onClick={handleNextPage}
              />
            </div>
          </div>
        ) : (
          /* TWO-PAGE SPREAD VIEW (DUAL PAGE / OPEN BOOK) */
          <div
            className="relative flex items-center shadow-2xl rounded-lg"
            style={{
              transform: isAnimating
                ? slideDirection === 'next'
                  ? 'translateX(-14px)'
                  : 'translateX(14px)'
                : 'translateX(0)',
              transition: isAnimating ? 'transform 0.08s ease-out' : 'transform 0.12s ease-out',
              filter: getThemeFilter(),
              boxShadow: getPageBoxShadow(),
            }}
          >
            {/* Left stacked pages depth */}
            <div
              className="absolute -left-2 top-1.5 bottom-1.5 w-2 rounded-l-xs pointer-events-none transition-colors"
              style={{
                backgroundColor: settings.theme === 'dark' ? '#27272A' : '#EFECE4',
                boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.15)',
              }}
            />

            {/* LEFT PAGE */}
            <div className="relative rounded-l-md overflow-hidden border-y border-l border-black/10 dark:border-white/10 bg-white">
              {/* Left page inner spine shadow (right side of left page) */}
              <div className="absolute inset-y-0 right-0 w-8 pointer-events-none bg-gradient-to-l from-black/20 via-black/5 to-transparent z-10" />

              <canvas
                ref={leftCanvasRef}
                className="block max-w-full max-h-[calc(100vh-140px)] w-auto h-auto cursor-pointer"
                onClick={handlePrevPage}
              />

              {/* Subtle page number stamp at bottom of left page */}
              <div className="absolute bottom-2 left-4 text-[10px] font-mono text-black/40 pointer-events-none select-none">
                {leftPage}
              </div>
            </div>

            {/* CENTER BOOK CREASE / SPINE BINDING */}
            <div className="w-[3px] self-stretch bg-neutral-300 dark:bg-neutral-800 shadow-inner z-20 relative flex items-center justify-center">
              <div className="w-[1px] h-full bg-black/25 dark:bg-black/60" />
            </div>

            {/* RIGHT PAGE */}
            <div className="relative rounded-r-md overflow-hidden border-y border-r border-black/10 dark:border-white/10 bg-white min-w-[200px] flex items-center justify-center">
              {/* Ribbon Bookmark Accent (Top Right) */}
              <div
                className="absolute top-0 right-8 w-3.5 h-7 z-20 pointer-events-none shadow-sm rounded-b-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                }}
              />

              {/* Right page inner spine shadow (left side of right page) */}
              <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-black/20 via-black/5 to-transparent z-10" />

              {rightPage ? (
                <>
                  <canvas
                    ref={rightCanvasRef}
                    className="block max-w-full max-h-[calc(100vh-140px)] w-auto h-auto cursor-pointer"
                    onClick={handleNextPage}
                  />
                  {/* Subtle page number stamp at bottom of right page */}
                  <div className="absolute bottom-2 right-4 text-[10px] font-mono text-black/40 pointer-events-none select-none">
                    {rightPage}
                  </div>
                </>
              ) : (
                /* Endpaper for uneven total pages */
                <div
                  className="w-full h-full min-h-[380px] flex flex-col items-center justify-center p-8 text-neutral-400 select-none bg-stone-50/50"
                  style={{
                    minWidth: leftCanvasRef.current ? `${leftCanvasRef.current.style.width}` : '300px',
                    minHeight: leftCanvasRef.current ? `${leftCanvasRef.current.style.height}` : '380px',
                  }}
                >
                  <div className="text-xs uppercase tracking-widest font-semibold opacity-40">
                    Akhir Buku
                  </div>
                </div>
              )}
            </div>

            {/* Right stacked pages depth */}
            <div
              className="absolute -right-2 top-1.5 bottom-1.5 w-2 rounded-r-xs pointer-events-none transition-colors"
              style={{
                backgroundColor: settings.theme === 'dark' ? '#27272A' : '#EFECE4',
                boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.15)',
              }}
            />
          </div>
        )}

        {/* Next Page Button - Rapid Clicking Enabled */}
        <button
          onClick={handleNextPage}
          disabled={isNextDisabled}
          aria-label="Halaman Selanjutnya"
          className="hidden md:flex absolute right-[-64px] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-2xl items-center justify-center border shadow-lg transition-all active:scale-90 disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Bottom Control Capsule - Hides smoothly in Zen Mode */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 ${
          isControlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          onClick={handlePrevPage}
          disabled={isPrevDisabled}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 active:scale-90"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Interactive Page Indicator: Click to Jump! */}
        <button
          onClick={() => {
            setJumpInput(String(currentPage));
            setIsJumpOpen(true);
          }}
          title="Klik untuk Melompat ke Halaman Tertentu"
          className="text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 min-w-[75px] text-center tracking-tight transition-all"
          style={{ color: 'var(--text-primary)' }}
        >
          {isTwoPage && rightPage
            ? `${leftPage}-${rightPage} / ${totalPages}`
            : `${currentPage} / ${totalPages}`}
        </button>

        <button
          onClick={handleNextPage}
          disabled={isNextDisabled}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 active:scale-90"
          title="Halaman Selanjutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Two-Page Spread Quick Toggle */}
        <button
          onClick={() => {
            toggleTwoPageSpread();
            goeyToast.info(
              !settings.twoPageSpread ? 'Mode 2 Halaman (Buku Terbuka)' : 'Mode 1 Halaman',
              { duration: 2000 }
            );
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border transition-all ${
            settings.twoPageSpread
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
          }`}
          title={
            settings.twoPageSpread
              ? 'Ganti ke Mode 1 Halaman'
              : 'Ganti ke Mode 2 Halaman (Buku Terbuka)'
          }
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">
            {settings.twoPageSpread ? '2 Hal' : '1 Hal'}
          </span>
        </button>

        <div className="h-4 w-[1px] mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />

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
            <div className="h-4 w-[1px] mx-0.5" style={{ backgroundColor: 'var(--border-color)' }} />
          </>
        )}

        <button
          onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Perkecil"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={() => adjustScaleToFit(settings.twoPageSpread)}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Pas ke Layar"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setScale((s) => Math.min(2.2, Number((s + 0.1).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          title="Perbesar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* JUMP TO PAGE MODAL / SCRUBBER POPOVER */}
      {isJumpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsJumpOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-bold">Lompat ke Halaman</h3>
              </div>
              <button
                onClick={() => setIsJumpOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Number Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const pageNum = parseInt(jumpInput, 10);
                if (!isNaN(pageNum)) {
                  handleExecuteJump(pageNum);
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpInput}
                autoFocus
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={`1 - ${totalPages}`}
                className="flex-1 px-3.5 py-2 rounded-xl border text-base font-bold focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Buka
              </button>
            </form>

            {/* Quick Interactive Slider Scrubber */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                <span>Hal 1</span>
                <span className="font-bold" style={{ color: 'var(--accent)' }}>
                  {Math.round(((parseInt(jumpInput, 10) || currentPage) / totalPages) * 100)}%
                </span>
                <span>Hal {totalPages}</span>
              </div>
              <input
                type="range"
                min={1}
                max={totalPages}
                value={parseInt(jumpInput, 10) || currentPage}
                onChange={(e) => setJumpInput(e.target.value)}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Quick Jump Shortcuts */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => handleExecuteJump(1)}
                className="p-2 rounded-lg border text-[11px] font-bold hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Halaman 1
              </button>
              <button
                onClick={() => handleExecuteJump(Math.round(totalPages / 2))}
                className="p-2 rounded-lg border text-[11px] font-bold hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Tengah ({Math.round(totalPages / 2)})
              </button>
              <button
                onClick={() => handleExecuteJump(totalPages)}
                className="p-2 rounded-lg border text-[11px] font-bold hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Akhir ({totalPages})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
