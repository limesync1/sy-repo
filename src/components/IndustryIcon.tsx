import { cn } from "@/lib/utils";
import { getIndustryIconAsset } from "@/lib/industry-icons";

interface IndustryIconProps {
  category?: string | null;
  subcategory?: string | null;
  /** Servicens navn — bruges som ekstra keyword-hint hvis kategori/underkategori er tomme. */
  name?: string | null;
  className?: string;
  alt?: string;
}

/**
 * Branchespecifikt SVG-ikon (illustrativt). Ukendte brancher får en
 * neutral placeholder. Brug `className` til at sætte størrelse, fx
 * `h-10 w-10`.
 */
export function IndustryIcon({ category, subcategory, name, className, alt }: IndustryIconProps) {
  const src = getIndustryIconAsset(category, subcategory, name);
  return (
    <img
      src={src}
      alt={
        alt ??
        [subcategory, category, name].filter(Boolean).join(" – ") ||
        "Ikon for branche"
      }
      draggable={false}
      className={cn("inline-block select-none object-contain", className)}
    />
  );
}

export default IndustryIcon;