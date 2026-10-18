# Ruteplanlægger: navne-popup, aftalekort og topbar — grundig oprydning

## Hvad der faktisk er galt (fundet i koden)

1. **Medarbejdernavnet bliver skåret over.** Den lille boks med navn/billede, der vises når musen holdes over en medarbejder, tegnes *inde i* aftalekortet. Kortet klipper alt, der stikker ud over kanten, så boksen bliver halvt skjult. Den sidste rettelse løftede kun selve avataren, ikke boksen.
2. **To navne-bokse på én gang.** Ud over den pæne boks viser browseren også sit eget grå teksttip med alle navne, så der kommer to forskellige bokse.
3. **Samme problem i kalenderen.** Forhåndsvisningen, der kommer frem når man holder musen over en rute i måneds-/ugekalenderen, er bygget på samme måde og kan også blive skåret over.
4. **Topbaren er delt i to.** På skærme under ca. 1536 px bredde (fx din på 1351 px) står kun sidens titel i headeren, mens alle knapperne ligger i en separat boks lige under. På meget brede skærme flytter knapperne op i headeren og kan bryde ned på en ekstra linje, som presser kalenderen ud over skærmen, fordi kalenderens højde er regnet ud fra en fast headerhøjde.

## Hvad jeg ændrer

**Medarbejdere på aftalekort (stop på ruten, aftalepulje, sygemelding-kort)**
- Navne-boksen tegnes oven på hele siden, så den aldrig klippes, og placerer sig selv over/under alt efter plads.
- Browserens ekstra teksttip fjernes — kun én boks.
- Boksen viser altid fuldt navn (ingen afskæring) og, hvis medarbejderen er "lead", et lille mærke.
- Avatarerne får lidt større trykflade og mellemrum, så de ikke overlapper så meget, at man rammer den forkerte. "+N" får også en boks med de resterende navne.
- Tastatur: Tab til en avatar viser samme boks.

**Aftalens titel**
- Ingen boks/ramme ved hover. Titlen forbliver et rent link (diskret understregning). Jeg tjekker, at kortets egen hover-kant ikke ser ud som en ramme om titlen; hvis den gør, gøres den svagere.

**Kalenderens rute-forhåndsvisning**
- Tegnes oven på siden, så den ikke skæres over ved kanten af en dag.

**Topbar/header**
- Én samlet linje på alle skærmbredder: headeren viser titlen «Ruteplanlægger» og et kort overblik (antal ruter, stop, uplanlagte). Alle knapper (forrige/næste, dato, Måned/Uge, filtre, Optimér, Opret rute, Mere) samles i én værktøjslinje lige under — samme sted uanset skærm.
- Den dobbelte version af knapperne i headeren på meget brede skærme fjernes.
- Kalenderen fylder resten af skærmen uden fast regnet headerhøjde, så intet presses ud eller får dobbelt rullebjælke.
- «Opret rute» kan aldrig skubbes halvt ud af skærmen; knapperne bryder pænt ned på en ny linje.

**Gennemgang "og mere til"**
- Gennemgår hele stop-vinduet, aftalepuljen og kalenderkortene for andre popups, der klippes eller viser dobbelte teksttip, og retter dem på samme måde.
- Tjekker lyst og mørkt tema samt bredderne 1100, 1351, 1536 og 1920 px.

## Verifikation
- Din egen konto har ingen virksomhed, så jeg kan ikke se ruteplanlæggeren som dig. Jeg logger testbrowseren ind som DK Renfyns ejer (du får et godkendelseskort), åbner en rute med stop og tager skærmbilleder af: hover på avatar, hover på titel, kalender-hover og topbaren ved de fire bredder.
- Der laves ingen ændringer i ruter, aftaler eller data.

## Tekniske detaljer
- `src/components/route-planner/EmployeeAvatars.tsx`: wrap `HoverCardContent` i `HoverCardPrimitive.Portal` (eller tilføj portal i `ui/hover-card.tsx` via en `portal`-variant), `collisionPadding`, fjern `title` på wrapper, `-space-x-1` + hover-card på "+N", fuldt navn uden `truncate`.
- `src/components/route-planner/MonthWeekCalendar.tsx` (linje ~1735): portal på rute-preview HoverCard.
- `RouteStopsPanel.tsx`: titel-knap uden baggrund; evaluer `CARD_HOVER` i `lib/card-styles.ts`.
- `src/pages/RoutePlanner.tsx`: fjern `hidden 2xl:flex`-blokken i `topbarRight` (behold kun stats-pillen), fjern `2xl:hidden` på `.planner-toolbar` så den gælder alle ≥1100 px, og erstat `h-[calc(100dvh-56px-...)]` med flex-fyld (`flex-1 min-h-0`) i `contentClassName`-kæden.
- Opdater AGENTS.md-reglen om at hover-popups på klippede kort altid portales (merge med eksisterende kortregel, budget).
