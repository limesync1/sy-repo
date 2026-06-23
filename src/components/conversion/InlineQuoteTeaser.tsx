import { useNavigate } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { useUserLocation } from "@/contexts/LocationContext";

interface Props {
  /** Forudvalgt kategori i tilbudsflowet (sendes som ?category=...) */
  category?: string;
  /** Overskrift tilpasset siden, fx "Få tilbud fra rengøringsfirmaer i Aarhus" */
  heading?: string;
}

/**
 * Mini "start tilbud"-formular der reducerer friktion fra SEO-sider.
 * Bruger ikke backend — sender brugeren videre til /tilbud med prefill, hvor
 * det fulde flow kører. Det halverer typisk drop-off vs. ren CTA-knap.
 */
const InlineQuoteTeaser = ({
  category,
  heading = "Få 3 gratis tilbud — start her",
}: Props) => {
  const navigate = useNavigate();
  const [postal, setPostal] = useState("");
  const { setManualZip } = useUserLocation();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    const cleaned = postal.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length === 4) {
      params.set("postal", cleaned);
      // Sæt brugerens manuelle postnummer i LocationContext, så
      // /tilbud-flowet straks bruger den valgte by/region.
      setManualZip(cleaned);
    }
    navigate(`/tilbud${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="not-prose my-8 rounded-2xl border border-border bg-card p-5 shadow-panel sm:p-6"
      aria-label="Start tilbudsforespørgsel"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gratis tilbud</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{heading}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Indtast dit postnummer — vi finder relevante udbydere på under 24 timer.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
        <label htmlFor="quote-postal" className="sr-only">Postnummer</label>
        <input
          id="quote-postal"
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="Postnummer"
          value={postal}
          onChange={(e) => setPostal(e.target.value)}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-40"
        />
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-foreground px-6 text-sm font-semibold text-background hover:opacity-90"
        >
          Start tilbud →
        </button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Gratis & uforpligtende · Du modtager ikke spam
      </p>
    </form>
  );
};

export default InlineQuoteTeaser;