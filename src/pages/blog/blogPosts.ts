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
];

export const findBlogPost = (slug?: string) =>
  BLOG_POSTS.find((p) => p.slug === slug?.toLowerCase());