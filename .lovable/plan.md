# Plan: Fase 4 — Fra 253 sider til indeksering, autoritet og konvertering

## Status (opdateret juni 2026)
- **Indhold**: 253+ indekserbare URLs, 5 emne-hubs, 50+ prisguides, 25+ bysider.
- **Teknisk**:
  - Sitemap opdelt i pages/blog/guides/cities, robots → `sitemap-index.xml`.
  - GSC: forside er **indekseret** (PASS, "Submitted and indexed"). Gammel `sitemap.xml` slettet i GSC, sitemap-index registreret som SitemapsIndex (errors:0).
  - Børne-sitemaps resubmittet 2026-06-24; `sitemap-guides.xml` downloadet (29 URLs, 0 indekseret endnu).
  - Organization-schema udvidet med `ProfessionalService`, address, priceRange, image.
  - `RelatedContent` roterer nu deterministisk per side → halen af blog/guides får indgående links.
- **GSC properties**: både `sc-domain:serviceydere.dk` og url-property. Brug sc-domain som master; slet url-property i UI hvis ønsket.
- **SEO-synlighed**: Semrush AS 2/100, 52 backlinks. Stadig autoritets-flaskehals.

## Anbefalet fokus de næste 4 uger

### Uge 9 — Teknisk indekseringsaudit
1. **GSC status-tjek** — ✅ DONE: sitemap-cleanup + resubmit kørt. Næste: tjek coverage-rapport om 5-7 dage for "Discovered – not indexed".
2. **Schema- og on-page QA**
   - ✅ Organization → ProfessionalService udvidet på forsiden.
   - TODO: Validér FAQ-schema via Rich Results Test på 5 sample-guides.
   - TODO: Tilføj synlige breadcrumbs (UI) på blog/guides/bysider — JSON-LD findes allerede.
   - TODO: Audit alt-tekster + `loading="lazy"`.
3. **Orphan-page-detektion**
   - ✅ `RelatedContent` roterer nu per side, så hver post/guide får ~3x flere indgående.
   - Kør `bunx tsx scripts/audit-orphans.ts` igen efter næste deploy for ny baseline.
   - Kør `scripts/indexnow-ping.ts` efter hver ny batch indhold.

### Uge 10 — Autoritetsbygning (backlinks + E-E-A-T)
1. **Lokale og branche-relevante citations**
   - Sikre ensartet NAP/firmaprofil på Krak, De Gule Sider, Trustpilot, LinkedIn, CVR, Proff.
   - Tilføj `Organization` og `LocalBusiness` schema på forsiden og kontaktside.
2. **Kvalitetslink-prospektering**
   - Gæsteindlæg på 3-5 danske bolig/renovering-blogs.
   - HARO / danske journalist-pitch-tjenester for ekspertcitat.
   - Partnerskaber med leverandører/brancheforeninger.
3. **Ryd op i lavkvalitetslinks**
   - Analysér de nuværende 52 links; disavow spamdomæner hvis nødvendigt.

### Uge 11 — Konverteringsoptimering på det nye indhold
1. **Ensartet CTA-blok på alle prisguides/hubs**
   - "Få 3 tilbud på [service] i [by]" med by/service dynamik.
2. **Lokal "søg hjælp" widget**
   - På bysider og hubs: dropdown/by + service → quote-flow.
3. **Trust-signals**
   - Anmeldelser, garantier, "vælg firma med forsikring" blokke på landingssider.
4. **Mobil UX**
   - Fold-ud FAQ, sticky CTA, hurtigere navigation mellem relaterede guides.

### Uge 12 — Indholdspleje + konkurrent-gap
1. **Opdater gamle guides**
   - Opdater `updatedAt` og priser på de første 20-30 guides.
   - Konsolider sider med < 300 ord.
2. **Content-gap vs konkurrenter**
   - Analysér HappyHelper, Servicefinder, 3byggetilbud og andre.
   - Identificér 10-15 nye "sådan vælger du" / "spørgsmål før du bestiller" emner.
3. **Planlæg batch 4**
   - 10-15 nye guides + 10 nye by-/servicekombinationer.

## Teknisk gennemførelse
- **GSC-overvågning**: Supabase Edge Function eller scheduleret job der henter coverage og resubmitter.
- **Intern linking-script**: Node-script baseret på `blogPosts.ts` + `guidesRegistry.ts` + by-data.
- **Schema-validering**: Google Rich Results Test / Schema Markup Validator.
- **Backlink-tracking**: Semrush rapporter (evt. månedligt).

## Succeskriterier (efter 4 uger)
- 90% af URLs i GSC står som "Valid" (ikke Excluded).
- +20 nye kvalitetslinks fra DK-domæner.
- Organisk trafik (Semrush-estimat) > 100/måned.
- CTA-klikrate på guidesider > 2%.

## Valg nu
**A)** Start med uge 9 (teknisk audit + indexation) — anbefalet, da det giver mest værdi af det eksisterende.  
**B)** Spring direkte til uge 10 (autoritetsbygning) hvis du vil have links hurtigst muligt.  
**C)** Kombi: uge 9 + de vigtigste link-aktiviteter fra uge 10 på samme tid.

Vælg A, B eller C, eller sig til hvis planen skal justeres.