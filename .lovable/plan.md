# Services i «Opret bestilling» — næste runde

## Fundne problemer
1. **Ikke set på skærmen:** Sidste runde blev ikke kontrolleret visuelt, fordi vinduet ikke kunne åbnes i testen.
2. **Mobil:** Valgte services vises kun som små mærker øverst. Indstillinger folder ud midt i listen, så listen bliver lang, og man mister overblikket. Den samlede fold-ud-kasse mangler stadig.
3. **Dobbelt «Fjern» på computer:** Både kortet i listen og «Valgte services» har en stor rød «Fjern». Det forvirrer.
4. **Detaljer gentager mærker:** Åbnes «Detaljer», vises alle intervaller som mærker igen, selv om de vælges i «Valgte services».
5. **Kortets to linjer:** «Detaljer» og «Tilføj/Fjern» står på en ekstra linje under navnet. Det gør kortet højere end nødvendigt.
6. **Højre kolonne på computer:** Når listen er lang, kan «Valgte services» blive højere end skærmen og forsvinde under bundlinjen. Der er ingen samlet pris for hver service i overskriften.
7. **Enter-genvej:** Enter tilføjer stille den øverste service, uden at man kan se hvilken. Det skal markeres.
8. **Kategoriknapper** viser ikke antal. Når filteret er sat, kan man ikke se, hvor mange services der er i hver kategori.

## Ændringer
- **Kort på én linje (computer):** Ikon, navn, pris og knapperne «Detaljer» (lille ikonknap) og «Tilføj/Valgt ✓» på samme række. Mærker og felt-priser på linjen under.
- **Kun én «Fjern» pr. sted:** Valgt service i listen viser en grøn «Valgt ✓»-knap (tryk igen = fjern, med Fortryd). Den røde «Fjern» står kun i «Valgte services».
- **Detaljer** viser kun beskrivelse og felter, ikke intervallerne igen.
- **Højre kolonne:** Egen scroll inde i kolonnen, når den er højere end vinduet. Hver valgt service får en overskrift med navn og subtotal «uden moms», og kan foldes sammen.
- **Mobil — fold-ud-kasse:** Fast kasse lige over bundlinjen: «Valgte (2) · 1.250 kr uden moms ▲». Kassen åbner en liste, hvor hver valgt service har sin egen fold. Kun én er åben ad gangen. Indstillingerne fjernes fra selve listen.
- **Enter-markering:** Den service, som Enter vil tilføje, får en tynd teal kant og teksten «Enter for at tilføje».
- **Kategoriknapper med antal:** fx «Rengøring 4».
- **Kontrol på skærmen:** Playwright åbner vinduet via «Opret bestilling» som ejer af Jimmy's VP ved 320, 390, 768, 1351 og 2943 px i lyst og mørkt tema. Testen tilføjer, fjerner, fortryder, ændrer antal og felter. Der oprettes ingen rigtig bestilling.

## Ikke ændret
Serveren beregner stadig prisen. «Uden moms» og «Foreløbig opstartsdato» bevares. Ingen ændring af afsendelse eller mails.

## Tekniske detaljer
- `ServicePicker.tsx`: række omlægges til én flex-række; `Valgt`-toggle i stedet for `Fjern` i listen; interval-mærker fjernes fra åben detalje; `renderSelected` vises ikke længere inline på mobil. Aside får `lg:max-h-[calc(92vh-12rem)] lg:overflow-y-auto` og `Collapsible` pr. valgt service med subtotal fra `calcItemTotal`. `highlightId` for Enter-målet. Kategoritælling ud fra filtrerede (søgning) services.
- Ny `SelectedServicesDrawer` (kun `<lg`) i `CreateManualOrderDialog.tsx` over `SheetFooterBar`, accordion type="single".
- Playwright-script i `/tmp/browser/services-v3/`; vitest `order-item-total.test.ts` køres igen.
