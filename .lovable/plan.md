# Opdatering af søge-, label- og navigationsikoner

## Resultat
- Panelvælgerens “valgte” illustration vises præcis på de knapper, der har mørk baggrund, både på computer og mobil.
- Branchekort og kategoriresultater i søgninger viser den nye pil ved hover/fokus uden at forskyde teksten eller klippe kortenes kanter.
- Søgefelterne på forsiden, Find services og Få tilbud bruger det nye søgeikon; tidligere søgninger bruger det nye “Senest søgt”-ikon.
- Små sektionslabels på offentlige sider bruger den animerede streg i stedet for den nuværende CSS-streg.
- “Alle aftaler er planlagt” vises uden illustration i ruteplanlæggeren.
- Sidepanelets vis/skjul-knap beholder præcis placering og størrelse, men bruger den nye venstrepil; pilen vendes mod højre, når menuen er skjult, og hover-varianten vises ved hover/fokus.

## Gennemførelse
1. Læg de fem vedhæftede medier i projektets mediebibliotek og opret små fælles ikonkomponenter til søgning, pil og sektionsstreg.
2. Ret panelvælgeren, så mørk knapbaggrund — ikke blot gemt panelpræference — styrer det valgte ikon.
3. Opdatér branchekort, søgedropdowns og kategorivælgeren på Få tilbud med de nye ikoner og tilgængelige hover-/fokustilstande.
4. Udskift de dekorative label-streger på offentlige sider med den animerede streg i en ensartet, kompakt størrelse.
5. Fjern ikonet over den tomme aftalepulje og udskift begge fælles sidepanelkontroller.
6. Kontrollér forsiden, Find services, Få tilbud og virksomhedens ruteplanlægger på mobil og computer samt mørke/lyse knaptilstande.

## Teknisk
- Eksisterende semantiske farver, knapkomponenter og layoutmål bevares.
- Animationer dæmpes automatisk for brugere, der foretrækker reduceret bevægelse.
- Ingen ændringer i data, sikkerhed eller forretningslogik.
