import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/useFavorites";

interface Props {
  businessId: string;
  className?: string;
}

const FavoriteButton = ({ businessId, className = "" }: Props) => {
  const { user } = useAuth();
  const { data: favIds } = useFavoriteIds();
  const toggle = useToggleFavorite();

  if (!user) return null;

  const isFavorited = favIds?.has(businessId) ?? false;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ businessId, isFavorited });
      }}
      disabled={toggle.isPending}
      title={isFavorited ? "Fjern fra favoritter" : "Gem som favorit"}
      aria-pressed={isFavorited}
      /* Hjertet ligger ofte oven på lyse eller mørke cover-billeder. Vi giver
         det derfor altid en helt uigennemsigtig baggrund med tydelig ring, så
         ikonet har garanteret høj kontrast i alle tilstande (hover, aktiv,
         disabled) og uanset hvad der ligger bagved. */
      className={`absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_6px_18px_-6px_rgba(0,0,0,0.45)] transition-all duration-200 hover:scale-110 active:scale-95 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        isFavorited
          ? "border-accent bg-accent text-accent-foreground hover:bg-accent"
          : "border-border bg-background text-foreground hover:bg-background hover:border-foreground/40"
      } ${className}`}
      aria-label={isFavorited ? "Fjern fra favoritter" : "Gem som favorit"}
    >
      <Heart className={`h-[18px] w-[18px] stroke-[2.25] ${isFavorited ? "fill-current" : "fill-transparent"}`} />
    </button>
  );
};


export default FavoriteButton;
