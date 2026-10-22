/** Texture coordinates for object-contain: preserve the complete image. */
export const containPhotoScale = (frameAspect: number, photoAspect: number) => [
  Math.max(frameAspect / photoAspect, 1),
  Math.max(photoAspect / frameAspect, 1),
] as const;