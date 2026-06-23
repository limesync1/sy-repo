// Ét samlet register over alle prisguides og how-to guides på siden.
// Bruges af:
//   - GuidesIndex (oversigtsside)
//   - RelatedContent (intern linking på artikler)
//   - scripts/generate-sitemap.ts (auto-genereret sitemap)
// Tilføj en ny guide ÉT sted her, så dukker den op alle relevante steder.

export interface GuideMeta {
  /** URL (canonicalPath). */
  href: string;
  /** Vises i kort og som sitemap-titel. */
  title: string;
  /** Kort beskrivelse til oversigtskort. */
  desc: string;
  /** Kategori-tag, bruges til at finde relateret indhold (skal matche
   *  blog-post-kategorier hvor det giver mening). */
  category: string;
  /** "Prisguide" eller "How-to". */
  tag: "Prisguide" | "How-to";
  /** SEO-prioritet i sitemap (0–1). */
  priority?: string;
  /** ISO dato — bruges som lastmod i sitemap. */
  updatedAt?: string;
}

export const GUIDES: GuideMeta[] = [
  // Eksisterende prisguides
  { href: "/priser/rengoering", title: "Hvad koster rengøring i 2026?", desc: "Komplet prisguide for privat- og erhvervsrengøring — timepris, fast pris og BoligJob-fradrag.", category: "Rengøring", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/flyttehjaelp", title: "Hvad koster flyttehjælp i 2026?", desc: "Priser på flyttefirmaer — pakker, kørsel, opbevaring og typiske flytteeksempler.", category: "Flyttehjælp", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/haandvaerker", title: "Hvad koster en håndværker i timen?", desc: "Timepriser for tømrer, murer, snedker og alm. håndværker — inkl. udkald og BoligJob-fradrag.", category: "Håndværker", tag: "Prisguide", priority: "0.85" },
  { href: "/priser/maler", title: "Maler pris pr. m² i 2026", desc: "Priser pr. m² for vægge, lofter og træværk — indvendigt og udvendigt malerarbejde.", category: "Maler", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/vinduespudser", title: "Vinduespudser pris 2026", desc: "Pris pr. vindue, abonnement vs. engangsbesøg og hvad fradraget betyder for din regning.", category: "Vinduespudsning", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/vvs", title: "VVS pris 2026 — udkald & timepris", desc: "Timepris, akutudkald og typiske opgaver fra dryppende vandhane til varmepumpe.", category: "VVS", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/haveservice", title: "Haveservice priser 2026", desc: "Timepris, abonnement, græsslåning og hækklipning — inkl. BoligJob-fradraget.", category: "Haveservice", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/elektriker", title: "Elektriker pris 2026", desc: "Timepris, udkald, ladestander og typiske el-opgaver fra HFI til ny gruppe.", category: "Elektriker", tag: "Prisguide", priority: "0.85" },
  { href: "/priser/tomrer", title: "Tømrer pris 2026 — timepris & opgaver", desc: "Timepris, terrasser, trapper, carport og tilbygninger — inkl. AB-Forbruger og BoligJob-fradrag.", category: "Tømrer", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/murer", title: "Murer pris 2026 — opmuring & omfugning", desc: "Timepris, opmuring, facadepudsning, omfugning og udbedring af sætningsskader.", category: "Murer", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/gulvlaegger", title: "Gulvlægger pris 2026 — vinyl, laminat & trægulv", desc: "Pris pr. m² på lægning af vinyl, laminat, parket, massivt trægulv og fliser.", category: "Gulvlægger", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/anlaegsgartner", title: "Anlægsgartner pris 2026 — terrasse & havedesign", desc: "Fliseterrasse, træterrasse, hækplantning, bede og dræn — proces og priser.", category: "Anlægsgartner", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/skadedyr", title: "Skadedyrsbekæmpelse pris 2026", desc: "Rotter, mus, hvepse, sølvfisk og bænkebider — pris, anmeldelsespligt og forsikringsdækning.", category: "Skadedyrsbekæmpelse", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/skorstensfejer", title: "Skorstensfejer pris 2026 — lovpligtig fejning", desc: "Gebyr, intervaller for brændeovn, pejs og pillefyr — plus sotbrandinspektion.", category: "Skorstensfejer", tag: "Prisguide", priority: "0.75" },
  { href: "/priser/algebehandling", title: "Algebehandling pris 2026 — tag & facade", desc: "Softwash vs. højtryk, pris pr. m², holdbarhed og hvad du bør have med i tilbuddet.", category: "Algebehandling", tag: "Prisguide", priority: "0.8" },
  { href: "/priser/sikkerhed", title: "Alarm, kameraer & lås — pris 2026", desc: "Alarmsystem, vagtcentral, IP-kameraer og certificeret lås — pris og forsikringskrav.", category: "Sikkerhed", tag: "Prisguide", priority: "0.75" },

  // Nye SEO-landingssider (høj volumen, lav KDI)
  { href: "/priser/varmepumpe", title: "Varmepumpe pris 2026 — luft-til-vand & luft-til-luft", desc: "Hvad koster en varmepumpe installeret? Pris pr. type, tilskud, drift og tilbagebetalingstid.", category: "VVS", tag: "Prisguide", priority: "0.9", updatedAt: "2026-09-26" },
  { href: "/priser/nyt-tag", title: "Nyt tag pris 2026 — tegl, stål & tagpap", desc: "Pris pr. m² for nyt tag i tegl, beton, stål, tagpap og skifer. Inkl. nedrivning, undertag og tagrender.", category: "Håndværker", tag: "Prisguide", priority: "0.9", updatedAt: "2026-09-26" },
  { href: "/priser/nyt-badevaerelse", title: "Nyt badeværelse pris 2026 — totalentreprise & m²-pris", desc: "Hvad koster et nyt badeværelse fra A til Z? Pris pr. m², standard vs. premium og typiske ekstraregninger.", category: "Håndværker", tag: "Prisguide", priority: "0.9", updatedAt: "2026-09-26" },
  { href: "/priser/vinduesudskiftning", title: "Udskiftning af vinduer pris 2026 — pr. vindue & energiruder", desc: "Pris pr. vindue ved udskiftning, forskel på 2- og 3-lags energiruder, og hvilke tilskud du kan få.", category: "Tømrer", tag: "Prisguide", priority: "0.85", updatedAt: "2026-09-26" },
  { href: "/priser/kloakmester", title: "Kloakmester pris 2026 — TV-inspektion, spuling & nye rør", desc: "Hvad koster en kloakmester? Timepris, TV-inspektion, højtryksspuling og udskiftning af kloakledninger.", category: "VVS", tag: "Prisguide", priority: "0.8", updatedAt: "2026-09-26" },
  { href: "/guides/haandvaerkerfradrag-2026", title: "Håndværkerfradrag 2026 — komplet guide", desc: "Hvad må du trække fra som håndværkerfradrag i 2026? Beløbsgrænser, godkendte ydelser og dokumentation.", category: "Økonomi", tag: "How-to", priority: "0.9", updatedAt: "2026-09-26" },
  { href: "/guides/servicefradrag-2026", title: "Servicefradrag 2026 — sådan får du fradrag for serviceydelser", desc: "Servicefradrag for rengøring, vinduespudsning og børnepasning — krav, beløb og digital betaling.", category: "Økonomi", tag: "How-to", priority: "0.9", updatedAt: "2026-09-26" },

  // Eksisterende how-to
  { href: "/guides/rengoering-af-laminatgulv", title: "Rengøring af laminatgulv", desc: "Trin-for-trin guide til skånsom rengøring og vedligehold af laminatgulve — uden striber og skader.", category: "Rengøring", tag: "How-to", priority: "0.7" },
];

export const findGuide = (href: string) => GUIDES.find((g) => g.href === href);

/** Find op til `limit` guides i samme kategori — bruges af RelatedContent. */
export const relatedGuides = (category: string | undefined, excludeHref: string, limit = 3) => {
  if (!category) return GUIDES.filter((g) => g.href !== excludeHref).slice(0, limit);
  const sameCategory = GUIDES.filter((g) => g.category === category && g.href !== excludeHref);
  const others = GUIDES.filter((g) => g.category !== category && g.href !== excludeHref);
  return [...sameCategory, ...others].slice(0, limit);
};