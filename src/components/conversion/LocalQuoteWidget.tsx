import { useNavigate } from "react-router-dom";
import { useMemo, useState, type FormEvent } from "react";
import { CITIES as CLEANING_CITIES } from "@/pages/cities/cleaningCityData";

/** Servicekategorier der matcher hub-sider og prefill i /tilbud-flowet. */
const SERVICES: { value: string; label: string }[] = [
  { value: "Rengøring", label: "Rengøring" },
  { value: "Flyttehjælp", label: "Flyttehjælp" },
  { value: "Haveservice", label: "Haveservice" },
  { value: "Håndværker", label: "Håndværker" },
  { value: "Maler", label: "Maler" },
  { value: "VVS", label: "VVS" },
  { value: "Elektriker", label: "Elektriker" },
  { value: "Tømrer", label: "Tømrer" },
  { value: "Vinduespudser", label: "Vinduespudser" },
  { value: "Skadedyr", label: "Skadedyrsbekæmpelse" },
];

interface Props {
  /** Forudvalgt service (kan stadig ændres af brugeren). */
  defaultService?: string;
  /** Overskrift over widgeten. */
  heading?: string;
  /** Underoverskrift. */
  description?: string;
  /** Mørk variant (dark hero / footer-baggrund). */
  tone?: "light" | "dark";
}

/**
 * Lokal "find hjælp" widget — service + by → /tilbud med prefill.
 * Bruges på hub-sider, blog-/guides-index og forsiden for at sænke friktion
 * og koble SEO-trafik direkte til konverteringsflowet.
 */
const LocalQuoteWidget = ({
  defaultService = "Rengøring",
  heading = "Find lokal hjælp nu",
  description = "Vælg service og by — vi finder 3 verificerede udbydere i dit område.",
  tone = "light",
}: Props) => {
  const navigate = useNavigate();
  const [service, setService] = useState(defaultService);
  const [citySlug, setCitySlug] = useState("");

  const cities = useMemo(
    () => [...CLEANING_CITIES].sort((a, b) => a.name.localeCompare(b.name, "da")),
    [],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (service) params.set("category", service);
    const city = cities.find((c) => c.slug === citySlug);
    if (city) {
      // Send første postnummer i byens range — RequestQuote læser ?postal
      // og prefill'er LocationContext.
      const firstPostal = city.postalRange.split("–")[0]?.trim();
      if (firstPostal && /^\d{4}$/.test(firstPostal)) {
        params.set("postal", firstPostal);
      }
      params.set("city", city.name);
    }
    navigate(`/tilbud${params.toString() ? `?${params}` : ""}`);
  };

  const dark = tone === "dark";
  const wrap = dark
    ? "border-background/15 bg-background/5 text-background"
    : "border-border bg-card text-foreground";
  const label = dark ? "text-background/70" : "text-muted-foreground";
  const field = dark
    ? "border-background/20 bg-background/10 text-background placeholder:text-background/50 focus:ring-background/40"
    : "border-input bg-background text-foreground focus:ring-ring";
  const button = dark
    ? "bg-background text-foreground hover:bg-background/90"
    : "bg-foreground text-background hover:opacity-90";

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Find lokal serviceyder"
      className={`not-prose rounded-2xl border p-5 shadow-panel sm:p-6 ${wrap}`}
    >
      <div className="mb-4">
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${label}`}>
          Gratis & uforpligtende
        </p>
        <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{heading}</p>
        <p className={`mt-1 text-sm leading-6 ${label}`}>{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1.2fr_auto]">
        <label className="flex flex-col gap-1">
          <span className={`text-xs font-medium ${label}`}>Service</span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className={`h-12 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 ${field}`}
          >
            {SERVICES.map((s) => (
              <option key={s.value} value={s.value} className="text-foreground">
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={`text-xs font-medium ${label}`}>By</span>
          <select
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            className={`h-12 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 ${field}`}
          >
            <option value="" className="text-foreground">Vælg by (valgfri)</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug} className="text-foreground">
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className={`mt-auto inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold ${button}`}
        >
          Få 3 tilbud →
        </button>
      </div>
      <p className={`mt-3 text-[11px] ${label}`}>
        Svar på under 24 timer · CVR-verificerede firmaer · Ingen forpligtelse
      </p>
    </form>
  );
};

export default LocalQuoteWidget;