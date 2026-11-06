export function compressedImageSize(width: number, height: number, maxDimension: number) {
  const ratio = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** Bound decoded image memory before editing and always encode raster uploads as WebP. */
export async function compressImage(file: Blob, maxDimension: number, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Billedet kunne ikke læses. Prøv et JPG-, PNG- eller WebP-billede."));
      image.src = url;
    });
    const size = compressedImageSize(image.naturalWidth, image.naturalHeight, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Billedet kunne ikke behandles");
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/webp") return reject(new Error("Din browser kunne ikke komprimere billedet til WebP"));
      resolve(blob);
    }, "image/webp", quality));
  } finally { URL.revokeObjectURL(url); }
}