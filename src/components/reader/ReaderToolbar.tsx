'use client';

import React, { useState, useEffect } from 'react';
import type { Book, Bookmark, TableOfContentsItem } from '@/types/book';
import { useReaderStore } from '@/lib/store/useReaderStore';
import { addBookmark, getBookmarksByBookId, removeBookmark } from '@/lib/db';
import { goeyToast } from 'goey-toast';
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
  Minimize2,
  Maximize2,
  Trash2,
  X,
  Sparkles,
  Lamp,
  BookOpen,
  FileText,
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
    setPdfDarkModeStyle,
    toggleTwoPageSpread,
    setTwoPageSpread,
    toggleSoundEffects,
    toggleZenMode,
    isControlsVisible,
    setIsControlsVisible,
    currentPage,
    isSidebarOpen,
    setSidebarOpen,
    activeSidebarTab,
    setActiveSidebarTab,
  } = useReaderStore();

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

  // Check if current page is bookmarked
  useEffect(() => {
    const isSaved = bookmarks.some((b) => b.location === currentPage);
    setIsBookmarkedCurrent(isSaved);
  }, [bookmarks, currentPage]);

  // Handle Add / Remove Bookmark
  const handleToggleBookmark = async () => {
    const existing = bookmarks.find((b) => b.location === currentPage);
    if (existing) {
      await removeBookmark(existing.id);
      goeyToast.info('Bookmark Dihapus', {
        description: `Tanda halaman ${currentPage} telah dihapus.`,
      });
    } else {
      const newBookmark: Bookmark = {
        id: 'bm-' + Date.now(),
        bookId: book.id,
        location: currentPage,
        title: `Halaman ${currentPage}`,
        createdAt: Date.now(),
      };
      await addBookmark(newBookmark);
      goeyToast.success('Bookmark Ditambahkan!', {
        description: `Halaman ${currentPage} tersimpan di penanda buku.`,
        showProgress: true,
      });
    }
    refreshBookmarks();
  };

  const handleToggleZen = () => {
    if (!settings.zenMode) {
      toggleZenMode();
      goeyToast('Zen Mode Diaktifkan', {
        description: 'Layar bebas gangguan. Tekan Esc untuk keluar.',
        showProgress: true,
      });
      if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      toggleZenMode();
      goeyToast.info('Keluar dari Zen Mode');
      if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
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
      {/* Top Floating Navigation Header */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          isControlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Back button & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLibrary}
              aria-label="Kembali ke Rak Buku"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-sm transition-all active:scale-95 text-xs font-bold"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Perpustakaan</span>
            </button>

            <div className="flex flex-col max-w-[200px] sm:max-w-md truncate">
              <span
                className="text-sm font-editorial font-bold truncate leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {book.title}
              </span>
              <span
                className="text-xs truncate font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {book.author}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div
            className="flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 rounded-2xl border shadow-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Table of contents button */}
            <button
              onClick={() => {
                setActiveSidebarTab('toc');
                setSidebarOpen(true);
              }}
              title="Daftar Isi"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Bookmark button */}
            <button
              onClick={handleToggleBookmark}
              title={isBookmarkedCurrent ? 'Hapus Bookmark' : 'Tambah Bookmark'}
              className="p-2 rounded-xl transition-all"
              style={{
                color: isBookmarkedCurrent ? 'var(--accent)' : 'inherit',
                backgroundColor: isBookmarkedCurrent ? 'var(--accent-bg)' : 'transparent',
              }}
            >
              <BookmarkIcon className={`w-4 h-4 ${isBookmarkedCurrent ? 'fill-current' : ''}`} />
            </button>

            {/* Bookmark list badge button */}
            <button
              onClick={() => {
                setActiveSidebarTab('bookmarks');
                setSidebarOpen(true);
              }}
              title="Daftar Bookmark"
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-xs font-bold flex items-center gap-1"
            >
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                {bookmarks.length}
              </span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => {
                setActiveSidebarTab('settings');
                setSidebarOpen(true);
              }}
              title="Pengaturan Tampilan"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Zen Mode Toggle */}
            <button
              onClick={handleToggleZen}
              title={settings.zenMode ? 'Keluar dari Zen Mode' : 'Aktifkan Zen Mode (Bebas Distraksi)'}
              className="p-2 rounded-xl transition-all"
              style={{
                color: settings.zenMode ? 'var(--accent)' : 'inherit',
                backgroundColor: settings.zenMode ? 'var(--accent-bg)' : 'transparent',
              }}
            >
              {settings.zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Sidebar Drawer */}
      {isSidebarOpen && (
        <div
          data-theme={settings.theme}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="w-full max-w-sm sm:max-w-md h-full border-l p-6 flex flex-col shadow-2xl transition-all"
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <button
                  onClick={() => setActiveSidebarTab('toc')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: activeSidebarTab === 'toc' ? 'var(--accent)' : 'transparent',
                    color: activeSidebarTab === 'toc' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Daftar Isi
                </button>
                <button
                  onClick={() => setActiveSidebarTab('bookmarks')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: activeSidebarTab === 'bookmarks' ? 'var(--accent)' : 'transparent',
                    color: activeSidebarTab === 'bookmarks' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Bookmark ({bookmarks.length})
                </button>
                <button
                  onClick={() => setActiveSidebarTab('settings')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    backgroundColor: activeSidebarTab === 'settings' ? 'var(--accent)' : 'transparent',
                    color: activeSidebarTab === 'settings' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Pengaturan
                </button>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto py-5">
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
                        className="w-full text-left px-3.5 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-colors line-clamp-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.label}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-16 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
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
                        className="flex items-center justify-between p-3.5 rounded-xl border transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-color)',
                        }}
                      >
                        <div>
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {bm.title}
                          </p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors"
                          title="Hapus bookmark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
                      <BookmarkIcon className="w-8 h-8 mx-auto opacity-40" />
                      <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        Belum ada bookmark yang disimpan.
                      </p>
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
                    <label
                      className="text-xs font-bold tracking-wider uppercase mb-2.5 block"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Pilihan Tema Membaca
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setTheme('light')}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.theme === 'light' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.theme === 'light' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.theme === 'light' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        <Sun className="w-5 h-5 text-amber-600" />
                        Light
                      </button>

                      <button
                        onClick={() => setTheme('sepia')}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.theme === 'sepia' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.theme === 'sepia' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.theme === 'sepia' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        <Coffee className="w-5 h-5 text-amber-800" />
                        Sepia
                      </button>

                      <button
                        onClick={() => setTheme('dark')}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.theme === 'dark' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.theme === 'dark' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.theme === 'dark' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        <Moon className="w-5 h-5 text-indigo-400" />
                        Midnight
                      </button>
                    </div>
                  </div>

                  {/* Dark Mode Style for PDF documents */}
                  {settings.theme === 'dark' && book.format === 'pdf' && (
                    <div className="pt-1">
                      <label
                        className="text-xs font-bold tracking-wider uppercase mb-2 block"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Gaya Dark Mode (PDF)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPdfDarkModeStyle('ambient')}
                          className="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all"
                          style={{
                            backgroundColor:
                              settings.pdfDarkModeStyle === 'ambient'
                                ? 'var(--accent-bg)'
                                : 'var(--bg-subtle)',
                            borderColor:
                              settings.pdfDarkModeStyle === 'ambient'
                                ? 'var(--accent)'
                                : 'var(--border-color)',
                            color:
                              settings.pdfDarkModeStyle === 'ambient'
                                ? 'var(--accent-text)'
                                : 'var(--text-primary)',
                          }}
                        >
                          <Lamp className="w-4 h-4 text-amber-500" />
                          Lampu Meja
                        </button>

                        <button
                          onClick={() => setPdfDarkModeStyle('invert')}
                          className="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all"
                          style={{
                            backgroundColor:
                              settings.pdfDarkModeStyle === 'invert'
                                ? 'var(--accent-bg)'
                                : 'var(--bg-subtle)',
                            borderColor:
                              settings.pdfDarkModeStyle === 'invert'
                                ? 'var(--accent)'
                                : 'var(--border-color)',
                            color:
                              settings.pdfDarkModeStyle === 'invert'
                                ? 'var(--accent-text)'
                                : 'var(--text-primary)',
                          }}
                        >
                          <Moon className="w-4 h-4 text-indigo-400" />
                          Invert Halus
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Font Size Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        className="text-xs font-bold tracking-wider uppercase"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Ukuran Huruf
                      </label>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        {settings.fontSize}px
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setFontSize(Math.max(12, settings.fontSize - 2))}
                        className="px-3.5 py-1.5 rounded-lg border text-xs font-bold shadow-xs active:scale-95"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        A-
                      </button>
                      <input
                        type="range"
                        min="12"
                        max="28"
                        value={settings.fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                      <button
                        onClick={() => setFontSize(Math.min(28, settings.fontSize + 2))}
                        className="px-3.5 py-1.5 rounded-lg border text-base font-bold shadow-xs active:scale-95"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        A+
                      </button>
                    </div>
                  </div>

                  {/* Font Family Selector */}
                  <div>
                    <label
                      className="text-xs font-bold tracking-wider uppercase mb-2 block"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Keluarga Font
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setFontFamily('serif')}
                        className="p-2.5 rounded-xl border text-xs font-serif font-bold transition-all"
                        style={{
                          backgroundColor: settings.fontFamily === 'serif' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.fontFamily === 'serif' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.fontFamily === 'serif' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        Serif (Novel)
                      </button>
                      <button
                        onClick={() => setFontFamily('sans')}
                        className="p-2.5 rounded-xl border text-xs font-sans font-bold transition-all"
                        style={{
                          backgroundColor: settings.fontFamily === 'sans' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.fontFamily === 'sans' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.fontFamily === 'sans' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        Sans-Serif
                      </button>
                      <button
                        onClick={() => setFontFamily('mono')}
                        className="p-2.5 rounded-xl border text-xs font-mono font-bold transition-all"
                        style={{
                          backgroundColor: settings.fontFamily === 'mono' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.fontFamily === 'mono' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.fontFamily === 'mono' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        Monospace
                      </button>
                    </div>
                  </div>

                  {/* Page Turn Animation Style */}
                  <div>
                    <label
                      className="text-xs font-bold tracking-wider uppercase mb-2 block flex items-center gap-1.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      Efek Balik Lembaran
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPageTurnAnimation('curl')}
                        className="p-2.5 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.pageTurnAnimation === 'curl' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.pageTurnAnimation === 'curl' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.pageTurnAnimation === 'curl' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        3D Realistic
                      </button>
                      <button
                        onClick={() => setPageTurnAnimation('slide')}
                        className="p-2.5 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.pageTurnAnimation === 'slide' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.pageTurnAnimation === 'slide' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.pageTurnAnimation === 'slide' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        Slide
                      </button>
                      <button
                        onClick={() => setPageTurnAnimation('none')}
                        className="p-2.5 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.pageTurnAnimation === 'none' ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.pageTurnAnimation === 'none' ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.pageTurnAnimation === 'none' ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        Instan
                      </button>
                    </div>
                  </div>

                  {/* Tata Letak Dua Halaman (Two-Page Spread) */}
                  <div>
                    <label
                      className="text-xs font-bold tracking-wider uppercase mb-2 block flex items-center gap-1.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      Tata Letak Lembaran
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setTwoPageSpread(false);
                          goeyToast.info('Mode 1 Halaman Aktif');
                        }}
                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: !settings.twoPageSpread ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: !settings.twoPageSpread ? 'var(--accent)' : 'var(--border-color)',
                          color: !settings.twoPageSpread ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        <FileText className="w-4 h-4" />
                        1 Halaman
                      </button>
                      <button
                        onClick={() => {
                          setTwoPageSpread(true);
                          goeyToast.info('Mode 2 Halaman (Buku Terbuka) Aktif');
                        }}
                        className="flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all"
                        style={{
                          backgroundColor: settings.twoPageSpread ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                          borderColor: settings.twoPageSpread ? 'var(--accent)' : 'var(--border-color)',
                          color: settings.twoPageSpread ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                      >
                        <BookOpen className="w-4 h-4" />
                        2 Halaman (Buku)
                      </button>
                    </div>
                  </div>

                  {/* Sound Effect Toggle */}
                  <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        Suara Lembaran Kertas
                      </p>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        Efek desiran kertas halus saat membalik halaman
                      </p>
                    </div>
                    <button
                      onClick={toggleSoundEffects}
                      className="p-2.5 rounded-xl border transition-all"
                      style={{
                        backgroundColor: settings.soundEffects ? 'var(--accent-bg)' : 'var(--bg-subtle)',
                        borderColor: settings.soundEffects ? 'var(--accent)' : 'var(--border-color)',
                        color: settings.soundEffects ? 'var(--accent)' : 'var(--text-muted)',
                      }}
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
