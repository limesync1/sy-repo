import { defineBlogPost } from "../defineBlogPost";

/**
 * SKABELON til nye blogopslag — kopiér denne fil, døb den om, og tilpas.
 *
 * Trin:
 *   1. Tilføj slug + metadata i `src/pages/blog/blogPosts.ts`.
 *   2. Kopiér denne fil til fx `MinNyeArtikel.tsx` og udfyld felterne.
 *   3. Registrér ruten i `src/App.tsx` (lazyRoute + <Route>).
 *   4. Tilføj URL'en i `public/sitemap.xml`.
 *
 * SEO (Article, BreadcrumbList, FAQPage JSON-LD) og hero håndteres
 * automatisk af defineBlogPost — du skal ikke skrive noget af det selv.
 */

const MinNyeArtikel = defineBlogPost({
  slug: "min-nye-artikel-slug",
  keywords: "kommasepareret, søgeord, til SEO",

  // Renderes både som <h2>FAQ</h2>-sektion OG som FAQPage JSON-LD til Google.
  faq: [
    { q: "Et spørgsmål?", a: "Et klart svar i 1–3 sætninger." },
  ],

  // Indhold. Tre måder at angive sektionsindhold på — kombinér frit.
  sections: [
    {
      heading: "Indledning",
      paragraphs: [
        "Første afsnit som almindelig tekst.",
        "Andet afsnit.",
      ],
    },
    {
      heading: "Punkter at huske",
      list: ["Punkt et", "Punkt to", "Punkt tre"],
    },
    {
      heading: "Trin-for-trin",
      ordered: ["Først ...", "Dernæst ...", "Til sidst ..."],
    },
  ],
});

export default MinNyeArtikel;