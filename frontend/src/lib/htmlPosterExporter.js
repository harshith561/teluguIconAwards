import * as htmlToImage from 'html-to-image';
import { createPosterFilename } from './posterRenderer';

/**
 * Cleanly export an HTML poster element to a high-res PNG/JPG blob.
 */
export const exportHtmlPosterToBlob = async (element, options = {}) => {
  if (!element) return null;
  const mimeType = options.mimeType || 'image/png';
  const quality = options.quality || 0.96;

  try {
    // Wait for fonts and images to settle
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    if (mimeType === 'image/jpeg') {
      const dataUrl = await htmlToImage.toJpeg(element, {
        quality,
        pixelRatio: options.pixelRatio || 1, // Element is already at natural 1080px width
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    }

    const blob = await htmlToImage.toBlob(element, {
      pixelRatio: options.pixelRatio || 1,
      cacheBust: true,
    });
    return blob;
  } catch (err) {
    console.error('Failed to export HTML poster to blob:', err);
    return null;
  }
};

/**
 * Download the HTML poster directly as CandidateName_FunctionName.png / .jpg
 */
export const downloadHtmlPoster = async (element, { candidateName, categoryName, format = 'png' }) => {
  if (!element) return;
  const mimeType = format === 'jpg' || format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpg' || format === 'jpeg' ? 'jpg' : 'png';
  const filename = createPosterFilename(candidateName, categoryName).replace(/\.png$/, `.${ext}`);

  const blob = await exportHtmlPosterToBlob(element, { mimeType });
  if (!blob) {
    console.error('Failed to generate poster download blob');
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
