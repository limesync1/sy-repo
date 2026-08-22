/**
 * Hjælpere til responsive billeder fra vores egen storage.
 *
 * Storage kan transformere billeder on-the-fly via render-endpointet, så vi
 * undgår at sende 2–3 MB originalfiler til en mobil. `imageSrc` laver én
 * skaleret URL, og `imageSrcSet` laver et sæt bredder browseren kan vælge
 * imellem ud fra `sizes`. Ikke-storage-URL'er (fx eksterne logoer eller
 * lokale assets) sendes uændret igennem.
 */

const OBJECT_SEGMENT = "/storage/v1/object/public/";
const RENDER_SEGMENT = "/storage/v1/render/image/public/";

/** Er det en offentlig fil i vores egen storage (og dermed transformerbar)? */
export const isTransformableImage = (url?: string | null): boolean =>
  !!url && url.includes(OBJECT_SEGMENT) && !/\.svg(\?|$)/i.test(url);

/** Skaleret variant af et storage-billede. Falder tilbage til originalen. */
export const imageSrc = (
  url?: string | null,
  width = 800,
  quality = 75,
): string | undefined => {
  if (!url) return undefined;
  if (!isTransformableImage(url)) return url;
  const [base] = url.split("?");
  return `${base.replace(OBJECT_SEGMENT, RENDER_SEGMENT)}?width=${width}&quality=${quality}&resize=cover`;
};

/** srcSet med flere bredder, så browseren henter den mindste der er skarp nok. */
export const imageSrcSet = (
  url?: string | null,
  widths: number[] = [400, 800, 1200, 1600],
  quality = 75,
): string | undefined => {
  if (!url || !isTransformableImage(url)) return undefined;
  return widths.map((w) => `${imageSrc(url, w, quality)} ${w}w`).join(", ");
};
