# Gennemgang af alle ikoner og 13 nye ikoner

## Mål
Bruge de 13 vedhæftede ikoner dér, hvor deres betydning passer, og sikre ensartede størrelser, baggrunde og placeringer på hele Serviceydere.

## Ændringer
- Tilføj de 13 nye ikoner til det fælles ikonregister med én fast betydning pr. ikon.
- Erstat eksisterende ikoner ved fair priser, ingen matches, match-loading, lokal forankring, planlagt uge/måned, seneste søgning, gennemsnit pr. aftale, søgning, valg af regnskabsprogram, aftaler uden rute, kundeservice og udbetaling.
- Gennemgå offentlige sider samt virksomheds-, medarbejder-, kunde- og adminpaneler for gamle, forkerte eller dobbelte ikonvalg.
- Tilpas ikonstørrelse, indvendig luft og baggrund efter sammenhængen uden at ændre sidernes struktur.
- Behold almindelige kontrolikoner som luk, tilbage, menu og pile, hvor de nye illustrationer ikke er egnede.

## Teknisk
- Brug de centrale `BrandedIllustration`, `PanelIcon` og `UiArtwork`-registre frem for nye direkte filreferencer.
- Fjern kun gamle ikonfiler eller koblinger, når de ikke længere bruges.
- Bevar brancheikoner som en separat ikonfamilie.

## Kontrol
- Kontrollér alle 13 nye ikoner visuelt og bekræft, at ingen er beskåret, slørede, for små eller for store.
- Kontrollér centrale sider og paneler på mobil og desktop, herunder `/om-os`, søgning, tilbud, ruteplanlægger, statistik og kundeservice.
- Kontrollér manglende billeder, overlap, runtime-fejl og appens build.
