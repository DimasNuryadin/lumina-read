'use client';

import React, { useState, useMemo } from 'react';
import type { Book, ReaderTheme } from '@/types/book';
import BookCard from './BookCard';
import DropzoneUploader from './DropzoneUploader';
import { createDemoBook } from '@/lib/demo/sampleBook';
import { saveBook, deleteBook, updateBookProgress } from '@/lib/db';
import { useReaderStore } from '@/lib/store/useReaderStore';
import {
  BookOpen,
  Search,
  Filter,
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  Sun,
  Moon,
  Coffee,
  Library,
  SlidersHorizontal,
} from 'lucide-react';

interface BookshelfProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onRefreshBooks: () => void;
}

export default function Bookshelf({ books, onOpenBook, onRefreshBooks }: BookshelfProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pdf' | 'epub' | 'reading' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'lastRead' | 'title' | 'progress'>('lastRead');
  const [isAddingBook, setIsAddingBook] = useState<boolean>(false);

  const { settings, setTheme } = useReaderStore();

  // Statistics
  const totalBooks = books.length;
  const readingBooks = books.filter((b) => b.readingProgress > 0 && b.readingProgress < 100).length;
  const completedBooks = books.filter((b) => b.readingProgress >= 100).length;

  // Filtered and Sorted Books
  const filteredBooks = useMemo(() => {
    return books
      .filter((book) => {
        const matchesQuery =
          book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          book.author.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;

        if (selectedFilter === 'pdf') return book.format === 'pdf';
        if (selectedFilter === 'epub') return book.format === 'epub';
        if (selectedFilter === 'reading') return book.readingProgress > 0 && book.readingProgress < 100;
        if (selectedFilter === 'completed') return book.readingProgress >= 100;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'progress') {
          return b.readingProgress - a.readingProgress;
        }
        return b.lastReadAt - a.lastReadAt;
      });
  }, [books, searchQuery, selectedFilter, sortBy]);

  // Load Demo Book
  const handleLoadDemo = async () => {
    const demo = createDemoBook();
    await saveBook(demo);
    onRefreshBooks();
  };

  // Delete Book handler
  const handleDeleteBook = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus buku ini dari rak lokal Anda?')) {
      await deleteBook(id);
      onRefreshBooks();
    }
  };

  // Reset Progress handler
  const handleResetProgress = async (id: string) => {
    await updateBookProgress(id, 0, 1);
    onRefreshBooks();
  };

  // Theme styling background
  const getThemeClass = () => {
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
    <div className={`min-h-screen transition-colors duration-300 ${getThemeClass()}`}>
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center shadow-md">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">LuminaRead</h1>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-amber-600 dark:text-amber-400">
                Offline E-Book Reader
              </p>
            </div>
          </div>

          {/* Quick Global Theme Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLoadDemo()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 hover:border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Buku Demo
            </button>

            <div className="flex items-center gap-1 p-1 rounded-full bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <button
                onClick={() => setTheme('light')}
                title="Mode Terang"
                className={`p-1.5 rounded-full transition-colors ${
                  settings.theme === 'light' ? 'bg-white shadow text-amber-500' : 'opacity-60'
                }`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('sepia')}
                title="Mode Sepia (Hangat)"
                className={`p-1.5 rounded-full transition-colors ${
                  settings.theme === 'sepia' ? 'bg-[#f0e6ce] shadow text-amber-800' : 'opacity-60'
                }`}
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                title="Mode Gelap (Midnight)"
                className={`p-1.5 rounded-full transition-colors ${
                  settings.theme === 'dark' ? 'bg-zinc-800 shadow text-indigo-400' : 'opacity-60'
                }`}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Statistics Hero Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold opacity-60">Total Koleksi</p>
              <p className="text-2xl font-bold">{totalBooks} Buku</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold opacity-60">Sedang Dibaca</p>
              <p className="text-2xl font-bold">{readingBooks} Buku</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/60 dark:bg-zinc-900/40 border border-black/5 dark:border-white/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-semibold opacity-60">Tamat Dibaca</p>
              <p className="text-2xl font-bold">{completedBooks} Buku</p>
            </div>
          </div>
        </section>

        {/* Uploader Section */}
        <section>
          <DropzoneUploader
            onBookAdded={(newBook) => {
              onRefreshBooks();
              onOpenBook(newBook);
            }}
          />
        </section>

        {/* Controls Bar (Search, Filters, Sort) */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-4 border-t border-black/5 dark:border-white/10">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul buku atau nama penulis..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'reading', label: 'Sedang Dibaca' },
              { id: 'completed', label: 'Selesai' },
              { id: 'pdf', label: 'PDF' },
              { id: 'epub', label: 'EPUB' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedFilter === f.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 opacity-50 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/60 dark:bg-zinc-900/40 border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value="lastRead">Terakhir Dibaca</option>
              <option value="title">Judul (A-Z)</option>
              <option value="progress">Progres Terbanyak</option>
            </select>
          </div>
        </section>

        {/* Bookshelf Grid */}
        <section>
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8 justify-items-center">
              {filteredBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpen={onOpenBook}
                  onDelete={handleDeleteBook}
                  onResetProgress={handleResetProgress}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold">Belum Ada Buku di Rak Ini</h3>
              <p className="text-xs opacity-60 max-w-sm">
                Unggah file PDF atau EPUB Anda di atas, atau coba buku panduan demo untuk melihat fitur membaca.
              </p>
              <button
                onClick={() => handleLoadDemo()}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Coba Buku Demo Sekarang
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
