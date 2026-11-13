import type { Book } from '@/types/book';
import { generateFallbackCover, generateUUID } from '@/lib/parsers/bookParser';

/**
 * Creates a beautiful sample mini-PDF in memory using standard PDF syntax
 */
export function createSamplePdf(): Blob {
  // Minimal valid PDF structure with sample pages
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 7 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 8 0 R >>
endobj
5 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 9 0 R >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
7 0 obj
<< /Length 260 >>
stream
BT
/F1 28 Tf
72 700 Td
(Selamat Datang di LuminaRead) Tj
/F1 14 Tf
0 -40 Td
(Aplikasi Pembaca E-Book Modern, Cepat & Bebas Gangguan) Tj
0 -30 Td
(Dibuat dengan Next.js 16, TypeScript, Tailwind CSS, dan Dexie IndexedDB.) Tj
0 -30 Td
(Semua buku Anda disimpan 100% secara lokal di browser Anda.) Tj
0 -50 Td
(Gunakan tombol panah keyboard atau klik halaman untuk membalik lembaran!) Tj
ET
endstream
endobj
8 0 obj
<< /Length 230 >>
stream
BT
/F1 22 Tf
72 700 Td
(Bab 1: Pengalaman Membaca Zen) Tj
/F1 13 Tf
0 -35 Td
(Fitur Unggulan LuminaRead:) Tj
0 -25 Td
(- 3 Tema Ramah Mata: Pristine Light, Warm Sepia, dan Midnight Dark.) Tj
0 -25 Td
(- Animasi Lembaran 3D yang mulus dengan akselerasi kartu grafis GPU.) Tj
0 -25 Td
(- Efek suara lembaran kertas yang lembut saat membalik halaman.) Tj
0 -25 Td
(- Penyimpanan posisi otomatis dan penanda buku (bookmark).) Tj
ET
endstream
endobj
9 0 obj
<< /Length 190 >>
stream
BT
/F1 22 Tf
72 700 Td
(Bab 2: Privasi Penuh) Tj
/F1 13 Tf
0 -35 Td
(Tidak ada file yang diunggah ke cloud atau server eksternal.) Tj
0 -25 Td
(Data Anda tetap aman di perangkat Anda.) Tj
0 -45 Td
(Selamat menikmati pengalaman membaca digital Anda!) Tj
ET
endstream
endobj
xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000133 00000 n 
0000000256 00000 n 
0000000379 00000 n 
0000000502 00000 n 
0000000572 00000 n 
0000000885 00000 n 
0000001168 00000 n 
trailer
<< /Size 10 /Root 1 0 R >>
startxref
1410
%%EOF`;

  return new Blob([pdfContent], { type: 'application/pdf' });
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
