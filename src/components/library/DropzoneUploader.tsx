'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
        setStatusMessage(`Memproses ${file.name} (mengekstrak sampul & metadata)...`);
        const parsedBook = await parseBookFile(file);
        await saveBook(parsedBook);
        onBookAdded(parsedBook);
      } catch (err: any) {
        console.error('Gagal memproses file:', err);
        setErrorMessage(`Gagal memuat "${file.name}": ${err?.message || 'Error tidak diketahui'}`);
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
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.epub,application/pdf,application/epub+zip"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Drop zone container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center justify-center text-center ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10 scale-[1.01] shadow-lg'
            : 'border-zinc-300 dark:border-zinc-750 hover:border-amber-500/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 bg-zinc-50/50 dark:bg-zinc-900/20'
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {statusMessage || 'Mengekstrak berkas...'}
            </p>
            <p className="text-xs text-zinc-400">Menyimpan langsung di memori browser lokal Anda</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1 transition-transform group-hover:scale-110">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Seret dan lepaskan berkas e-book ke sini, atau{' '}
              <span className="text-amber-600 dark:text-amber-400 underline underline-offset-2">
                pilih dari perangkat
              </span>
            </p>

            <p className="text-xs text-zinc-400 max-w-sm">
              Mendukung dokumen format <span className="font-semibold text-zinc-600 dark:text-zinc-300">PDF</span> dan{' '}
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">EPUB</span>. File Anda 100% tersimpan aman di browser tanpa diunggah ke server.
            </p>
          </div>
        )}
      </div>

      {/* Error alert notice if any */}
      {errorMessage && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
