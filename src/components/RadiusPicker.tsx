import { Crosshair, ChevronDown } from "lucide-react";
import { useUserLocation } from "@/contexts/LocationContext";
import { RADIUS_PRESETS } from "@/lib/dk-postcodes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  className?: string;
}

/**
 * Compact pill that lets the user pick a search radius (10/25/50/100 km, or "Hele DK").
 * Disabled when no location is set — radius only matters when we have a "from" point.
 */
const RadiusPicker = ({ className = "" }: Props) => {
  const { location, radiusKm, setRadiusKm } = useUserLocation();
  const hasLocation = !!(location.city || location.zip);
  const currentLabel =
    RADIUS_PRESETS.find((p) => p.value === radiusKm)?.label ??
    (radiusKm === null ? "Hele DK" : `${radiusKm} km`);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!hasLocation}
          className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          title={hasLocation ? "Vælg søge-radius" : "Sæt din lokation først"}
          aria-label="Vælg søge-radius"
        >
          <Crosshair className="h-3.5 w-3.5 text-accent" />
          <span>{currentLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {RADIUS_PRESETS.map((p) => {
          const active = p.value === radiusKm;
          return (
            <DropdownMenuItem
              key={p.label}
              onClick={() => setRadiusKm(p.value)}
              className={active ? "bg-secondary font-semibold text-foreground" : ""}
            >
              {p.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RadiusPicker;
