import { Building2 } from "lucide-react";
import { imageSrc, imageSrcSet } from "@/lib/image-url";
import { cn } from "@/lib/utils";

/**
 * Coverbillede for en virksomhed med fast aspect ratio.
 *
 * Hvorfor: coverbilleder uploades i vilde formater (panorama, portræt,
 * screenshot). Uden en fast ramme bliver kortene enten strakte eller
 * uens i højden. Her beskærer vi altid centreret (`object-cover`) inden
 * for et valgt forhold, og lægger en blødt sløret kopi bagved så smalle
 * billeder ikke efterlader tomme kanter.
 *
 * Skalering sker via storage-transformationer (se src/lib/image-url.ts),
 * så mobilen aldrig henter en 3 MB original.
 */
export type CoverRatio = "16/6" | "16/9" | "16/10" | "3/2" | "1/1";

const RATIO_CLASS: Record<CoverRatio, string> = {
  "16/6": "aspect-[16/6]",
  "16/9": "aspect-[16/9]",
  "16/10": "aspect-[16/10]",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
};

type Props = {
  url?: string | null;
  /** Bruges til alt-tekst; sæt `decorative` hvis billedet ikke tilføjer info. */
  name: string;
  alt?: string;
  ratio?: CoverRatio;
  /** Slå den slørede baggrund fra (fx når kortet allerede har en farvet flade). */
  backdrop?: boolean;
  sizes?: string;
  widths?: number[];
  /** Over folden (fx virksomhedens egen side) — undlad lazy loading. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  decorative?: boolean;
};

const BusinessCover = ({
  url,
  name,
  alt,
  ratio = "16/10",
  backdrop = true,
  sizes = "(max-width: 640px) 100vw, 400px",
  widths = [320, 480, 640, 960, 1280],
  priority = false,
  className,
  imgClassName,
  decorative = false,
}: Props) => {
  const wrapper = cn("relative w-full overflow-hidden bg-secondary", RATIO_CLASS[ratio], className);

  if (!url) {
    return (
      <div className={wrapper}>
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent/15 via-secondary to-muted">
          <Building2 className="h-10 w-10 text-muted-foreground/30" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
      {backdrop && (
        <img
          src={imageSrc(url, 48, 40)}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
          loading="lazy"
          decoding="async"
        />
      )}
      <img
        src={imageSrc(url, 960, 75)}
        srcSet={imageSrcSet(url, widths, 75)}
        sizes={sizes}
        alt={decorative ? "" : (alt ?? `Coverbillede for ${name}`)}
        aria-hidden={decorative || undefined}
        className={cn("relative h-full w-full object-cover object-center", imgClassName)}
        loading={priority ? "eager" : "lazy"}
        // eslint-disable-next-line react/no-unknown-property
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </div>
  );
};

export default BusinessCover;
