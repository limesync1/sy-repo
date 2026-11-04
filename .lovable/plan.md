# Bysider med rigtigt lokalt indhold + samlet SEO-plan

## Del 1: De første bysider med rigtigt lokalt indhold

Bysiderne findes allerede (fx /elektriker/koebenhavn, /by/aarhus), men teksten bygger på generelle beskrivelser. Google belønner sider med fakta, der kun passer til netop den by. Vi starter med de 10 største byer: København, Frederiksberg, Aarhus, Odense, Aalborg, Esbjerg, Randers, Kolding, Vejle og Horsens.

Hver byside får:
1. **Faktaboks om byen** med tal fra Danmarks Statistik (indbyggertal, antal boliger, andel parcelhuse/lejligheder/rækkehuse, boligernes alder). Kilde og årstal vises under boksen.
2. **"Det betyder det for dig"** — kort tekst pr. branche, der bruger tallene (fx mange ældre etageejendomme → flere opgaver med trapper og gårdadgang). Kun konklusioner, der følger direkte af tallene.
3. **Udbydere i området** — rigtige virksomheder på Serviceydere, der dækker byen (fra jeres egne data). Ingen falske navne; tom liste vises ikke.
4. **Lokal prisvejledning** — kun det eksisterende gennemsnitsbaserede interval (som i guiderne), aldrig præcise tal.
5. **Nabobyer og bydele** — links til nærliggende bysider og "Andre services i byen".
6. **Sidst opdateret-dato** og LocalBusiness-/Service-markering til Google.

Bagefter: sitemappet får opdaterede datoer for de 10 byer, siderne sendes til Google til indeksering, og den månedlige rapport får en sektion "Bysider" (visninger, klik, placering).

## Del 2: Fuld SEO-plan for Serviceydere

| # | Område | Hvad | Hvornår |
|---|---|---|---|
| 1 | Bysider | De 10 byer ovenfor; derefter de næste 20 byer, når de første viser visninger | Nu, så efter 4-6 uger |
| 2 | Side 2 → side 1 | Motoren udbygger sider på plads 8-20 to gange om ugen (kører) | Løbende |
| 3 | Klikrate | Onsdagstjek af sider med mange visninger og få klik (kører) | Løbende |
| 4 | Branchesider for virksomheder | "Software til vinduespudsere" osv. får skærmbilleder, gratis dataflytning og e-conomic/Dinero tydeligt | Næste |
| 5 | Sammenligningssider | "Serviceydere vs. SkvizBiz / Fenster" og "Alternativ til ..." — ærlige, faktabaserede | Næste |
| 6 | Gratis værktøjer | Prisberegner for vinduespudsning, ruteplanlægnings-skabelon m.m. — sider andre linker til | Senere |
| 7 | AI-søgning | "Kort svar" øverst i alle håndskrevne artikler, udvidet llms.txt | Senere |
| 8 | Teknik | Ugentligt tjek af døde links og fejlsider, mobilhastighed på bysider | Senere |
| 9 | Uden for siden | Google Virksomhedsprofil, Trustpilot, e-conomic/Dinero app-markedspladser (kræver dig) | Når du har tid |
| 10 | Måling | Rapporten viser bysider, virksomhedssider og artikler hver for sig | Med del 1 |

Mål for 3 måneder: flere visninger på bysider og virksomhedssider, flere sider på side 1, og flere tilmeldinger via "Opret virksomhed gratis".

## Tekniske detaljer
- Ny `src/pages/cities/cityStats.ts` med verificerede DST-tal (tabeller BY1/BOL101), kilde og årstal pr. by; test der fejler, hvis en af de 10 byer mangler tal eller kilde.
- Udbyderliste hentes fra offentlige virksomhedsdata filtreret på dækningsområde; prerender får samme liste ved build, så browser og HTML matcher.
- Fælles `CityFactsBox` bruges i `TradeCityPage`, `CleaningCityPage`, `GardenCityPage`, `MovingCityPage`, `HandymanCityPage`, `CityHubPage` og `staticBodies.tsx`.
- `lastmod` for berørte URL'er opdateres; sitemap indsendes via Search Console.
- `seo-monthly-report` får sektion for stier under bysider.
- Kører SEO-tjek, prerender-tests og Playwright på 390/1280 px før udgivelse.
