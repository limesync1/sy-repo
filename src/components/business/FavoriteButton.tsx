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
      className={`absolute right-3 top-3 transition-transform hover:scale-110 active:scale-95 disabled:opacity-60 ${className}`}
      aria-label={isFavorited ? "Fjern fra favoritter" : "Gem som favorit"}
    >
      <Heart
        className={`h-7 w-7 stroke-[2] drop-shadow-md ${
          isFavorited ? "fill-accent text-accent" : "fill-foreground/30 text-white"
        }`}
      />
    </button>
  );
};

export default FavoriteButton;
