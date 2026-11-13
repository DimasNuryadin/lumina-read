import type { Book } from '@/types/book';
import { generateFallbackCover, generateUUID } from '@/lib/parsers/bookParser';
import { jsPDF } from 'jspdf';

/**
 * Creates a fully compliant sample PDF using jsPDF
 */
export function createSamplePdf(): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // PAGE 1: Welcome & Cover
  doc.setFillColor(245, 238, 219); // Warm parchment background
  doc.rect(0, 0, 595, 842, 'F');

  doc.setDrawColor(194, 65, 12);
  doc.setLineWidth(2);
  doc.rect(36, 36, 523, 770);

  doc.setTextColor(38, 27, 17);
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.text('Selamat Datang di LuminaRead', 297, 240, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(90, 69, 49);
  doc.text('Aplikasi Pembaca E-Book Modern, Offline-First & Bebas Gangguan', 297, 280, { align: 'center' });

  doc.setFontSize(12);
  doc.text('Dibuat dengan Next.js 16, TypeScript, Tailwind CSS, dan Dexie IndexedDB.', 297, 340, { align: 'center' });
  doc.text('Semua berkas dan progres Anda disimpan 100% lokal di perangkat Anda.', 297, 365, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(194, 65, 12);
  doc.text('Gunakan tombol panah keyboard atau klik halaman untuk membalik lembaran 3D', 297, 460, { align: 'center' });

  // PAGE 2: Features
  doc.addPage();
  doc.setFillColor(250, 249, 246);
  doc.rect(0, 0, 595, 842, 'F');

  doc.setTextColor(28, 25, 23);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('Bab 1: Pengalaman Membaca Zen', 60, 100);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(68, 64, 60);

  const lines = [
    'LuminaRead dirancang khusus bagi pecinta buku yang menginginkan antarmuka yang tenang dan bersih.',
    '',
    'Fitur Unggulan LuminaRead:',
    '• 3 Tema Ramah Mata: Pristine Light, Warm Sepia, dan Midnight Dark.',
    '• Animasi Lembaran 3D yang mulus dengan akselerasi kartu grafis GPU.',
    '• Efek suara lembaran kertas yang lembut saat membalik halaman fisik.',
    '• Penyimpanan posisi otomatis dan penanda buku (bookmark) lokal.',
    '• Ekstraksi sampul buku otomatis dari dokumen PDF dan EPUB.',
  ];

  let y = 140;
  for (const line of lines) {
    doc.text(line, 60, y);
    y += 24;
  }

  // PAGE 3: Privacy & Portability
  doc.addPage();
  doc.setFillColor(250, 249, 246);
  doc.rect(0, 0, 595, 842, 'F');

  doc.setTextColor(28, 25, 23);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('Bab 2: Privasi Penuh Tanpa Server', 60, 100);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(68, 64, 60);

  const page3Lines = [
    'Salah satu kelebihan utama arsitektur Offline-First LuminaRead adalah keamanan data pribadi Anda.',
    '',
    '• Tidak ada file buku yang diunggah ke cloud atau server eksternal.',
    '• File disimpan dalam bentuk Blob biner di IndexedDB browser Anda.',
    '• Mendukung instalasi PWA (Progressive Web App) untuk mode pesawat.',
    '',
    'Selamat menikmati pengalaman membaca digital Anda!',
  ];

  y = 140;
  for (const line of page3Lines) {
    doc.text(line, 60, y);
    y += 24;
  }

  return doc.output('blob');
}

export function createDemoBook(): Book {
  const pdfBlob = createSamplePdf();
  const title = 'Panduan Membaca LuminaRead';
  const author = 'Lumina Editorial Team';
  const format = 'pdf';

  return {
    id: generateUUID(),
    title,
    author,
    format,
    fileData: pdfBlob,
    coverUrl: generateFallbackCover(title, author, format),
    fileSize: pdfBlob.size,
    totalLocations: 3,
    currentLocation: 1,
    readingProgress: 0,
    createdAt: Date.now(),
    lastReadAt: Date.now(),
  };
}
