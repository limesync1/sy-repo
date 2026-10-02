# Aftaler, rutetest og nye ikoner

## Resultat
- Aftaler-siden får en mere overskuelig detaljevisning, når en aftale åbnes, med samme rolige vinduesdesign som ruteplanlæggeren.
- Fletning af ruter og medarbejderens rutekørsel testes med rigtige data og rettes, hvis testen afslører fejl.
- De 26 nye brancheikoner bruges konsekvent alle steder, hvor brancher vises.
- De 59 øvrige ikoner erstatter nuværende ikoner, når navn og betydning matcher præcist eller naturligt.

## Aftaler-siden
- Bevar den nuværende liste og filtre, men åbn en aftale i et tydeligt sidevindue frem for et langt felt inde i kortet.
- Opdel indholdet i korte sektioner for kunde, service, pris, status, betaling, rute og historik.
- Placér de vigtigste handlinger fast og ensartet nederst; brug samme størrelser, afstande og danske tekster som de øvrige panelvinduer.
- Sørg for et kompakt mobil-layout og en tydelig alternativ handling til træk-og-slip.
- Bevar eksisterende aftalelogik, mails, regnskab og statusændringer.

## Ikoner
- Pak ikonerne ud, fjern systemfiler og upload de faktiske SVG-filer som app-assets.
- Udskift brancheikonregistret samlet, så samme branche altid får samme ikon på forsiden, i søgning, kategorier, tilbudsflow og paneler.
- Brug de navngivne ikoner i matchende indhold: eksempelvis Bestillinger, Ruteplanlægger, Medarbejdere, Omsætning, Regnskab, Leads, Livechat, Profil og Indstillinger.
- Bevar virksomhedspanelets nuværende navigationsikoner som ønsket.
- I medarbejderpanelet erstattes kun nuværende ikoner, når navn og funktion matcher nogenlunde eller præcist.
- Bevar velkendte standardikoner til luk, tilbage, menu, søg, slet, kalenderpile, afkrydsning og fejl.
- Kontrollér størrelse, kontrast og justering på både lys og mørk baggrund.

## Test med rigtige data
- Opret eller brug sikre testdata til to ruter, flet dem gennem brugerfladen og kontrollér aftaler, rækkefølge, tom kilderute og fejlbeskeder.
- Test medarbejderflowet fra “Start rute” gennem valg af visning, ændring af rækkefølge, start af aftale og “Aftale udført”.
- Kontrollér det interne rutekort, tilbage-navigation og liveposition uden at åbne Google Maps.
- Ryd midlertidige testdata op bagefter og undgå ændringer i rigtige kundedata.

## Teknisk
- Genbrug `SheetHeaderBlock`, `Section` og `SheetFooterBar` til aftaledetaljen.
- Bevar de fælles ikonregistre som eneste kilde til branche- og indholdsikoner; ingen spredte filstier.
- Test på mobil og desktop, kontrollér konsol/runtime-fejl og afslut kun med fejlfri build.
