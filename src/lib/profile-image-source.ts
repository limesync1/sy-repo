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

/** Fill the crop at any angle, without introducing empty margins. */
export function imageCoverScale(width: number, height: number, view: number, rotation = 0): number {
  if (width <= 0 || height <= 0 || view <= 0) return 1;
  const radians = rotation * Math.PI / 180;
  const extent = view * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians)));
  return Math.max(extent / width, extent / height);
}

export function rotatedFitScale(width: number, height: number, view: number, circle: boolean, rotation: number): number {
  if (circle) return imageFitScale(width, height, view, true);
  const radians = rotation * Math.PI / 180;
  const c = Math.abs(Math.cos(radians));
  const s = Math.abs(Math.sin(radians));
  return imageFitScale(width * c + height * s, width * s + height * c, view, false);
}

/** Ignore transparent file padding, never white pixels belonging to the artwork. */
export function visibleImageBounds(pixels: Uint8ClampedArray, width: number, height: number) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  return right < left ? { x: 0, y: 0, width, height } : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}