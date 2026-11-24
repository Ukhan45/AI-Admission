// lib/pdfReader.ts
// Reads a PDF inside the user's browser: extracts the text layer and renders a
// few pages to small JPEG images (needed for scanned documents and for stamps).
// pdf.js is loaded from a CDN at runtime, so no extra npm package or bundler
// configuration is required.
'use client';

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_TEXT_CHARS = 5000;
const MAX_IMAGES = 3;          // matches the vision model's per-request limit
const TARGET_WIDTH = 1000;     // px, enough to read stamps without huge uploads
const MAX_IMAGE_CHARS = 1_000_000; // ~750 KB per image as a data URL

export type PdfRead = {
  pages: number;
  text: string;
  images: string[]; // data:image/jpeg;base64,...
  scanned: boolean; // true when there is (almost) no text layer
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loader: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadPdfJs(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_URL;
      script.async = true;
      script.onload = () => {
        if (!w.pdfjsLib) {
          loader = null;
          reject(new Error('The PDF reader failed to start.'));
          return;
        }
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(w.pdfjsLib);
      };
      script.onerror = () => {
        loader = null;
        reject(new Error('Could not load the PDF reader. Check your internet connection and try again.'));
      };
      document.head.appendChild(script);
    });
  }
  return loader;
}

// Pages most likely to carry content and stamps: first, second, and last.
function pickPages(total: number): number[] {
  const pages = new Set<number>([1]);
  if (total >= 2) pages.add(2);
  if (total > 2) pages.add(total);
  return [...pages].slice(0, MAX_IMAGES).sort((a, b) => a - b);
}

export async function readPdf(file: File): Promise<PdfRead> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('This file is larger than 20 MB. Please compress it and upload again.');
  }

  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data }).promise;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/password/i.test(msg)) {
      throw new Error('This PDF is password-protected. Remove the password and upload it again.');
    }
    throw new Error('This file could not be opened as a PDF. It may be damaged.');
  }

  const total: number = pdf.numPages;

  // 1) Text layer (first few pages only)
  let text = '';
  for (let p = 1; p <= Math.min(total, 4) && text.length < MAX_TEXT_CHARS; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line = content.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');
    text += `\n[Page ${p}]\n${line.replace(/\s+/g, ' ').trim()}`;
  }
  text = text.trim().slice(0, MAX_TEXT_CHARS);

  // 2) Page images
  const images: string[] = [];
  for (const p of pickPages(total)) {
    const page = await pdf.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, TARGET_WIDTH / base.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    let quality = 0.72;
    let url = canvas.toDataURL('image/jpeg', quality);
    while (url.length > MAX_IMAGE_CHARS && quality > 0.4) {
      quality -= 0.1;
      url = canvas.toDataURL('image/jpeg', quality);
    }
    if (url.length <= MAX_IMAGE_CHARS) images.push(url);
    canvas.width = canvas.height = 0; // release memory
  }

  const textChars = text.replace(/\[Page \d+\]/g, '').trim().length;
  return { pages: total, text, images, scanned: textChars < 200 };
}