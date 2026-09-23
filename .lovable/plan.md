# Responsivt løft af paneler, ruteplanlægger og forside

## Resultat
- Hoverteksten ved sidemenu-knappen bliver tydelig og ens i virksomheds-, admin- og medarbejderpanelet, uden det fejlagtige `[`-symbol.
- Panelerne udnytter små computerskærme bedre med en smallere sidemenu, kompakt topbjælke og mindre luft, uden at mobilens trykflader bliver for små.
- Ruteplanlæggeren får et særskilt laptop-layout, så kalender, rutenavne, handlinger og “Aftaler uden rute” kan ses ved 100 % zoom på fx MacBook Air 13″.
- Forsiden bliver mere kompakt og rolig på mobil, tablet og mindre computere, med mindre sektionsluft, mere afbalancerede overskrifter og mindre dominerende kort.

## Panelnavigation
- Saml de tre sidemenuers skjul/vis-kontrol i én fælles løsning med samme ikon, hover, fokus og tooltip.
- Fjern det ubrugte `[`-symbol og vis kun “Skjul sidemenu” eller “Vis sidemenu”.
- Sørg for, at tooltipen vises over øvrigt indhold, har korrekt kontrast og ikke klippes ved skærmkanten.
- Tilpas sidepanelets bredde og indholdsmargener trinvist til mindre laptops, mens den nuværende mobilmenu og bundnavigation bevares.

## Ruteplanlægger på mindre computere
- Indfør en kompakt laptop-tæthed ved cirka 1024–1439 px og lave skærmhøjder som 800–900 px.
- Gør “Aftaler uden rute” smallere på laptop, men behold læsbare aftalekort og synlige handlinger.
- Fjern den dobbelte/ekstra store værktøjslinjefølelse ved at prioritere én kompakt række og samle sekundære handlinger i den eksisterende menu.
- Reducer kalenderens minimumshøjder, mellemrum og overflødig pynt på laptop, så en hel uge/måned og rutenavne kan aflæses uden browserzoom.
- Bevar den fulde rummelige visning på store skærme og den eksisterende berøringsvenlige mobil/tablet-visning.

## Forside
- Reducer de store spring i sektionsafstand ved tablet- og laptopbredder; større afstand bruges først på brede skærme.
- Skaler heroens højde, billede, overskrift, søgning og knapper mere jævnt mellem mobil, tablet, 1280 px og store skærme.
- Gør branchekort, bookingtrin, anmeldelser, virksomhedssektion og afsluttende handling mere kompakte uden at fjerne indhold.
- Bevar den nuværende marine/teal-identitet, danske tekst, billeder og funktioner.

## Teknisk og kontrol
- Brug eksisterende semantiske designtokens og fælles komponenter; ingen ændringer i data eller forretningslogik.
- Kontrollér 393×852, 768×1024, 1280×800, 1440×900 og en bred desktopvisning.
- Verificér hover/fokus, åben og sammenfoldet sidemenu, lys/mørk panelvisning, vandret overflow samt ruteplanlæggerens centrale handlinger.
- Afslut med typekontrol, byggekontrol og visuel kontrol af de faktiske sider.
