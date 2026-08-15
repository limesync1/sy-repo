# "Meld medarbejder syg" — gennemgribende oprydning

Dialogen bygges om fra én lang scroll til et roligt, trinvist flow med de samme byggeklodser som resten af ruteplanlæggeren. Logikken bag (hvem er ramt, hvem kan overtage, hvad sker der ved bekræft) beholdes uændret — det er layout, UI og UX der laves om.

## Hvad der er galt i dag

- Alt ligger i én lang scroll: medarbejder, periode, nøgletal, valg pr. rute, note og fejlliste blandet sammen. Man kan ikke se hvor man er i processen.
- Datovælgeren er to rå browser-datofelter i en gråbox — resten af planlæggeren bruger den fælles datovælger, så det stikker ud.
- Valget pr. rute sker i to små dropdowns ved siden af hinanden. Man skal åbne en menu for at se hvilke muligheder der findes, og afløser-navnet er gemt bag endnu en menu med badges der løber ud over kanten.
- Ingen samlet "gør det samme for alle ruter" — ved 5 ramte ruter skal man klikke sig igennem 10 dropdowns.
- Ingen kvittering før man trykker: man ser aldrig i klartekst "Mette overtager 4 aftaler tirsdag".
- Mobil: tre nøgletal side om side, dropdowns med lange badge-rækker, og en footer med tekst + to knapper på samme linje — alt bliver klemt.
- Ingen advarsel hvis den valgte medarbejder allerede er registreret fraværende i perioden.

## Nyt flow

Tre trin i samme dialog, med en tydelig trin-indikator i headeren og Tilbage/Videre i footeren.

```text
Trin 1  Hvem og hvornår      medarbejder + periode
Trin 2  Sådan dækkes det     et kort pr. ramt rute + massevalg
Trin 3  Bekræft              klartekst-opsummering + note
```

Trin 2 springes over automatisk hvis ingen ruter rammes (så går man direkte til bekræft med "Ingen aftaler berøres").

### Trin 1
- Medarbejdervælger med avatar, navn og lille status ("3 ruter i denne uge"). Advarsel hvis personen allerede er meldt fraværende i perioden.
- Periode med den fælles datovælger (samme som resten af planlæggeren) i stedet for rå datofelter, plus hurtigvalg: I dag · I dag + i morgen · Resten af ugen · Hele næste uge.
- Ét roligt resumé under vælgerne: "3 dage · 2 ruter · 9 aftaler berørt" i stedet for tre nøgletalskort.

### Trin 2
- Ét kort pr. ramt rute: rutenavn, dato, antal aftaler, holdets avatarer, badge hvis underbemandet.
- Handlinger som valgbare kort (ikke dropdown), så alle fire muligheder er synlige: Erstat · Fordel på holdet · Frigiv · Flyt dato. Umulige valg vises deaktiveret med begrundelse ("ingen andre på holdet").
- Ved Erstat: en liste med de tre bedst egnede kolleger som klikbare rækker med avatar, aktuel belastning og én status-badge (Ledig / konflikter / over kapacitet), samt "Vis alle" for resten. Det anbefalede valg er markeret.
- Massevalg i toppen: "Brug samme løsning på alle ruter".

### Trin 3
- Klartekst-liste over konsekvensen, én linje pr. rute: "Tirsdag 18/8 — Rute Nord: Mette Hansen overtager 4 aftaler".
- Note-felt og eventuelle mangler samlet her, så man ikke kan bekræfte med huller.

## UI-konsistens og responsivitet

- Samme header-, sektions- og footer-mønstre som de øvrige planlægger-dialoger; ingen egne farver ud over den gule fravær-accent.
- Mobil: fuld højde, ét kort pr. række, handlingskort i lodret stak, footer med knapperne i fuld bredde under hinanden.
- Tastatur og skærmlæser: fokus flytter til trinnets overskrift ved skift, handlingskort er rigtige radioknapper, alle badges har tekst.

## Teknisk

- Kun `src/components/route-planner/SickLeaveDialog.tsx` skrives om; den splittes i mindre dele i samme mappe (trin 1/2/3 og et rute-beslutningskort) så filen forbliver læsbar.
- `useSickLeaveImpact`, `scoreCandidate`, `sortCandidates` og `useCommitSickLeave` bruges uændret — ingen ændringer i database eller mutationer.
- Datofelter skifter til den eksisterende `DatePickerField`.
- Eksisterende fravær hentes allerede via `useEmployeeAbsences` og bruges nu også til advarslen i trin 1.
- `SickLeaveDialogHost.tsx` er uændret.
