import { formatPrice as formatDkk } from "@/lib/price-format";
import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, ArrowRight, Building2 } from "lucide-react";
import supportPortrait from "@/assets/serviceydere-support.jpg.asset.json";

interface RecommendationMetadata {
  kind: string;
  why?: string | null;
  category?: string | null;
  distance_km?: number | null;
  business: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    city?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
    categories?: string[];
    is_verified?: boolean;
  };
  services?: Array<{
    id: string;
    name: string;
    description?: string | null;
    pricing_type?: string | null;
    base_price?: number | null;
    unit?: string | null;
    subcategory?: string | null;
  }>;
}

const formatServicePrice = (s: NonNullable<RecommendationMetadata["services"]>[number]) => {
  if (s.pricing_type === "prisberegner") return "Prisberegner";
  if (s.pricing_type === "timepris" && s.base_price) return `${formatDkk(s.base_price)}/t`;
  if (s.pricing_type === "fast_pris" && s.base_price) return `${formatDkk(s.base_price)}`;
  if (s.base_price) return `${formatDkk(s.base_price)}${s.unit ? ` / ${s.unit}` : ""}`;
  return "Pris efter aftale";
};

const BusinessRecommendationCard = ({
  metadata,
  createdAt,
}: {
  metadata: RecommendationMetadata;
  createdAt: string;
}) => {
  const { business, services = [], why, distance_km } = metadata;
  const time = new Date(createdAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="w-7 flex-shrink-0">
        <span className="flex h-9 w-9 items-center justify-center overflow-visible rounded-2xl bg-card ring-1 ring-border">
          <img src={supportPortrait.url} alt="Serviceydere kundeservice" className="h-9 w-9 rounded-2xl object-cover" />
        </span>
      </div>
      <div className="flex max-w-[88%] flex-col items-start">
        <div className="overflow-hidden rounded-2xl rounded-bl-sm border border-border bg-card text-foreground shadow-sm">
          {business.cover_image_url && (
            <div className="relative h-20 w-full overflow-hidden bg-secondary">
              <img src={business.cover_image_url} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="flex items-start gap-3 px-3.5 pt-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-contain p-0.5" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="truncate text-sm font-semibold text-foreground">{business.name}</h4>
                {business.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-accent" />}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                {business.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {business.city}
                  </span>
                )}
                {typeof distance_km === "number" && (
                  <span>· {distance_km < 1 ? "<1" : distance_km} km fra dig</span>
                )}
              </div>
              {(business.categories?.length ?? 0) > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {business.categories!.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {why && (
            <p className="px-3.5 pt-2 text-[12px] leading-snug text-foreground/80">
              {why}
            </p>
          )}
          {services.length > 0 && (
            <ul className="mt-2 divide-y divide-border border-t border-border">
              {services.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-3.5 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-foreground">{s.name}</div>
                    {s.subcategory && (
                      <div className="truncate text-[10.5px] text-muted-foreground">{s.subcategory}</div>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-foreground">
                    {formatServicePrice(s)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2">
            <Link
              to={`/b/${business.slug}`}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-foreground transition-colors hover:text-accent"
            >
              Se virksomheden
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to={`/b/${business.slug}`}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-3 py-1.5 text-[11.5px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              Book nu
            </Link>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
};

export default BusinessRecommendationCard;
