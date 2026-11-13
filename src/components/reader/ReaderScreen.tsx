'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Book, TableOfContentsItem } from '@/types/book';
import { useReaderStore } from '@/lib/store/useReaderStore';
import ReaderToolbar from './ReaderToolbar';
import confetti from 'canvas-confetti';

const PdfReader = dynamic(() => import('./PdfReader'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div
        className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Menyiapkan dokumen PDF...
      </p>
    </div>
  ),
});

const EpubReader = dynamic(() => import('./EpubReader'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div
        className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Menyiapkan e-book EPUB...
      </p>
    </div>
  ),
});

interface ReaderScreenProps {
  book: Book;
  onBackToLibrary: () => void;
}

export default function ReaderScreen({ book, onBackToLibrary }: ReaderScreenProps) {
  const { settings } = useReaderStore();
  const [toc, setToc] = useState<TableOfContentsItem[]>([]);
  const [hasCelebrated, setHasCelebrated] = useState<boolean>(false);

  const handleProgressUpdate = useCallback((current: number, total: number) => {
    if (total > 0 && current >= total && !hasCelebrated) {
      setHasCelebrated(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  }, [hasCelebrated]);

  return (
    <div
      data-theme={settings.theme}
      className="min-h-screen w-full transition-colors duration-200 relative"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
    >
      <ReaderToolbar book={book} onBackToLibrary={onBackToLibrary} toc={toc} />

      <main className="pt-16 pb-8 px-2 sm:px-4 flex flex-col items-center justify-center min-h-screen">
        {book.format === 'pdf' ? (
          <PdfReader book={book} onPageChange={handleProgressUpdate} />
        ) : (
          <EpubReader
            book={book}
            onTocLoaded={setToc}
            onLocationChange={(progress) => {
              if (progress >= 99 && !hasCelebrated) {
                setHasCelebrated(true);
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.8 },
                });
              }
            }}
          />
        )}
      </main>
    </div>
  );
}
