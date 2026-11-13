'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { Book } from '@/types/book';
import { getAllBooks } from '@/lib/db';
import Bookshelf from '@/components/library/Bookshelf';
import ReaderScreen from '@/components/reader/ReaderScreen';

export default function Home() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load books from IndexedDB
  const refreshBooks = useCallback(async () => {
    try {
      const list = await getAllBooks();
      setBooks(list);
    } catch (err) {
      console.error('Failed to load books from DB:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBooks();
  }, [refreshBooks]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider uppercase opacity-60">
          Memuat LuminaRead Library...
        </p>
      </div>
    );
  }

  if (activeBook) {
    return (
      <ReaderScreen
        book={activeBook}
        onBackToLibrary={() => {
          setActiveBook(null);
          refreshBooks();
        }}
      />
    );
  }

  return (
    <Bookshelf
      books={books}
      onOpenBook={(book) => setActiveBook(book)}
      onRefreshBooks={refreshBooks}
    />
  );
}
