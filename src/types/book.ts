export type BookFormat = 'pdf' | 'epub';

export type ReaderTheme = 'light' | 'sepia' | 'dark';

export type FontFamily = 'serif' | 'sans' | 'mono';

export type PageTurnAnimation = 'curl' | 'slide' | 'fade' | 'none';

export interface Book {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  fileData: Blob;
  coverUrl?: string; // Data URL thumbnail
  fileSize: number; // in bytes
  totalLocations: number; // total pages for PDF or chapters/sections for EPUB
  currentLocation: string | number; // page number (PDF) or CFI string (EPUB)
  readingProgress: number; // 0 to 100 percentage
  createdAt: number;
  lastReadAt: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  location: string | number;
  title: string;
  previewText?: string;
  createdAt: number;
}

export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: number; // e.g., 16 (base in px) or 100 (%)
  fontFamily: FontFamily;
  lineHeight: number; // e.g., 1.6
  pageTurnAnimation: PageTurnAnimation;
  soundEffects: boolean;
  zenMode: boolean;
}

export interface TableOfContentsItem {
  id: string;
  label: string;
  href: string; // cfi or anchor
  subitems?: TableOfContentsItem[];
}
