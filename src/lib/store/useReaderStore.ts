import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ReaderSettings,
  ReaderTheme,
  FontFamily,
  PageTurnAnimation,
  PdfDarkModeStyle,
  Book,
} from '@/types/book';

interface ReaderStoreState {
  // User settings (persisted)
  settings: ReaderSettings;
  setTheme: (theme: ReaderTheme) => void;
  setFontSize: (fontSize: number) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  setLineHeight: (lineHeight: number) => void;
  setPageTurnAnimation: (animation: PageTurnAnimation) => void;
  setPdfDarkModeStyle: (style: PdfDarkModeStyle) => void;
  toggleSoundEffects: () => void;
  toggleZenMode: () => void;
  setZenMode: (enabled: boolean) => void;

  // Active reading session (transient / in-memory)
  activeBook: Book | null;
  currentPage: number;
  totalPages: number;
  currentCfi: string | null;
  isSidebarOpen: boolean;
  activeSidebarTab: 'toc' | 'bookmarks' | 'settings';
  isControlsVisible: boolean;

  setActiveBook: (book: Book | null) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  setCurrentCfi: (cfi: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveSidebarTab: (tab: 'toc' | 'bookmarks' | 'settings') => void;
  setIsControlsVisible: (visible: boolean) => void;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontSize: 18,
  fontFamily: 'serif',
  lineHeight: 1.7,
  pageTurnAnimation: 'slide',
  soundEffects: true,
  zenMode: false,
  pdfDarkModeStyle: 'ambient',
};

export const useReaderStore = create<ReaderStoreState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setTheme: (theme) =>
        set((state) => ({ settings: { ...state.settings, theme } })),
      setFontSize: (fontSize) =>
        set((state) => ({ settings: { ...state.settings, fontSize } })),
      setFontFamily: (fontFamily) =>
        set((state) => ({ settings: { ...state.settings, fontFamily } })),
      setLineHeight: (lineHeight) =>
        set((state) => ({ settings: { ...state.settings, lineHeight } })),
      setPageTurnAnimation: (pageTurnAnimation) =>
        set((state) => ({ settings: { ...state.settings, pageTurnAnimation } })),
      setPdfDarkModeStyle: (pdfDarkModeStyle) =>
        set((state) => ({ settings: { ...state.settings, pdfDarkModeStyle } })),
      toggleSoundEffects: () =>
        set((state) => ({
          settings: { ...state.settings, soundEffects: !state.settings.soundEffects },
        })),
      toggleZenMode: () =>
        set((state) => {
          const nextZen = !state.settings.zenMode;
          return {
            settings: { ...state.settings, zenMode: nextZen },
            isControlsVisible: !nextZen,
          };
        }),
      setZenMode: (zenMode) =>
        set((state) => ({
          settings: { ...state.settings, zenMode },
          isControlsVisible: !zenMode,
        })),

      // Transient state
      activeBook: null,
      currentPage: 1,
      totalPages: 1,
      currentCfi: null,
      isSidebarOpen: false,
      activeSidebarTab: 'toc',
      isControlsVisible: true,

      setActiveBook: (activeBook) =>
        set({
          activeBook,
          currentPage: typeof activeBook?.currentLocation === 'number' ? activeBook.currentLocation : 1,
          currentCfi: typeof activeBook?.currentLocation === 'string' ? activeBook.currentLocation : null,
          isControlsVisible: true,
        }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setTotalPages: (totalPages) => set({ totalPages }),
      setCurrentCfi: (currentCfi) => set({ currentCfi }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      setActiveSidebarTab: (activeSidebarTab) => set({ activeSidebarTab }),
      setIsControlsVisible: (isControlsVisible) => set({ isControlsVisible }),
    }),
    {
      name: 'luminaread-user-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
