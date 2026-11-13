import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'LuminaRead — Offline Multi-Format E-Book Reader',
  description:
    'Aplikasi pembaca buku digital offline-first yang mendukung PDF dan EPUB dengan rak buku lokal, penyimpanan progres otomatis, serta pengalaman membaca yang bebas gangguan.',
  keywords: ['ebook reader', 'pdf reader', 'epub reader', 'offline first', 'reading app', 'nextjs'],
  authors: [{ name: 'Dimas Nuryadin' }],
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#d97706',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased min-h-screen select-none font-sans">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
