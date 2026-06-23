// Metadata for alle blogartikler. Bruges af både /blog index, sitemap
// og individuelle artikelsider, så vi har én sandhed.

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  updatedAt?: string;
  readingMinutes: number;
  category: string;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "saadan-vaelger-du-rengoeringsfirma",
    title: "Sådan vælger du det rigtige rengøringsfirma — 9 ting du skal tjekke",
    description:
      "Komplet guide: certificeringer, forsikring, kontrakter, kvalitetskontrol og typiske faldgruber når du vælger rengøringsfirma til hjem eller virksomhed.",
    publishedAt: "2026-06-15",
    readingMinutes: 11,
    category: "Rengøring",
  },
  {
    slug: "tjekliste-til-flyttedag",
    title: "Tjekliste til flyttedag — alt du skal huske før, under og efter flytningen",
    description:
      "Praktisk flyttejekliste: 8 uger før, ugen op til, selve dagen og den første uge i det nye hjem. Inkl. adresseflyt, forsikring og opsigelser.",
    publishedAt: "2026-06-10",
    readingMinutes: 13,
    category: "Flyttehjælp",
  },
  {
    slug: "boligjob-fradrag-2026",
    title: "BoligJob-fradraget 2026 — komplet guide til hvad du kan trække fra",
    description:
      "Hvad må du trække fra i 2026? Beløbsgrænser, hvem kan bruge fradraget, krav til betaling og dokumentation — samt eksempler for rengøring, håndværker og have.",
    publishedAt: "2026-06-05",
    readingMinutes: 9,
    category: "Økonomi",
  },
  {
    slug: "saadan-vaelger-du-maler",
    title: "Sådan vælger du den rette maler — pris, proces og faldgruber",
    description:
      "Få styr på malerpriser, proces, forsikring og typiske faldgruber inden du booker en maler — både til lejlighed, hus og erhverv.",
    publishedAt: "2026-06-25",
    readingMinutes: 10,
    category: "Maler",
  },
  {
    slug: "vvs-akut-foer-installatoeren-kommer",
    title: "VVS-akut: hvad gør du før installatøren kommer?",
    description:
      "Sprunget vandrør, tilstoppet afløb eller stoppet toilet? Her er trin-for-trin hvad du skal gøre — og hvad du IKKE skal gøre — inden VVS'eren ankommer.",
    publishedAt: "2026-06-28",
    readingMinutes: 8,
    category: "VVS",
  },
  {
    slug: "hvornaar-skal-du-have-autoriseret-elektriker",
    title: "Hvornår skal du have en autoriseret elektriker?",
    description:
      "Hvilke elinstallationer må du selv lave i 2026, og hvad kræver en autoriseret elektriker? Få reglerne, sikkerhedstjeklisten og prisniveauet.",
    publishedAt: "2026-07-02",
    readingMinutes: 9,
    category: "Elektriker",
  },
  {
    slug: "aarshjul-for-haveservice",
    title: "Årshjul for haveservice — hvornår skal hvad gøres?",
    description:
      "Klip, beskæring, gødning, løvfald og vintersikring — komplet månedligt årshjul så din have ser velholdt ud hele året.",
    publishedAt: "2026-07-05",
    readingMinutes: 11,
    category: "Haveservice",
  },
  {
    slug: "vinduespudser-eller-selv",
    title: "Vinduespudser eller selv — hvad betaler sig egentlig?",
    description:
      "Hvad koster en vinduespudser pr. vindue, hvor ofte bør vinduer pudses, og hvornår betaler det sig at gøre det selv? Realistisk regnestykke og tjekliste.",
    publishedAt: "2026-07-08",
    readingMinutes: 7,
    category: "Vinduespudsning",
  },
  {
    slug: "tomrerprojekt-hjemme-trin-for-trin",
    title: "Tømrerprojekt hjemme — fra idé til færdig opgave",
    description:
      "Trin-for-trin guide: planlæg, indhent tilbud, vælg tømrer, byggetilladelse, kontrakt, afleveringsforretning og 1-års gennemgang.",
    publishedAt: "2026-07-12",
    readingMinutes: 12,
    category: "Tømrer",
  },
];

export const findBlogPost = (slug?: string) =>
  BLOG_POSTS.find((p) => p.slug === slug?.toLowerCase());