import photos from "./hero-photo-data.json";

export const HOME_TITLE = "Serviceydere – Find lokale services og få op til 3 tilbud";
export const HOME_DESCRIPTION = "Find lokale firmaer til vinduespudsning, rengøring, tagrensning og haveservice. Sammenlign priser, book direkte eller få op til 3 gratis, uforpligtende tilbud.";
export const homeImageObjects = () => photos.map(photo => ({
  "@type": "ImageObject",
  "@id": `https://serviceydere.dk/#photo-${photo.id}`,
  url: new URL(photo.src, "https://serviceydere.dk").href,
  contentUrl: new URL(photo.src, "https://serviceydere.dk").href,
  name: photo.title,
  caption: photo.alt,
  description: photo.description,
  encodingFormat: "image/webp",
  inLanguage: "da-DK",
  width: photo.width,
  height: photo.height,
}));

export const homePageData = () => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://serviceydere.dk/#webpage",
  url: "https://serviceydere.dk/",
  name: HOME_TITLE,
  description: HOME_DESCRIPTION,
  inLanguage: "da-DK",
  isPartOf: { "@id": "https://serviceydere.dk/#website" },
  about: { "@id": "https://serviceydere.dk/#organization" },
  primaryImageOfPage: { "@id": "https://serviceydere.dk/#photo-window-brush" },
  image: homeImageObjects(),
});