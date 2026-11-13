'use client';

import React, { useState, useEffect } from 'react';
import type { Book, Bookmark, TableOfContentsItem } from '@/types/book';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { addBookmark, getBookmarksByBookId, removeBookmark } from '@/lib/db';
import {
  ArrowLeft,
  Settings,
  Bookmark as BookmarkIcon,
  List,
  Sun,
  Moon,
  Coffee,
  Volume2,
  VolumeX,
  Type,
  Minimize2,
  Maximize2,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';

interface ReaderToolbarProps {
  book: Book;
  onBackToLibrary: () => void;
  toc?: TableOfContentsItem[];
  onSelectTocItem?: (href: string) => void;
}

export default function ReaderToolbar({
  book,
  onBackToLibrary,
  toc = [],
  onSelectTocItem,
}: ReaderToolbarProps) {
  const {
    settings,
    setTheme,
    setFontSize,
    setFontFamily,
    setPageTurnAnimation,
    toggleSoundEffects,
    toggleZenMode,
    currentPage,
    totalPages,
    isSidebarOpen,
    setSidebarOpen,
    activeSidebarTab,
    setActiveSidebarTab,
  } = useReaderStore();

  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarkedCurrent, setIsBookmarkedCurrent] = useState<boolean>(false);

  // Load Bookmarks for current book
  const refreshBookmarks = React.useCallback(async () => {
    const list = await getBookmarksByBookId(book.id);
    setBookmarks(list);
  }, [book.id]);

  useEffect(() => {
    refreshBookmarks();
  }, [refreshBookmarks]);

  // Check if current location is bookmarked
  useEffect(() => {
    const isSaved = bookmarks.some((b) => b.location === currentPage);
    setIsBookmarkedCurrent(isSaved);
  }, [bookmarks, currentPage]);

  // Handle Add / Remove Bookmark
  const handleToggleBookmark = async () => {
    const existing = bookmarks.find((b) => b.location === currentPage);
    if (existing) {
      await removeBookmark(existing.id);
    } else {
      const newBookmark: Bookmark = {
        id: 'bm-' + Date.now(),
        bookId: book.id,
        location: currentPage,
        title: `Halaman ${currentPage}`,
        createdAt: Date.now(),
      };
      await addBookmark(newBookmark);
    }
    refreshBookmarks();
  };

  // Zen Mode Auto-Hide logic on idle
  useEffect(() => {
    if (!settings.zenMode) {
      setIsControlsVisible(true);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const handleActivity = () => {
      setIsControlsVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3500);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    timeoutId = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3500);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [settings.zenMode]);

  return (
    <>
      {/* Top Floating Glass Navigation Header */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          isControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLibrary}
              aria-label="Kembali ke Rak Buku"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-sm hover:scale-105 active:scale-95 transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Perpustakaan</span>
            </button>

            <div className="flex flex-col max-w-[200px] sm:max-w-md truncate">
              <span className="text-sm font-semibold truncate tracking-tight">{book.title}</span>
              <span className="text-xs opacity-60 truncate">{book.author}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-sm">
            {/* Table of contents button */}
            <button
              onClick={() => {
                setActiveSidebarTab('toc');
                setSidebarOpen(true);
              }}
              title="Daftar Isi"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Bookmark button */}
            <button
              onClick={handleToggleBookmark}
              title={isBookmarkedCurrent ? 'Hapus Bookmark' : 'Tambah Bookmark'}
              className={`p-2 rounded-full transition-colors ${
                isBookmarkedCurrent
                  ? 'text-amber-500 fill-amber-500 bg-amber-500/10'
                  : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <BookmarkIcon className={`w-4 h-4 ${isBookmarkedCurrent ? 'fill-current' : ''}`} />
            </button>

            {/* Bookmark list drawer */}
            <button
              onClick={() => {
                setActiveSidebarTab('bookmarks');
                setSidebarOpen(true);
              }}
              title="Daftar Bookmark"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-semibold"
            >
              <span className="text-[11px] px-1 bg-black/10 dark:bg-white/10 rounded-full">{bookmarks.length}</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => {
                setActiveSidebarTab('settings');
                setSidebarOpen(true);
              }}
              title="Pengaturan Tampilan"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Zen Mode Toggle */}
            <button
              onClick={toggleZenMode}
              title={settings.zenMode ? 'Keluar dari Zen Mode' : 'Aktifkan Zen Mode (Bebas Distraksi)'}
              className={`p-2 rounded-full transition-colors ${
                settings.zenMode ? 'text-amber-500 bg-amber-500/15' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {settings.zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer for TOC, Bookmarks, and Settings */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm sm:max-w-md h-full bg-white dark:bg-zinc-900 border-l border-black/10 dark:border-white/10 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSidebarTab('toc')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSidebarTab === 'toc'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                  }`}
                >
                  Daftar Isi
                </button>
                <button
                  onClick={() => setActiveSidebarTab('bookmarks')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSidebarTab === 'bookmarks'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                  }`}
                >
                  Bookmark ({bookmarks.length})
                </button>
                <button
                  onClick={() => setActiveSidebarTab('settings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeSidebarTab === 'settings'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70'
                  }`}
                >
                  Pengaturan
                </button>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* TAB 1: Table of Contents */}
              {activeSidebarTab === 'toc' && (
                <div className="space-y-1">
                  {toc.length > 0 ? (
                    toc.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (onSelectTocItem) onSelectTocItem(item.href);
                          setSidebarOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-colors line-clamp-2"
                      >
                        {item.label}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-16 opacity-60 text-sm">
                      Daftar isi tidak tersedia pada dokumen ini.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Bookmarks */}
              {activeSidebarTab === 'bookmarks' && (
                <div className="space-y-2">
                  {bookmarks.length > 0 ? (
                    bookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold">{bm.title}</p>
                          <p className="text-xs opacity-60">
                            {new Date(bm.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            await removeBookmark(bm.id);
                            refreshBookmarks();
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                          title="Hapus bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 opacity-60 text-sm space-y-2">
                      <BookmarkIcon className="w-8 h-8 mx-auto opacity-40" />
                      <p>Belum ada bookmark yang disimpan.</p>
                      <p className="text-xs">Klik tombol bookmark di bilah atas untuk menandai halaman.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Visual & Reading Settings */}
              {activeSidebarTab === 'settings' && (
                <div className="space-y-6">
                  {/* Theme Mode Selector */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 block">
                      Tema Tampilan
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                          settings.theme === 'light'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                            : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Sun className="w-5 h-5 text-amber-500" />
                        Light
                      </button>

                      <button
                        onClick={() => setTheme('sepia')}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                          settings.theme === 'sepia'
                            ? 'border-amber-600 bg-amber-600/15 text-amber-800 dark:text-amber-300'
                            : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Coffee className="w-5 h-5 text-amber-700" />
                        Sepia Warm
                      </button>

                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                          settings.theme === 'dark'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <Moon className="w-5 h-5 text-indigo-400" />
                        Midnight
                      </button>
                    </div>
                  </div>

                  {/* Font Size Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold tracking-wider uppercase opacity-60">
                        Ukuran Teks
                      </label>
                      <span className="text-xs font-bold">{settings.fontSize}px</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setFontSize(Math.max(12, settings.fontSize - 2))}
                        className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 text-xs font-bold"
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min="12"
                        max="28"
                        value={settings.fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <button
                        onClick={() => setFontSize(Math.min(28, settings.fontSize + 2))}
                        className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 text-base font-bold"
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Font Family Selector */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 block">
                      Gaya Font
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setFontFamily('serif')}
                        className={`p-2.5 rounded-xl border text-xs font-serif font-medium transition-all ${
                          settings.fontFamily === 'serif'
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        Serif (Buku)
                      </button>
                      <button
                        onClick={() => setFontFamily('sans')}
                        className={`p-2.5 rounded-xl border text-xs font-sans font-medium transition-all ${
                          settings.fontFamily === 'sans'
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        Modern Sans
                      </button>
                      <button
                        onClick={() => setFontFamily('mono')}
                        className={`p-2.5 rounded-xl border text-xs font-mono font-medium transition-all ${
                          settings.fontFamily === 'mono'
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        Monospace
                      </button>
                    </div>
                  </div>

                  {/* Page Turn Animation Style */}
                  <div>
                    <label className="text-xs font-semibold tracking-wider uppercase opacity-60 mb-2 block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Efek Balik Halaman
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPageTurnAnimation('curl')}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          settings.pageTurnAnimation === 'curl'
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        3D Realistic
                      </button>
                      <button
                        onClick={() => setPageTurnAnimation('slide')}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          settings.pageTurnAnimation === 'slide'
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        Smooth Slide
                      </button>
                      <button
                        onClick={() => setPageTurnAnimation('none')}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          settings.pageTurnAnimation === 'none'
                            ? 'border-amber-500 bg-amber-500/10 font-bold'
                            : 'border-black/10 dark:border-white/10'
                        }`}
                      >
                        Instan
                      </button>
                    </div>
                  </div>

                  {/* Sound Effect Toggle */}
                  <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Efek Suara Kertas</p>
                      <p className="text-xs opacity-60">Suara lembut saat membalik halaman fisik</p>
                    </div>
                    <button
                      onClick={toggleSoundEffects}
                      className={`p-2.5 rounded-full border transition-all ${
                        settings.soundEffects
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : 'border-black/10 opacity-50'
                      }`}
                    >
                      {settings.soundEffects ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
