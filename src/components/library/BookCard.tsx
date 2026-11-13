'use client';

import React, { useState } from 'react';
import type { Book } from '@/types/book';
import { BookOpen, MoreVertical, Trash2, RotateCcw, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

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
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isCompleted = book.readingProgress >= 100;

  return (
    <div className="group relative flex flex-col items-center">
      {/* 3D Book Container with Spine and Layered Depth */}
      <div
        onClick={() => onOpen(book)}
        className="relative w-44 sm:w-48 h-64 sm:h-72 cursor-pointer transition-all duration-300 transform group-hover:-translate-y-2 group-hover:shadow-2xl"
        style={{ perspective: '1000px' }}
      >
        {/* Layered Pages depth effect behind the book */}
        <div className="absolute right-0 top-1 bottom-1 w-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-r-sm shadow-inner pointer-events-none" />

        {/* Main Book Cover */}
        <div className="relative w-full h-full rounded-l-sm rounded-r-md overflow-hidden shadow-lg bg-zinc-800 border-l-4 border-l-black/30 flex flex-col justify-between">
          {/* Book Spine shadow line on left */}
          <div className="absolute inset-y-0 left-0 w-3.5 z-20 pointer-events-none bg-gradient-to-r from-black/40 via-white/10 to-transparent" />

          {/* Cover image or procedural fallback */}
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">
                {book.format}
              </span>
              <p className="font-serif text-lg font-bold text-white line-clamp-3">
                {book.title}
              </p>
              <p className="text-xs text-zinc-400">{book.author}</p>
            </div>
          )}

          {/* Format Badge Top-Right */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm ${
                book.format === 'pdf'
                  ? 'bg-red-500/80 text-white'
                  : 'bg-emerald-500/80 text-white'
              }`}
            >
              {book.format}
            </span>
          </div>

          {/* Quick Open Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 z-20">
            <div className="w-12 h-12 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">
              {book.readingProgress > 0 ? 'Lanjutkan Membaca' : 'Mulai Membaca'}
            </span>
          </div>

          {/* Bottom Progress bar strip */}
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/40 z-20">
            <div
              className={`h-full transition-all duration-300 ${
                isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, book.readingProgress))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Book Information & Metadata */}
      <div className="w-44 sm:w-48 mt-3 flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0" onClick={() => onOpen(book)}>
          <h3
            className="text-sm font-semibold truncate leading-tight hover:text-amber-600 transition-colors cursor-pointer"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {book.author}
          </p>

          {/* Progress / Status */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-zinc-400">
            {isCompleted ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
              </span>
            ) : book.readingProgress > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {book.readingProgress}% dibaca
              </span>
            ) : (
              <span>Belum dibaca</span>
            )}
            <span>•</span>
            <span>{formatFileSize(book.fileSize)}</span>
          </div>
        </div>

        {/* Options Menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Opsi Buku"
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              {/* Backdrop closer */}
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />

              {/* Menu dropdown */}
              <div
                className="absolute right-0 bottom-full mb-1 z-40 w-44 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 shadow-xl py-1 text-xs"
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
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Progres
                </button>

                <div className="my-1 border-t border-black/5 dark:border-white/5" />

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
