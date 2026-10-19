# «Opret bestilling» — kompakt og uden forvirring

## Hvad der er galt
- Søgefeltet over servicelisten sætter sig fast, når man scroller. Det sætter sig dog lidt under vinduets top, så der er et mellemrum, hvor andet indhold (fx CVR-feltet) skinner igennem.
- Toppen fylder meget: titel, en lang forklaring og tre mærker (antal, tilbagevendende, beløb). Det hele står også i bundlinjen og i «Valgte services».
- Kunde og CVR ligger i to separate kasser med store mellemrum, selv om CVR blot hører til kunden.
- Hver kasse har stor overskrift, rammer og luft. Det skubber servicelisten langt ned.
- På computer har servicelisten og «Valgte services» hver deres scroll inde i vinduets egen scroll. Det giver dobbelt scroll.

## Ændringer
1. **Top:** Kun titlen «Opret bestilling» og én kort linje. Mærkerne fjernes; antal og beløb står kun i bundlinjen.
2. **Søgefelt:** Sætter sig ikke længere fast. Ingen mellemrum, ingen overlapning. (Kategoriknapperne står lige under søgningen.)
3. **Kunde i én kompakt kasse:** Navn, e-mail, telefon og adresse i to kolonner på computer. CVR bliver en lille linje «Erhvervskunde? Slå CVR op» i samme kasse, som folder feltet ud ved tryk.
4. **Strammere layout overalt:** Mindre luft mellem kasser, mindre overskrifter, felter 40 px på computer (44 px på mobil), ingen ekstra baggrund bag kasserne.
5. **Services på computer:** Ingen indre scroll. Listen og «Valgte services» følger vinduets almindelige scroll; «Valgte services» bliver stående i siden, mens listen scrolles.
6. **Servicekort mere kompakte:** Detaljer og Tilføj/Fjern flyttes op i kortets øverste række i stedet for en separat bundlinje. Beskrivelsen er én linje.
7. **«Besked til kunden»** foldes sammen som en lille knap «Tilføj besked», indtil den bruges.
8. **Bundlinje:** «I alt X kr. uden moms · 2 services» på én linje plus knapperne, lavere højde.

## Kontrol
Playwright-skærmbilleder ved 390 px og 1351 px, både ved åbning og efter scroll ned til services, lyst og mørkt tema.

## Tekniske detaljer
- `CreateManualOrderDialog.tsx`: fjern status-chips fra `SheetHeaderBlock`; flet CVR-sektionen ind i kundesektionen med en `Collapsible`; body `py-3 space-y-2`, fjern `bg-secondary/20`; besked bag toggle; footer på én linje.
- `ServicePicker.tsx`: fjern `sticky` på søgeblokken og `lg:max-h/overflow` på listen; aside `lg:sticky lg:top-0` uden egen max-height; flyt handlingsknapper ind i kortets topområde, fjern bundbjælken.
- Ingen ændringer i prisberegning eller afsendelse.
