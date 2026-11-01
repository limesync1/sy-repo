export type LegacyCityKind = "rengoering" | "flyttehjaelp" | "haandvaerker" | "haveservice";
const LABELS: Record<LegacyCityKind, string> = {
  rengoering: "Rengøring", flyttehjaelp: "Flyttehjælp", haandvaerker: "Håndværker", haveservice: "Haveservice",
};

export function citySeo(kind: LegacyCityKind, city: { slug: string; name: string; hourlyLow: number; hourlyHigh: number }) {
  const label = LABELS[kind];
  return {
    path: `/${kind}/${city.slug}`,
    title: `${label} i ${city.name} – Priser og tilbud | Serviceydere`,
    description: `${label} i ${city.name}: typisk ${city.hourlyLow.toLocaleString("da-DK")}–${city.hourlyHigh.toLocaleString("da-DK")} kr./time. Se vejledende priser, sammenlign firmaer og få op til 3 gratis tilbud.`,
    parent: ["/by", "Find serviceydere i din by"] as [string, string],
  };
}