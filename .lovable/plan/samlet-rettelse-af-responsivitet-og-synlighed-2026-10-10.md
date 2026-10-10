# Samlet rettelse af responsivitet og synlighed

## Mål
Fjerne de gennemgående layout- og synlighedsfejl i knapper, vinduer, popups og rutekørsels-HUD, så samme handling er tydelig og brugbar på mobil, tablet og computer i både lyst og mørkt tema.

## 1. Fælles knapper og interaktioner
- Gør alle almindelige knapper, ikonknapper og menupunkter stabile ved lange danske tekster: korrekt ombrydning, minimumsbredde, ens ikonplacering og ingen afskæring.
- Ensret trykflader, fokus, hover, active, valgt og disabled på tværs af panelerne.
- Fjern globale størrelsesregler, der gør knapper for små på tablet/små computere, og behold kompakthed uden at ofre læsbarhed.

## 2. Fælles vinduer og bundark
- Ret de centrale dialog- og sheet-primitiver, så bredde, højde, safe-area, scroll og luk-knap fungerer ens på alle skærme.
- Hold header og footer synlige, mens kun indholdet scroller; undgå dobbelte scrollområder og indhold bag skærmtastaturet.
- Lad mobil bruge et roligt bundark, tablet en passende bred dialog og computer sidepanel/centreret dialog efter opgaven.
- Ret ref-advarslen i de trinvise aftalevinduer og sikre, at overskrifter og trin aldrig klippes.

## 3. Popups, dropdowns og beskeder
- Begræns popupbredder til den reelle skærm, aktiver kollisionstilpasning og sikker intern scroll ved lange lister.
- Gør menupunkter mindst 44 px på touch-enheder og behold kompakt musevisning på computer.
- Placér toastbeskeder og bekræftelser, så de ikke dækker rutekørsels-HUD eller mobilens bundhandlinger.

## 4. De mest synlige arbejdsgange
- Færdiggør **Ret aftale**, **Ny aftale** og **Note til kontoret** med stabile trin, header, indhold og bundknapper på alle bredder.
- Ensret **Føj til rute** og **Flyt dato** helt med designet i **Rediger rute/Opret bestilling**, inklusive mobilrækkefølge, valgte tilstande og forhåndsvisning.
- Ret kompakte stophandlinger, så Ret, Ny og Note har tydelige labels og aldrig presses sammen eller forsvinder.
- Gennemgå rutekørsels-HUD for overlap mellem kort, manøvre, fejlbesked, kortkontroller og næste stop ved korte/lange skærme.

## 5. Systematisk kontrol
- Tilføj målrettede tests for de fælles primitive komponenter og aftalevinduerne.
- Browserkontrollér centrale sider på mobil, tablet og computer i lyst og mørkt tema med lange tekster, åbne dropdowns, scroll, fejltilstand og reduceret bevægelse.
- Ret fundene centralt først og lokalt kun dér, hvor arbejdsgangen kræver en særlig opbygning.

## Afgrænsning
- Ingen ændring af forretningslogik, priser, tidsregistreringsregler eller kortnøgler.
- Eksisterende danske labels og fælles paneldesign bevares.
