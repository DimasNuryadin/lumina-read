'use client';

import React, { useState } from 'react';
import type { Book } from '@/types/book';
import { BookOpen, MoreVertical, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onDelete: (id: string) => void;
  onResetProgress: (id: string) => void;
}

export default function BookCard({ book, onOpen, onDelete, onResetProgress }: BookCardProps) {
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isCompleted = book.readingProgress >= 100;

  return (
    <div className="group relative flex flex-col items-center w-full max-w-[200px]">
      {/* 3D Book Container with Spine and Layered Depth */}
      <div
        onClick={() => onOpen(book)}
        className="relative w-40 sm:w-44 h-56 sm:h-64 cursor-pointer transition-all duration-300 transform group-hover:-translate-y-2"
        style={{
          perspective: '1000px',
        }}
      >
        {/* Layered Book Pages depth on the right */}
        <div
          className="absolute right-0 top-1 bottom-1 w-2.5 rounded-r-sm shadow-inner pointer-events-none"
          style={{
            backgroundColor: 'var(--border-color)',
            boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.15)',
          }}
        />

        {/* Main Book Cover */}
        <div
          className="relative w-full h-full rounded-l-sm rounded-r-md overflow-hidden border-l-4 border-l-black/30 flex flex-col justify-between transition-shadow duration-300"
          style={{
            backgroundColor: 'var(--bg-surface)',
            boxShadow: 'var(--book-shadow)',
          }}
        >
          {/* Authentic Book Spine crease shadow */}
          <div className="absolute inset-y-0 left-0 w-4 z-20 pointer-events-none bg-gradient-to-r from-black/45 via-white/10 to-transparent" />

          {/* Cover image or procedural fallback */}
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-950 p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                {book.format}
              </span>
              <p className="font-editorial text-base font-bold text-white line-clamp-3">
                {book.title}
              </p>
              <p className="text-xs text-stone-300 truncate">{book.author}</p>
            </div>
          )}

          {/* Format Badge Top-Right */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm text-white ${
                book.format === 'pdf' ? 'bg-red-600/90' : 'bg-emerald-700/90'
              }`}
            >
              {book.format}
            </span>
          </div>

          {/* Quick Open Action Overlay on Hover */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 z-20">
            <div className="w-11 h-11 rounded-full bg-white text-stone-900 flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">
              {book.readingProgress > 0 ? 'Lanjutkan Baca' : 'Mulai Membaca'}
            </span>
          </div>

          {/* Bottom Progress Bar Strip */}
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/30 z-20">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted ? 'bg-emerald-500' : 'bg-amber-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, book.readingProgress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Book Metadata & Title - High Contrast guaranteed */}
      <div className="w-full mt-3 flex items-start justify-between gap-1 px-1">
        <div className="flex-1 min-w-0" onClick={() => onOpen(book)}>
          <h3
            className="text-sm font-semibold truncate leading-tight hover:underline cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            title={book.title}
          >
            {book.title}
          </h3>

          <p
            className="text-xs truncate mt-0.5 font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {book.author}
          </p>

          {/* Progress / Status Indicators */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {isCompleted ? (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
              </span>
            ) : book.readingProgress > 0 ? (
              <span className="font-semibold text-amber-700 dark:text-amber-400">
                {book.readingProgress}%
              </span>
            ) : (
              <span>Baru</span>
            )}
            <span>•</span>
            <span>{formatFileSize(book.fileSize)}</span>
          </div>
        </div>

        {/* Options Menu Button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Opsi Buku"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />

              {/* Dropdown Menu */}
              <div
                className="absolute right-0 bottom-full mb-1 z-40 w-44 rounded-xl border shadow-xl py-1 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpen(book);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Buka Buku
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onResetProgress(book.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Progres
                </button>

                <div className="my-1 border-t" style={{ borderColor: 'var(--border-subtle)' }} />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(book.id);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-600 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus dari Rak
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
