import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const BASE = 'http://localhost:5000';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_DISPLAY_WIDTH = 800;
const PAGE_GAP = 40;

function loadImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc file ảnh'));
    };
    img.src = url;
  });
}

function scaleToMaxWidth(width, height, maxWidth = MAX_DISPLAY_WIDTH) {
  if (width <= maxWidth) return { width, height };
  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * scale) };
}

async function uploadBlob(blob, filename, boardId, token) {
  const formData = new FormData();
  formData.append('file', blob, filename);

  const res = await fetch(`${BASE}/api/board/${boardId}/attachment`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể tải file lên');
  }
  return data;
}

async function uploadImageFile(file, boardId, token) {
  const { width, height } = await loadImageDimensions(file);
  const uploaded = await uploadBlob(file, file.name, boardId, token);
  const scaled = scaleToMaxWidth(width, height);

  return [{
    type: 'image',
    imageUrl: uploaded.url,
    mimeType: uploaded.mimeType,
    filename: uploaded.filename,
    width: scaled.width,
    height: scaled.height,
  }];
}

async function renderPdfPage(pdf, pageNumber, scale) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function uploadPdfFile(file, boardId, token) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const items = [];

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    const firstViewport = (await pdf.getPage(pageIndex)).getViewport({ scale: 1 });
    const scale = Math.min(1, MAX_DISPLAY_WIDTH / firstViewport.width);
    const canvas = await renderPdfPage(pdf, pageIndex, scale);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error(`Không thể xử lý trang ${pageIndex}`));
      }, 'image/png');
    });

    const uploaded = await uploadBlob(
      blob,
      `${file.name.replace(/\.pdf$/i, '')}-page-${pageIndex}.png`,
      boardId,
      token,
    );

    items.push({
      type: 'pdf-page',
      imageUrl: uploaded.url,
      mimeType: 'image/png',
      filename: uploaded.filename,
      sourceFilename: file.name,
      pageIndex: pageIndex - 1,
      totalPages: pdf.numPages,
      width: canvas.width,
      height: canvas.height,
    });
  }

  return items;
}

export function computeMediaPlacement(items, camera) {
  const centerX = (window.innerWidth / 2 - camera.x) / camera.zoom;
  const centerY = (window.innerHeight / 2 - camera.y) / camera.zoom;

  const totalHeight = items.reduce((sum, item, index) => {
    return sum + item.height + (index > 0 ? PAGE_GAP : 0);
  }, 0);

  let currentY = centerY - totalHeight / 2;
  return items.map((item) => {
    const placement = {
      ...item,
      x: centerX - item.width / 2,
      y: currentY,
    };
    currentY += item.height + PAGE_GAP;
    return placement;
  });
}

export async function processBoardUpload(file, boardId, token) {
  if (!file) throw new Error('Không có file');

  if (file.type.startsWith('image/')) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error('Ảnh không được vượt quá 15MB');
    }
    return uploadImageFile(file, boardId, token);
  }

  if (file.type === 'application/pdf') {
    if (file.size > MAX_PDF_BYTES) {
      throw new Error('PDF không được vượt quá 25MB');
    }
    return uploadPdfFile(file, boardId, token);
  }

  throw new Error('Chỉ hỗ trợ file ảnh (PNG, JPG, GIF, WebP) hoặc PDF');
}
