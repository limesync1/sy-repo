# Ens indlæsningsbilleder og hurtigere sider

## Hvad der er nu
- Der findes ét fælles sæt indlæsningsbilleder (sidehoved, kort, lister, tabeller, formularer, kalender, regnskab m.m.), men mange steder bruger det ikke.
- Ca. 80 steder viser stadig en roterende cirkel mens data hentes, og en håndfuld steder har deres egne grå blokke med egne farver og former.
- 33 steder viser intet mens noget hentes, så siden kan hoppe, når indholdet dukker op.

## Del 1: Ens indlæsningsbilleder overalt
1. **Gennemgang** af hver side i virksomheds-, medarbejder-, kunde- og platformpanelet samt de offentlige sider. Hver side får et indlæsningsbillede, der har samme form som det rigtige indhold (samme højde, kort, rækker og knapper), så intet hopper.
2. **Erstat roterende cirkler** på hele sider og lister med det fælles indlæsningsbillede. Cirkler bevares kun på knapper ("Gemmer...") og små handlinger.
3. **Fjern egne varianter**: de steder der tegner deres egne grå blokke, bruger nu de fælles, så farve, runde hjørner og bevægelse er ens.
4. **Dark mode og kontrast**: blokkene tydelige men rolige i både lyst og mørkt tema; bevægelsen slås fra for dem, der har valgt mindre bevægelse.
5. **Tomme tilstande**: når listen er tom efter indlæsning, vises den fælles "intet her endnu"-visning, aldrig et evigt indlæsningsbillede.

## Del 2: Hurtigere sider
1. **Mål først** hver hovedside (forside, blog, bysider, priser, software, paneler) på langsom mobil og notér, hvad der tager tid.
2. **Hent data samtidig** i stedet for én efter én på de tungeste panelsider (overblik, ruteplanlægger, kunder, regnskab).
3. **Genbrug data**, der allerede er hentet, når man skifter side frem og tilbage, så den vises med det samme.
4. **Mindre at hente ved første besøg**: tunge dele (kort, grafer, editorer, kalender) hentes først, når de skal bruges; billeder får rigtig størrelse og hentes først når de er tæt på skærmen.
5. **Mål igen** og sammenlign før/efter. Intet må ændre udseende eller funktioner.

## Tjek
Playwright-billeder af hver panelside under indlæsning og færdig på 390 og 1280 px, lyst og mørkt; SEO-tjek og eksisterende tests skal bestå.

## Tekniske detaljer
- Kilde: `src/components/admin/shared/Skeletons.tsx` + `ui/skeleton.tsx`; registry-baserede tab-fallbacks (`TabFallback`, `PlatformTabFallback`) udvides, så hver fane har sin form.
- Erstat `Loader2`-sidefallbacks og `null`-fallbacks i indholdsområder; `null` beholdes for usynlige dele (dialoger, widgets).
- Fjern lokale `animate-pulse`-blokke (AftaleTab, kalendere, CartSheet, livechat) til fælles komponenter; `motion-reduce:animate-none`.
- React Query: fornuftig `staleTime`, `placeholderData` ved skift, `Promise.all`/parallelle queries; prefetch af næste fane ved hover/idle.
- Bundle-analyse igen; lazy-load Leaflet/charts/editor hvis eager.
