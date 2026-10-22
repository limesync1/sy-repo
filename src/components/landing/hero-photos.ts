import photos from "./hero-photo-data.json";

export const heroPhotos = photos;
export const HERO_PHOTO_SIZES = "(min-width: 1280px) 570px, (min-width: 1024px) 45vw, (min-width: 640px) 640px, calc(100vw - 32px)";
export const photoSrcSet = (photo: typeof heroPhotos[number]) => `${photo.mobileSrc} 640w, ${photo.src} 1280w`;