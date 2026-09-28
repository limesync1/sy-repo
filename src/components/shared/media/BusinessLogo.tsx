import { imageSrc } from "@/lib/image-url";
import { cn } from "@/lib/utils";

/**
 * Virksomhedslogo i en fast kvadratisk ramme.
 *
 * Logoer kommer i alle formater (brede ordmærker, høje mærker, PNG med
 * luft omkring). Derfor: fast kvadrat, `object-contain` så intet bliver
 * strakt, lidt indvendig luft og en neutral kortbaggrund. Uden logo
 * viser vi virksomhedens forbogstav, så layoutet aldrig hopper.
 */
type Props = {
  url?: string | null;
  name: string;
  /** Kantlængde i px — styrer både boks og hentet billedstørrelse. */
  size?: number;
  rounded?: "lg" | "xl" | "2xl" | "full";
  className?: string;
};

const BusinessLogo = ({ url, name, size = 48, rounded = "xl", className }: Props) => {
  const radius =
    rounded === "full" ? "rounded-full" : rounded === "2xl" ? "rounded-2xl" : rounded === "lg" ? "rounded-lg" : "rounded-xl";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-border bg-card",
        radius,
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img
          src={imageSrc(url, Math.max(96, size * 2), 82, "contain")}
          alt={`Logo for ${name}`}
          width={size}
          height={size}
          className="h-full w-full object-contain p-[12%]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span
          className="font-bold text-accent"
          style={{ fontSize: Math.max(12, Math.round(size * 0.4)) }}
          aria-hidden
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default BusinessLogo;
