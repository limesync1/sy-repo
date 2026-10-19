# Servicevalg i «Opret bestilling» — gør det enkelt og responsivt

## Problemer i dag
- En valgt service forsvinder fra listen og dukker op længere nede som et stort kort. Man kan ikke se, hvad der skete, og listen hopper.
- Listen og de valgte services ligger i to adskilte felter. På mobil skal man scrolle frem og tilbage mellem dem.
- Intervallet kan kun vælges i en lille rulleliste, og kun når der er flere intervaller. Har en service kun ét interval, vises det ikke tydeligt.
- Skraldespandsknappen er kun 28 px. Felterne til prisberegner og timer har faste bredder, som skubber ud på smalle skærme.
- Subtotal og «I alt» siger ikke «uden moms», men listen gør. Det er uensartet.
- Ingen gruppering efter kategori, så det er svært at finde den rigtige service, når der er mange.

## Ny opbygning
```text
[ Søg service ......................... x ]
[ Alle ] [ Rengøring ] [ Vinduespudsning ] ...  (kategorifilter, kun ved 2+ kategorier)

Vinduespudsning
  ( ) Pudsning privat     450 kr uden moms · Hver 4. uge   [Tilføj]
  (v) Pudsning erhverv    ✓ Valgt                          [Fjern]
      └ kort med valg lige under rækken:
         Interval:  [Engang] [Hver 4. uge] [Hver 8. uge]   (knapper, ikke rulleliste)
         Felter:    Vinduer  [ - 12 + ]  (fuld bredde på mobil)
         Startdato: [ 21. okt ]
         Subtotal  1.200 kr uden moms
```
- Valgte services bliver stående på deres plads i listen, markeret «Valgt», og udfolder deres indstillinger lige der. Ingen hop.
- En lille opsummering øverst («2 valgt · 1.650 kr uden moms»), som kan trykkes på for at springe til den valgte service.
- Intervaller vises altid som tydelige knapper; ét interval vises som fast tekst.
- Detaljer (beskrivelse, prisberegnerfelter med enhedspriser, varenr.) åbnes med «Detaljer» i rækken. Lang tekst vises småt og afkortes.
- Grupperet efter kategori med overskrifter. Kategorifilter som vandret række af knapper på mobil.
- Varenr. vises kun ved tilsluttet regnskabsprogram; manglende varenr. markeres i gult.
- «Uden moms» ved subtotal og «I alt».

## Mobil
- Alle knapper og felter mindst 44 px; plus/minus-felter i fuld bredde.
- Søgefeltet bliver ved toppen af servicesektionen, når man scroller.
- Testes ved 320, 375, 768 og 1351 px i lyst og mørkt tema.

## Tekniske detaljer
- `ServicePicker.tsx` omskrives til at stå for både liste og de valgte services' indstillinger (interval, timer, prisberegnerfelter, startdato). Den får `items`, `onAdd`, `onRemove`, `onUpdate`, `renderSubtotal` fra `CreateManualOrderDialog.tsx`.
- Den separate kortliste i `CreateManualOrderDialog.tsx` fjernes; prisberegning (`calcItemTotal`) og afsendelse forbliver uændret. Serveren beregner fortsat priserne.
- Intervalknapper bruger eksisterende `INTERVAL_LABELS`.
- Verificeres med Playwright i preview efter ændringen.
