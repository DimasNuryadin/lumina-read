'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Book, TableOfContentsItem } from '@/types/book';
import { useReaderStore } from '@/lib/store/useReaderStore';
import ReaderToolbar from './ReaderToolbar';
import confetti from 'canvas-confetti';

// Dynamic client-side-only reader components
const PdfReader = dynamic(() => import('./PdfReader'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm opacity-60">Menyiapkan pembaca PDF...</p>
    </div>
  ),
});

const EpubReader = dynamic(() => import('./EpubReader'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm opacity-60">Menyiapkan pembaca EPUB...</p>
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

  // Trigger celebration confetti when book completed
  const handleProgressUpdate = (current: number, total: number) => {
    if (total > 0 && current >= total && !hasCelebrated) {
      setHasCelebrated(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  // Background style based on active theme
  const getThemeBackground = () => {
    switch (settings.theme) {
      case 'sepia':
        return 'bg-[#F7F2E4] text-[#3D2E1E]';
      case 'dark':
        return 'bg-[#0C0C0E] text-[#D4D4D8]';
      case 'light':
      default:
        return 'bg-[#FAFAFA] text-[#18181B]';
    }
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 relative ${getThemeBackground()}`}>
      {/* Top Floating Glass Toolbar */}
      <ReaderToolbar
        book={book}
        onBackToLibrary={onBackToLibrary}
        toc={toc}
      />

      {/* Main Reading Area */}
      <main className="pt-16 pb-8 px-2 sm:px-4 flex flex-col items-center justify-center min-h-screen">
        {book.format === 'pdf' ? (
          <PdfReader
            book={book}
            onPageChange={(page, total) => handleProgressUpdate(page, total)}
          />
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
