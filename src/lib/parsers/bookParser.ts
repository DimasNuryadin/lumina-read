import type { Book, BookFormat } from '@/types/book';

// Helper to generate a UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'b-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
}

// Procedural SVG Cover generator if no cover is embedded
export function generateFallbackCover(title: string, author: string, format: BookFormat): string {
  const cleanTitle = title.length > 35 ? title.substring(0, 32) + '...' : title;
  const cleanAuthor = author.length > 25 ? author.substring(0, 22) + '...' : author;
  
  // Pick aesthetic color theme based on title hash
  const palettes = [
    { bg1: '#1e293b', bg2: '#0f172a', accent: '#38bdf8' }, // Slate Blue
    { bg1: '#312e81', bg2: '#1e1b4b', accent: '#a855f7' }, // Indigo Velvet
    { bg1: '#14532d', bg2: '#052e16', accent: '#4ade80' }, // Forest Emerald
    { bg1: '#701a75', bg2: '#4a044e', accent: '#f472b6' }, // Mulberry Wine
    { bg1: '#7c2d12', bg2: '#431407', accent: '#fb923c' }, // Amber Leather
  ];
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const palette = palettes[Math.abs(hash) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${palette.bg1}" />
        <stop offset="100%" stop-color="${palette.bg2}" />
      </linearGradient>
      <linearGradient id="spine" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(0,0,0,0.5)" />
        <stop offset="50%" stop-color="rgba(255,255,255,0.1)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.2)" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="600" rx="10" fill="url(#grad)" />
    
    <!-- Book Spine shadow effect on left -->
    <rect width="28" height="600" rx="4" fill="url(#spine)" />
    
    <!-- Gold/Accent border line -->
    <rect x="42" y="36" width="316" height="528" rx="6" fill="none" stroke="${palette.accent}" stroke-width="1.5" stroke-opacity="0.35" />
    
    <!-- Format Badge -->
    <rect x="52" y="52" width="56" height="24" rx="4" fill="${palette.accent}" fill-opacity="0.2" />
    <text x="80" y="68" fill="${palette.accent}" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" letter-spacing="1">
      ${format.toUpperCase()}
    </text>
    
    <!-- Title -->
    <foreignObject x="52" y="140" width="296" height="240">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Georgia, serif; color: #f8fafc; font-size: 26px; line-height: 1.35; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
        ${cleanTitle}
      </div>
    </foreignObject>
    
    <!-- Author & Footer -->
    <text x="52" y="490" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="500">
      ${cleanAuthor}
    </text>
    <text x="52" y="528" fill="${palette.accent}" font-family="sans-serif" font-size="11" letter-spacing="2" font-weight="600" opacity="0.8">
      LUMINAREAD LIBRARY
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Extract PDF metadata and thumbnail cover using pdfjs-dist
 */
export async function parsePdfFile(file: File): Promise<Omit<Book, 'id' | 'createdAt' | 'lastReadAt' | 'readingProgress'>> {
  const pdfjs = await import('pdfjs-dist');
  
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let title = file.name.replace(/\.[^/.]+$/, '');
  let author = 'Unknown Author';

  try {
    const meta = await pdfDoc.getMetadata();
    const info = meta?.info as Record<string, unknown> | undefined;
    if (info) {
      if (typeof info.Title === 'string' && info.Title.trim()) {
        title = info.Title.trim();
      }
      if (typeof info.Author === 'string' && info.Author.trim()) {
        author = info.Author.trim();
      }
    }
  } catch (e) {
    console.warn('Could not extract PDF metadata:', e);
  }

  // Render first page as cover thumbnail
  let coverUrl: string | undefined;
  try {
    const firstPage = await pdfDoc.getPage(1);
    const viewport = firstPage.getViewport({ scale: 0.6 });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };
      // @ts-expect-error pdfjs canvasContext type compatibility
      await firstPage.render(renderContext).promise;
      coverUrl = canvas.toDataURL('image/jpeg', 0.85);
    }
  } catch (err) {
    console.warn('Could not generate PDF cover thumbnail:', err);
    coverUrl = generateFallbackCover(title, author, 'pdf');
  }

  if (!coverUrl) {
    coverUrl = generateFallbackCover(title, author, 'pdf');
  }

  return {
    title,
    author,
    format: 'pdf',
    fileData: file,
    coverUrl,
    fileSize: file.size,
    totalLocations: numPages,
    currentLocation: 1,
  };
}

/**
 * Extract EPUB metadata and cover using epubjs
 */
export async function parseEpubFile(file: File): Promise<Omit<Book, 'id' | 'createdAt' | 'lastReadAt' | 'readingProgress'>> {
  const ePub = (await import('epubjs')).default;
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);

  let title = file.name.replace(/\.[^/.]+$/, '');
  let author = 'Unknown Author';
  let coverUrl: string | undefined;

  try {
    const metadata = await book.loaded.metadata;
    if (metadata.title) title = metadata.title;
    if (metadata.creator) author = metadata.creator;
  } catch (err) {
    console.warn('Could not extract EPUB metadata:', err);
  }

  try {
    const coverPath = await book.coverUrl();
    if (coverPath) {
      coverUrl = coverPath;
    }
  } catch (err) {
    console.warn('Could not extract EPUB cover:', err);
  }

  if (!coverUrl) {
    coverUrl = generateFallbackCover(title, author, 'epub');
  }

  return {
    title,
    author,
    format: 'epub',
    fileData: file,
    coverUrl,
    fileSize: file.size,
    totalLocations: 1,
    currentLocation: '',
  };
}

/**
 * Unified file parser
 */
export async function parseBookFile(file: File): Promise<Book> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let parsed: Omit<Book, 'id' | 'createdAt' | 'lastReadAt' | 'readingProgress'>;

  if (extension === 'pdf') {
    parsed = await parsePdfFile(file);
  } else if (extension === 'epub') {
    parsed = await parseEpubFile(file);
  } else {
    throw new Error(`Format file tidak didukung: .${extension}. Harap gunakan file PDF atau EPUB.`);
  }

  const now = Date.now();
  return {
    ...parsed,
    id: generateUUID(),
    createdAt: now,
    lastReadAt: now,
    readingProgress: 0,
  };
}
