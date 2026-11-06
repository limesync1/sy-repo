/** Cropped images and their uncropped source share a stable storage identifier. */
export function originalImageUrl(url: string): string | null {
  return /\/crop-[^/]+\.webp(?:\?|$)/.test(url)
    ? url.replace(/\/crop-([^/]+)\.webp/, "/original-$1.webp")
    : null;
}

export function imageFitScale(width: number, height: number, view: number, circle: boolean): number {
  if (width <= 0 || height <= 0) return 1;
  return view / (circle ? Math.hypot(width, height) : Math.max(width, height));
}