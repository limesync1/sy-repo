import { comparisonBySlug, type Comparison } from "./comparisons";

export type Answers = { work: string; team: string; needs: string[]; current: string; priority?: string };

export const WORK = [
  { id: "routes", label: "Faste besøg på ruter", hint: "Fx vinduespudsning, rengøring, have" },
  { id: "mixed", label: "Både faste besøg og enkeltopgaver", hint: "Fx service, vicevært, skadedyr" },
  { id: "projects", label: "Mest større sager og projekter", hint: "Fx håndværk, VVS, el" },
];
export const TEAM = [
  { id: "solo", label: "Kun mig", hint: "Selvstændig" },
  { id: "small", label: "2-5 personer", hint: "Lille team" },
  { id: "medium", label: "6-20 personer", hint: "Flere hold" },
  { id: "large", label: "Over 20 personer", hint: "Flere afdelinger" },
];
export const PRIORITY = [
  { id: "simple", label: "Det skal være nemt", hint: "Hurtigt i gang, få klik" },
  { id: "price", label: "Lav pris", hint: "Betal kun for det, du bruger" },
  { id: "growth", label: "Flere kunder", hint: "Vækst og nye opgaver" },
  { id: "control", label: "Fuldt overblik", hint: "Styr på hold, tid og fakturaer" },
];

/** have=true: Serviceydere har det. Ellers ærlig tekst om, hvad vi mangler. */
export const NEEDS: { id: string; label: string; have: boolean; text: string; why: string }[] = [
  { id: "optimize", label: "Ruteplanlægning med kort", have: true, text: "Ruteplanlægning med kort og optimering af rækkefølgen", why: "Mindre kørsel og flere besøg pr. dag." },
  { id: "app", label: "App til medarbejdere", have: true, text: "Medarbejder-app med stopliste og manuel tidsregistrering", why: "Medarbejderne ser dagens stop og registrerer selv tid." },
  { id: "offline", label: "Virker uden internet", have: true, text: "Udførte besøg gemmes og sendes, når nettet er tilbage", why: "Intet går tabt i kældre eller på landet." },
  { id: "photo", label: "Billedbevis ved besøg", have: true, text: "Billedbevis på hvert besøg", why: "Færre klager, fordi du kan vise, at arbejdet er gjort." },
  { id: "accounting", label: "e-conomic eller Dinero", have: true, text: "Fakturaer direkte til e-conomic eller Dinero, med interval pr. kunde", why: "Ingen dobbelt indtastning af fakturaer." },
  { id: "leads", label: "Flere nye kunder", have: true, text: "Nye kunder via Serviceyderes markedsplads", why: "Andre ruteprogrammer har ikke en markedsplads med kunder." },
  { id: "booking", label: "Online booking", have: true, text: "Kunder kan booke og få pris online", why: "Kunder booker selv, også uden for åbningstid." },
  { id: "sms", label: "SMS til kunder", have: true, text: "SMS-beskeder til kunder", why: "Kunderne ved, hvornår du kommer." },
  { id: "mobilepay", label: "MobilePay", have: true, text: "MobilePay via dit regnskabsprogram: tilkobl det i e-conomic eller Dinero, så kan fakturaerne betales med MobilePay", why: "Hurtigere betaling uden ekstra program." },
  { id: "bookkeeping", label: "Bogføring i samme program", have: false, text: "Egen bogføring har vi ikke. Den sker i e-conomic eller Dinero, som mange revisorer foretrækker.", why: "" },
  { id: "materials", label: "Materialer og grossister", have: true, text: "Materialer på opgaver, prisfiler fra grossister og kvalitetssikring med tjeklister (håndværksbrancher)", why: "Materialer kommer med på fakturaen." },
  { id: "ios", label: "App til iPhone", have: false, text: "iPhone-appen er på vej. Indtil da bruges medarbejderpanelet i iPhonens browser.", why: "" },
];

const FIT: Record<string, string> = { solo: "dig, der arbejder alene", small: "et lille team", medium: "en voksende virksomhed", large: "en større virksomhed" };

export type Reason = { title: string; text: string };

export type FinderResult = {
  fitLabel: string; intro: string; score: number; reasons: Reason[];
  matched: string[]; gaps: string[]; from: Comparison | null;
};

/** Beregner et ærligt match (0-100) og konkrete grunde ud fra svarene. */
export function finderResult(a: Answers): FinderResult {
  const chosen = NEEDS.filter((n) => a.needs.includes(n.id));
  const picked = chosen.filter((n) => n.have);
  const gapsN = chosen.filter((n) => !n.have);
  const matched = (picked.length ? picked : NEEDS.filter((n) => n.have).slice(0, 4)).map((n) => n.text);
  const gaps = gapsN.map((n) => n.text);

  let score = a.work === "projects" ? 72 : a.work === "mixed" ? 86 : 93;
  if (a.team === "large") score -= 3;
  if (chosen.length) score += Math.round((picked.length / chosen.length - 0.8) * 20);
  score = Math.max(55, Math.min(98, score));

  const reasons: Reason[] = [];
  if (a.work === "routes") reasons.push({ title: "Bygget til faste ruter", text: "Gentagne besøg, intervaller og ruter er kernen i Serviceydere – ikke et tilvalg." });
  if (a.work === "mixed") reasons.push({ title: "Faste besøg og enkeltopgaver samme sted", text: "Enkeltopgaver lægges ind på dagens rute, så du ikke skal bruge to systemer." });
  if (a.work === "projects") reasons.push({ title: "Også til sager – men ærligt sagt stærkest på ruter", text: "Du får materialer, kvalitetssikring og fakturering. Store projekter med budget og etaper er ikke vores fokus." });
  if (a.team === "solo") reasons.push({ title: "Nemt alene", text: "Du kan planlægge, køre og fakturere fra mobilen uden at sætte et helt team op." });
  if (a.team === "small" || a.team === "medium") reasons.push({ title: "Styr på holdet", text: "Fordel stop med træk-og-slip, se hvem der er i gang, og meld sygdom eller ferie i ruteplanlæggeren." });
  if (a.team === "large") reasons.push({ title: "Mange medarbejdere", text: "Flere ruter pr. dag, medarbejder-app og samlede fakturaer. Spørg kundeservice om opsætning af flere afdelinger." });
  if (a.priority === "simple") reasons.push({ title: "Hurtigt i gang", text: "Kundeservice flytter dine data gratis, så du kan starte uden at taste alt ind igen." });
  if (a.priority === "price") reasons.push({ title: "14 dage gratis", text: "Prøv alt i 14 dage uden kreditkort og uden binding, før du bestemmer dig." });
  if (a.priority === "growth") reasons.push({ title: "Nye kunder indbygget", text: "Din virksomhed kan findes af kunder på Serviceyderes markedsplads." });
  if (a.priority === "control") reasons.push({ title: "Fuldt overblik", text: "Tid, besøg, billedbevis og fakturaer hænger sammen, så intet falder mellem to stole." });
  for (const n of picked.slice(0, 3)) reasons.push({ title: n.label, text: n.why });

  const intro =
    a.work === "projects"
      ? "Serviceydere er stærkest til faste, gentagne besøg. Laver du mest store sager, får du stadig planlægning, app, materialer og fakturering samlet – og nye kunder via markedspladsen."
      : "Du har faste besøg, og det er netop det, Serviceydere er bygget til: ruter, medarbejder-app, fakturering og nye kunder samlet ét sted, uden binding.";
  return { fitLabel: FIT[a.team] ?? "din virksomhed", intro, score, reasons, matched, gaps, from: comparisonBySlug(a.current) ?? null };
}
