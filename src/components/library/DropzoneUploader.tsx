'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { parseBookFile } from '@/lib/parsers/bookParser';
import { saveBook } from '@/lib/db';
import type { Book } from '@/types/book';

interface DropzoneUploaderProps {
  onBookAdded: (newBook: Book) => void;
}

export default function DropzoneUploader({ onBookAdded }: DropzoneUploaderProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension !== 'pdf' && extension !== 'epub') {
        setErrorMessage(`File "${file.name}" dilewati: Format harus berupa PDF atau EPUB.`);
        continue;
      }

      try {
        setStatusMessage(`Memproses ${file.name} (mengekstrak sampul & indeks)...`);
        const parsedBook = await parseBookFile(file);
        await saveBook(parsedBook);
        onBookAdded(parsedBook);
      } catch (err: any) {
        console.error('Gagal memproses file:', err);
        setErrorMessage(`Gagal memuat "${file.name}": ${err?.message || 'Format tidak didukung'}`);
      }
    }

    setIsProcessing(false);
    setStatusMessage('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-200 flex flex-col items-center justify-center text-center ${
          isDragging
            ? 'scale-[1.01] shadow-md border-amber-600 bg-amber-500/10'
            : 'hover:border-amber-600/70'
        }`}
        style={{
          backgroundColor: isDragging ? 'var(--accent-bg)' : 'var(--bg-surface)',
          borderColor: isDragging ? 'var(--accent)' : 'var(--border-color)',
        }}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-9 h-9 border-3 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {statusMessage || 'Menyiapkan berkas...'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tersimpan langsung di memori lokal peramban Anda (Offline-First)
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs transition-transform hover:scale-105"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent)',
              }}
            >
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Seret dan lepaskan file e-book ke sini, atau{' '}
              <span className="underline underline-offset-4 decoration-amber-500/60 font-bold hover:text-amber-600">
                pilih berkas
              </span>
            </p>

            <p className="text-xs max-w-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Mendukung format <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>PDF</span> dan{' '}
              <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>EPUB</span>. Berkas 100% diproses di perangkat lokal tanpa pernah diunggah ke server.
            </p>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
