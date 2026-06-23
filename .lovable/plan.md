# SEO-plan for serviceydere.dk

## Hvor vi står i dag (Semrush, DK)
- Domænet rangerer pt. på **2 keywords** med ~0 trafik/md — siden er reelt ikke etableret i Google endnu.
- Vi har masser af indhold (29 blogposts, 18 prisguides, by-sider), men:
  - **sitemap.xml** indeholder kun 50 URLs — mange nye opslag og guides er ikke listet → Google opdager dem langsommere.
  - Konkurrenter (3byggetilbud, anmeld-haandvaerker, haandvaerker.dk) henter trafik på landingssider for **håndværkerfradrag (5.400/md), nyt tag (1.600/md), nyt badeværelse (720/md), varmepumpe (880/md)** — alt sammen lav KDI (15–28). Vi har ingen optimerede sider på disse.
  - Pricing-guides mangler `Service`/`HowTo`/`Offer`-schema og brødkrummer i JSON-LD.
  - Forsiden mangler `WebSite` med `SearchAction` (Google sitelinks-searchbox) og `LocalBusiness`-schema.
  - Ingen automatiseret "Relaterede artikler"-blok → svag intern linking mellem blog↔guides.

## Hvad planen gør

### 1. Nye SEO-landingssider (høj volumen, lav KDI)
Bygges via eksisterende `defineGuidePage`-factory så design/FAQ/JSON-LD er 1:1 med resten.

| Rute | Mål-keyword | Volumen | KDI |
|---|---|---|---|
| `/priser/varmepumpe` | varmepumpe pris | 880 | 23 |
| `/priser/nyt-tag` | nyt tag pris | 1.600 | 28 |
| `/priser/nyt-badevaerelse` | nyt badeværelse pris | 720 | 15 |
| `/priser/vinduesudskiftning` | udskiftning af vinduer pris | 210 | 15 |
| `/priser/anlaegsgartner` | anlægsgartner pris | 110 | 17 |
| `/priser/kloakmester` | kloak pris | 30 | 3 |
| `/guides/haandvaerkerfradrag-2026` | håndværkerfradrag | 5.400 | 28 |
| `/guides/servicefradrag-2026` | servicefradrag | 1.900 | 23 |
| `/tilbud/haandvaerker` | håndværker tilbud | 1.600 | 16 |
| `/tilbud/maler` | maler tilbud | 260 | 32 |
| `/tilbud/vvs` | vvs tilbud | 260 | 25 |
| `/tilbud/elektriker` | elektriker tilbud | 140 | 23 |
| `/tilbud/flyttefirma` | flyttefirma tilbud | 90 | 24 |

Hver side: hero med postnummer-CTA der bærer kategori videre, pristabel, proces, FAQ (mindst 5 spørgsmål) og intern link-blok til relaterede guides/byer.

### 2. Udvidet structured data
- **index.html**: tilføj `WebSite`+`SearchAction` (sitelinks searchbox), `Organization` med logo + samme `sameAs`, samt `LocalBusiness` for hovedadressen.
- **defineGuidePage**: tilføj `Service`-schema (provider=Serviceydere, areaServed=DK, offers med priceRange fra tabellen) oven i Article+FAQ+Breadcrumb.
- **BlogArticleLayout**: tilføj `image` (hero) og `wordCount` til Article-schema; tilføj `HowTo` når sektioner indeholder `ordered`-trin.
- **By-sider**: tilføj `Service` med `areaServed` = by, så lokale forespørgsler matcher.

### 3. Intern linking + "Relaterede"
- Ny komponent `RelatedContent` der ud fra kategori automatisk viser 3 relaterede prisguides + 3 blogartikler — indsættes i `BlogArticleLayout` og `defineGuidePage` lige før footer-CTA.
- `BlogIndex` og `GuidesIndex`: tilføj kategorifiltre + længere meta-beskrivelser med søgeord.
- Footer: tilføj "Populære prisguides" og "Populære byer"-kolonne for SEO-juice på alle sider.

### 4. Sitemap + discovery
- Migrér fra hånd-vedligeholdt `public/sitemap.xml` til `scripts/generate-sitemap.ts` der auto-genererer fra route-tabellen (statiske routes + alle blog/guide/by-data-arrays). Hookes på `predev`/`prebuild`.
- Bekræft at `robots.txt` allerede peger på både statisk og dynamisk (virksomheds-)sitemap — beholdes.
- Tilføj `<lastmod>` baseret på `updatedAt` fra hver post/guide.

### 5. Meta- og indholds-finpudsning
- Audit alle eksisterende `SEO`-kald: sørg for unik `title` ≤60 tegn, `description` 140–160 tegn, og `keywords` med primær + 3–5 long-tail.
- `og:image` pr. blogpost: brug postens hero-billede frem for default social-billede.
- Tilføj `<link rel="prev/next">` på paginerede lister (`/blog`, `/virksomheder`).

### 6. Performance/Core Web Vitals quick wins
- Lazy-load `Footer` (allerede gjort) — gør tilsvarende for tunge under-fold-sektioner på guides.
- Tilføj `loading="lazy"` + `decoding="async"` på alle ikke-hero-billeder.
- Preload hero-font kun for headings der vises above-the-fold.

### 7. Markér eksisterende SEO-finding som løst
Efter `/priser/varmepumpe` er live → `update_findings` for `agent_content:semrush_content_suggestions`.

## Teknisk plan (filer)

- **Nye guides** (13 stk): `src/pages/guides/HeatPumpPriceGuide.tsx`, `NewRoofPriceGuide.tsx`, `BathroomPriceGuide.tsx`, `WindowReplacementPriceGuide.tsx`, `LandscaperPriceGuide.tsx`, `SewerPriceGuide.tsx`, `CraftsmanTaxDeduction2026.tsx`, `ServiceTaxDeduction2026.tsx`, samt 5 tilbuds-landingssider under `src/pages/quotes/`.
- **Schema**: udvid `src/components/SEO.tsx` (ingen ændring), men opdatér `index.html`, `BlogArticleLayout.tsx`, `defineGuidePage.tsx`, by-side-templates.
- **Komponent**: `src/components/content/RelatedContent.tsx` (læser fra `blogPosts.ts` + ny `guides.ts`-index).
- **Footer**: udvid `src/components/landing/Footer.tsx`.
- **Sitemap**: `scripts/generate-sitemap.ts` + `package.json` (`predev`/`prebuild`), erstat statisk `public/sitemap.xml` med generator-output (genereres fra blogPosts/guides-indekser, ikke håndredigeret).
- **Routes**: registrér alle nye sider i `src/App.tsx`.

## Forventet effekt (3–6 mdr)
Samlet adresserbar volumen for de nye sider: **~12.000 søgninger/md**. Med realistisk position 5–15 på 30–40% af keywords kan vi nå ~300–600 organiske besøg/md inden for 6 måneder — forudsat at indholdet publiceres og at autoritet vokser via konsistent udgivelse.
