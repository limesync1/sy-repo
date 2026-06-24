# Plan: Fase 4 — Fra 253 sider til indeksering, autoritet og konvertering

## Status lige nu
- **Indhold**: 253+ indekserbare URLs, 5 emne-hubs, 50+ prisguides, 25+ bysider.
- **Teknisk**: Sitemap er opdelt i pages/blog/guides/cities, `robots.txt` peger på `sitemap-index.xml`, dynamisk sitemap via backend.
- **SEO-synlighed**: Semrush viser 2 organiske keywords, ~0 est. trafik/måned, Authority Score 2/100, 52 backlinks fra 36 domæner (mange lavkvalitet). Det betyder: vi har **masser af indhold, men næsten ingen autoritet** til at få det indekseret og rangeret.

## Anbefalet fokus de næste 4 uger

### Uge 9 — Teknisk indekseringsaudit (få mest ud af det eksisterende)
1. **Google Search Console status-tjek**
   - Tjek coverage for `sitemap-index.xml`, `sitemap-blog.xml`, `sitemap-guides.xml`, `sitemap-cities.xml`.
   - Identificer "Discovered – currently not indexed" / "Crawled – currently not indexed".
   - Resubmit fejlende sitemaps og enkelte URLs.
2. **Schema- og on-page QA**
   - Validér FAQ-schema på alle nye prisguides og bysider.
   - Tilføj synlige breadcrumbs (UI) på blog, guides og bysider — udover JSON-LD.
   - Audit alt-tekster, `loading="lazy"`, canonicals og H1-struktur.
3. **Orphan-page-detektion**
   - Kør et script over `blogPosts.ts`, `guidesRegistry.ts`, by-data og sitemap for at finde sider med < 3 interne links.
   - Tilføj "Læs også"-klynger til de svageste sider.

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