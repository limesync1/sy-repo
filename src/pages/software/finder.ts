import { comparisonBySlug, type Comparison } from "./comparisons";

export type Answers = { work: string; team: string; needs: string[]; current: string };

export const WORK = [
  { id: "routes", label: "Faste besøg på ruter (fx vinduespudsning, rengøring, have)" },
  { id: "mixed", label: "Både faste besøg og enkeltopgaver" },
  { id: "projects", label: "Mest større sager og projekter (fx håndværk)" },
];
export const TEAM = [
  { id: "solo", label: "Kun mig" },
  { id: "small", label: "2-5 personer" },
  { id: "medium", label: "6-20 personer" },
  { id: "large", label: "Over 20 personer" },
];

/** have=true: Serviceydere har det. gap: ærlig tekst når vi ikke har det. */
export const NEEDS: { id: string; label: string; have: boolean; text: string }[] = [
  { id: "optimize", label: "Ruteplanlægning med kort", have: true, text: "Ruteplanlægning med kort og optimering af rækkefølgen" },
  { id: "app", label: "App til medarbejdere", have: true, text: "Medarbejder-app med stopliste og manuel tidsregistrering" },
  { id: "offline", label: "Virker uden internet", have: true, text: "Udførte besøg gemmes og sendes, når nettet er tilbage" },
  { id: "photo", label: "Billedbevis ved besøg", have: true, text: "Billedbevis på hvert besøg" },
  { id: "accounting", label: "e-conomic eller Dinero", have: true, text: "Fakturaer direkte til e-conomic eller Dinero, med interval pr. kunde" },
  { id: "leads", label: "Flere nye kunder", have: true, text: "Nye kunder via Serviceyderes markedsplads" },
  { id: "booking", label: "Online booking", have: true, text: "Kunder kan booke og få pris online" },
  { id: "sms", label: "SMS til kunder", have: true, text: "SMS-beskeder til kunder" },
  { id: "mobilepay", label: "MobilePay", have: true, text: "MobilePay via dit regnskabsprogram: tilkobl det i e-conomic eller Dinero, så kan fakturaerne betales med MobilePay" },
  { id: "bookkeeping", label: "Bogføring i samme program", have: false, text: "Egen bogføring har vi ikke. Den sker i e-conomic eller Dinero, som mange revisorer foretrækker." },
  { id: "materials", label: "Materialer og grossister", have: true, text: "Materialer på opgaver, prisfiler fra grossister og kvalitetssikring med tjeklister (håndværksbrancher)" },
  { id: "ios", label: "App til iPhone", have: false, text: "Appen er til Android. På iPhone bruges panelet i browseren." },
];

const FIT: Record<string, string> = { solo: "dig, der arbejder alene", small: "et lille team", medium: "en voksende virksomhed", large: "en større virksomhed" };

export function finderResult(a: Answers): {
  fitLabel: string; intro: string; matched: string[]; gaps: string[]; from: Comparison | null;
} {
  const chosen = NEEDS.filter((n) => a.needs.includes(n.id));
  const picked = chosen.filter((n) => n.have);
  const matched = (picked.length ? picked : NEEDS.filter((n) => n.have).slice(0, 4)).map((n) => n.text);
  const gaps = chosen.filter((n) => !n.have).map((n) => n.text);
  const intro =
    a.work === "projects"
      ? "Serviceydere er stærkest til faste, gentagne besøg. Laver du mest store sager, får du stadig planlægning, app og fakturering samlet – og nye kunder via markedspladsen, som andre ruteprogrammer ikke har."
      : "Du har faste besøg, og det er netop det, Serviceydere er bygget til: ruter, medarbejder-app, fakturering og nye kunder samlet ét sted, uden binding.";
  return { fitLabel: FIT[a.team] ?? "din virksomhed", intro, matched, gaps, from: comparisonBySlug(a.current) ?? null };
}
