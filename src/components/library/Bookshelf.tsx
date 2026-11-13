'use client';

import React, { useState, useMemo } from 'react';
import type { Book } from '@/types/book';
import BookCard from './BookCard';
import DropzoneUploader from './DropzoneUploader';
import { createDemoBook } from '@/lib/demo/sampleBook';
import { saveBook, deleteBook, updateBookProgress } from '@/lib/db';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { goeyToast } from 'goey-toast';
import {
  BookOpen,
  Search,
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
    goeyToast.success('Buku demo berhasil ditambahkan!', {
      description: 'Panduan Membaca LuminaRead telah ada di rak buku Anda.',
      showProgress: true,
    });
  };

  // Delete Book handler with Goey Toast action confirmation
  const handleDeleteBook = (id: string, title: string) => {
    goeyToast.warning(`Hapus "${title}" dari rak?`, {
      description: 'File buku dan posisi bacaan akan dihapus dari penyimpanan lokal.',
      showProgress: true,
      action: {
        label: 'Hapus Sekarang',
        onClick: async () => {
          await deleteBook(id);
          onRefreshBooks();
          goeyToast.success(`"${title}" berhasil dihapus.`);
        },
      },
    });
  };

  // Reset Progress handler with Goey Toast feedback
  const handleResetProgress = async (id: string, title: string) => {
    await updateBookProgress(id, 0, 1);
    onRefreshBooks();
    goeyToast.info(`Progres dibatalkan`, {
      description: `Buku "${title}" direset kembali ke halaman pertama.`,
      showProgress: true,
    });
  };

  return (
    <div
      data-theme={settings.theme}
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Editorial Navigation Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md border-b transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Catalog Title */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
              }}
            >
              <Library className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-editorial text-xl font-bold tracking-tight">LuminaRead</span>
                <span
                  className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  Offline Library
                </span>
              </div>
            </div>
          </div>

          {/* Quick Theme Switcher & Demo Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleLoadDemo()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-text)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buku Demo</span>
            </button>

            {/* Segmented Theme Switcher */}
            <div
              className="flex items-center p-1 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-color)',
              }}
            >
              <button
                onClick={() => setTheme('light')}
                title="Pristine Light"
                className={`p-1.5 rounded-lg transition-all ${
                  settings.theme === 'light' ? 'bg-white shadow-xs text-amber-600' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('sepia')}
                title="Warm Parchment (Sepia)"
                className={`p-1.5 rounded-lg transition-all ${
                  settings.theme === 'sepia' ? 'bg-[#EFE6D0] shadow-xs text-amber-900 font-bold' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                title="Midnight Dark"
                className={`p-1.5 rounded-lg transition-all ${
                  settings.theme === 'dark' ? 'bg-stone-800 shadow-xs text-amber-400' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Curated Stats Bar */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="p-5 rounded-2xl border shadow-xs flex items-center gap-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent)',
              }}
            >
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Total Koleksi
              </p>
              <p className="text-2xl font-editorial font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {totalBooks} <span className="text-sm font-sans font-normal opacity-70">Buku</span>
              </p>
            </div>
          </div>

          <div
            className="p-5 rounded-2xl border shadow-xs flex items-center gap-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400"
              style={{
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Sedang Dibaca
              </p>
              <p className="text-2xl font-editorial font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {readingBooks} <span className="text-sm font-sans font-normal opacity-70">Buku</span>
              </p>
            </div>
          </div>

          <div
            className="p-5 rounded-2xl border shadow-xs flex items-center gap-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400"
              style={{
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Tamat Dibaca
              </p>
              <p className="text-2xl font-editorial font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {completedBooks} <span className="text-sm font-sans font-normal opacity-70">Buku</span>
              </p>
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

        {/* Filter & Search Bar */}
        <section
          className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-6 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul buku atau nama penulis..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none transition-all"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
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
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor:
                    selectedFilter === f.id ? 'var(--accent)' : 'var(--bg-subtle)',
                  color: selectedFilter === f.id ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor:
                    selectedFilter === f.id ? 'var(--accent)' : 'var(--border-color)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
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
                  onDelete={(id) => handleDeleteBook(id, book.title)}
                  onResetProgress={(id) => handleResetProgress(id, book.title)}
                />
              ))}
            </div>
          ) : (
            <div
              className="py-24 rounded-3xl border flex flex-col items-center justify-center text-center gap-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--accent)',
                }}
              >
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="font-editorial text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Belum Ada Buku di Rak Ini
              </h3>
              <p className="text-xs max-w-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Unggah file PDF atau EPUB Anda di atas, atau coba buku panduan demo untuk menikmati pengalaman membaca 3D.
              </p>
              <button
                onClick={() => handleLoadDemo()}
                className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--accent)',
                }}
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
