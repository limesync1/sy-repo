# Opdelt navigation + korrekt indhold på /software

## 1. Navigation delt i "For kunder" og "For virksomheder"

Menuen beholder præcis samme pille-design som i dag — der tilføjes kun en opdeling, så det ikke ser mærkeligt ud:

```text
[ Find services   Få tilbud │ Bliv udbyder   Software ]
        for kunder          ▲      for virksomheder
                    tynd lodret skillelinje
```

- Desktop: samme pille-bjælke, men med en tynd lodret skillelinje mellem "Få tilbud" og "Bliv udbyder". Ingen nye farver, ingen ekstra højde.
- Skærmlæsere og sprogmodeller får opdelingen semantisk via to grupper med labels "For kunder" og "For virksomheder" (usynlige på desktop, så designet er uændret).
- Mobilmenu: to små grå overskrifter — "For kunder" (Find services, Få tilbud) og "For virksomheder" (Bliv udbyder, Software) — med samme skillelinje-stil som resten af menuen.
- Aktiv-markering udvides, så /opret-virksomhed og /software også fremhæves korrekt (i dag markeres kun de to kundelinks).

## 2-4. Rettelse af forkert indhold på /software

Sandheden hentes fra det, "Bliv udbyder" og faktureringen rent faktisk gør. Priserne kommer allerede live fra prislisten: 289 kr./md. basis, ruteplanlægning inkluderet, 59 kr./md. pr. medarbejderlogin, 269 kr./md. regnskabsintegration, 1.495 kr. dataimport, 2.269 kr. opstart, 10 % kvartal / 20 % år, 14 dages prøve.

**Det er ikke gratis software** — rettes disse steder:

- `/software` (hub): fjern "Gratis at oprette virksomheden og komme i gang" og afsnittet om at "betalte planer åbner for de større driftsfunktioner". Erstattes af det korrekte: 14 dages gratis prøve uden betalingskort, derefter vælger man selv at tilføje kort og fortsætte. Ingen binding, opsig når som helst.
- Hero-knappen på alle /software-sider: "Kom i gang gratis" → "Start 14 dages gratis prøve".
- Afslutnings-CTA: "Opret virksomheden gratis" → korrekt formulering om prøveperioden.
- Nyt "Hvad koster det"-afsnit på hubben med de rigtige tal og link til /software/priser — ingen påstand om en gratis plan.

**Prøveperioden beskrives ens overalt:** 14 dage gratis, intet betalingskort ved oprettelsen, kortet tilføjes bagefter under Indstillinger → Fakturering hvis man vil fortsætte, opstartsprisen lægges først på første faktura efter prøven, ingen binding.

**Kundeimport (punkt 3):** svaret ændres til, at Serviceyderes support står for det — vi hjælper med importen fra regneark eller jeres nuværende system og laver den gerne for jer (1.495 kr. engangs). Rettes i FAQ på hubben, på prissiden og på branchesiderne, hvor der i dag står, at man selv importerer.

**Øvrige unøjagtigheder der gennemgås og rettes:**

- Prissidens "Ubegrænset antal kunder og opgaver" og listen "det følger med i basisprisen" tjekkes mod, hvad basis reelt indeholder (profil med søgesynlighed, bestillinger, kalender, fakturering, ruteplanlægning, 1 ejer-login) — leads og livechat er gratis tilvalg, man selv slår til, ikke noget der bare er aktivt.
- Regnskabsintegration omtales konsekvent som tilvalg til 269 kr./md. og kun til e-conomic og Dinero.
- Regneeksemplerne på branchesiderne (fx "to mand = 407 kr./md.") efterregnes mod de aktuelle priser.
- Formuleringer om ruteoptimering holdes på det, systemet faktisk gør: foreslår en kortere rækkefølge, som planlæggeren selv godkender.
- `public/llms.txt` og produkt-schemaets Offer-tekst opdateres, så Google og sprogmodeller får samme korrekte prøve- og prisbeskrivelse.

## Teknisk

- `src/components/SiteNav.tsx`: `NAV_ITEMS` får et `group`-felt ("customers" | "business"); desktop-render mapper over grupperne med en `w-px`-divider imellem, mobil-render får gruppeoverskrifter. `isActive` udvides med business- og software-stier.
- Indholdsrettelser i `src/pages/software/SoftwareHub.tsx`, `defineSoftwarePage.tsx` (CTA + Offer-schema), `PricingPage.tsx` (FAQ + featureliste), `WindowCleanerSoftware.tsx`, `CleaningSoftware.tsx`, `GardenSoftware.tsx`, `HandymanSoftware.tsx`, `IndustriesPage.tsx` og `public/llms.txt`.
- Ingen ændringer i priser eller logik — alle tal læses fortsat fra prislisten via `usePlatformPricing`.