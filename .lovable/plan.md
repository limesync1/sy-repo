
# SEO-plan: Næste fase (Uge 6–8)

Vi har nu 208 indekserbare URLs, stærke prisguides og link-klynger. For at slå konkurrenterne (happyhelper.dk, servicefinder.dk m.fl.) fokuserer næste fase på **lokal dominans**, **emne-hubs** og **teknisk SEO-løft**.

## Uge 6 — Sekundære byer (25 nye sider)

Lokale landingssider for byer vi mangler. Hver side: H1 med by+service, lokalt prisniveau, FAQ, "Læs også"-cluster mod hovedguides.

**Byer**: Esbjerg, Kolding, Vejle, Horsens, Randers, Roskilde, Helsingør, Næstved, Holstebro, Silkeborg, Herning, Frederiksberg, Frederikshavn, Hillerød, Slagelse.

**Sider** (kombination by × service):
- 10× rengøring i sekundære byer (`/rengoering/<by>`)
- 8× flyttehjælp i sekundære byer
- 7× håndværker/havemand-priser i sekundære byer

Udvider `cleaningCityData.ts`, `movingCityData.ts`, `handymanCityData.ts`, `gardenCityData.ts`.

## Uge 7 — Emne-hubs + sammenligningsguides (20 nye sider)

**5 Hub-sider** (pillar pages med 30+ interne links):
- `/guides/rengoering` — alt om rengøring (samler 40+ prisguides/artikler)
- `/guides/flytning`
- `/guides/haandvaerker`
- `/guides/have`
- `/guides/priser-2026` — master price index

**15 Sammenligningsguides** (high-intent, low-competition):
- "Serviceydere vs. Happyhelper", "vs. Servicefinder", "vs. HelpHelper"
- "Fast pris vs. timepris", "Privat vs. firma-rengøring"
- "Bedste rengøringsfirma i KBH/Aarhus/Odense/Aalborg" (top-lister)
- "Billigste vs. dyreste flyttefirma — hvad får du?"
- Plus 7 service-vs-service sammenligninger

## Uge 8 — Teknisk SEO + autoritet

1. **Schema-udvidelse**: Tilføj `LocalBusiness`, `Service`, `AggregateRating` og `Offer` schema på by-sider og hub-sider.
2. **Breadcrumbs**: Synlige breadcrumbs på alle blog-/by-sider (vi har JSON-LD, men ikke UI).
3. **Image SEO**: Alt-tekster + `loading="lazy"` audit, WebP-konvertering af tunge billeder.
4. **Internal linking-audit**: Sikre at hver side har min. 3 indgående links fra relevante sider (orphan-detektion via script).
5. **Core Web Vitals**: Lighthouse-tjek af top 20 trafiksider, fix CLS/LCP-problemer.
6. **Sitemap-opdeling**: Split `sitemap.xml` i `sitemap-blog.xml`, `sitemap-cities.xml`, `sitemap-pages.xml` + index — bedre crawl-budget.
7. **GSC-monitorering**: URL-inspection script til at tracke index-coverage af de 250+ sider, automatisk re-submit ved discovery-fejl.

## Slut-tilstand efter uge 8

- ~260 indekserbare URLs (fra 208)
- 5 hub-sider der centraliserer topical authority
- Komplet dækning af DK's top 20 byer × 4 hovedservices
- Sammenligningssider der fanger bottom-funnel kommercielle queries
- Teknisk fundament klar til skalering mod 500+ sider

## Teknisk note

Følger eksisterende mønstre: `defineBlogPost`-factory, `BlogArticleLayout`, lazy-loaded routes i `blogPosts.ts`, sitemap regenereres via `scripts/generate-sitemap.ts` og resubmittes til GSC via gateway-API.

---

**Skal jeg starte med uge 6 (sekundære byer) eller springe til uge 7 (hubs+sammenligninger) — eller køre alle tre uger i træk?**
