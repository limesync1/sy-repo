# Korrekte kundeikoner og bedre aftalepulje

## Resultat
- Kundeservice bruger den nye vedhæftede SVG i header, chat og anbefalingsvisninger.
- Kundesiden bruger kun de korrekte kundeillustrationer: samlet kundeikon, privatkunde og virksomhed/erhverv.
- Hver kunderække uden profilbillede viser et tydeligt kundeikon efter kundetype i stedet for medarbejderikoner.
- “Aftaler uden rute” får en bredere, mere rolig opbygning på mindre computere uden at presse søgning, filtre eller aftalekort sammen.

## Gennemførelse
1. Læg de fire vedhæftede SVG-filer i projektets mediebibliotek og opdater de fælles ikonreferencer.
2. Udskift de forkerte medarbejder-/serviceillustrationer i kundestatistik, tabellabel, tom visning og kunderækker.
3. Bevar rigtige kundeprofilbilleder; brug kun privat- eller virksomhedsikon som fallback.
4. Udvid aftalepuljen ved laptopbredder og fordel dens kontroller på flere linjer, når pladsen er begrænset.
5. Kontrollér kundesiden og ruteplanlæggeren indlogget på mobil, mindre computer og bred skærm.

## Teknisk
- Navigation og kompakte handlingsknapper beholder deres velkendte standardikoner.
- Eksisterende `service-panel-*`-design og semantiske farver bevares.
- Ingen data eller forretningslogik ændres.
