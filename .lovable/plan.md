# Ensartet medarbejderpanel og nye sektionsikoner

## Resultat
- “Min dag” får rutekort med samme rolige kortstruktur, ikonbehandling, kanter, status og handlinger som virksomhedspanelets rutekort.
- “Hvordan vil du køre ruten?” og tjeklisten får et samlet, responsivt design med tydelige valg og knapper uden dekorative bokse omkring detaljerede illustrationer.
- “Statistik” følger virksomhedspanelets sideopbygning, nøgletal, tabelrækker og tomme/loading-visninger.
- “Vis detaljer” åbner i samme vinduestype og visuelle struktur som “Opret bestilling” og “Rediger rute”.
- De 29 nye illustrationer erstatter de nuværende illustrationer i de navngivne sektioner på Forside, Systemet, Opret virksomhed, Ruter, Regnskab og Hjælp.

## Gennemførelse
1. Sammenlign medarbejdervisningerne med de eksisterende virksomhedskort og fælles vinduesdele, og genbrug samme afstande, headerstruktur, kanter og handlinger.
2. Fjern farvede baggrunde og ekstra kanter direkte omkring de detaljerede ruteillustrationer; vis dem større og frit i meningsfulde overskrifter eller valg.
3. Ombyg rutevalget til to tydelige valg med ens højde, klar strøm-/funktionsforklaring og mobilvenlig lukning.
4. Forenkle tjeklisten til én tydelig aktiv aftale, faste primære handlinger, rolig kø og kompakt udført-liste på mobil og computer.
5. Ensret Statistik med virksomhedspanelets kort og detaljer; behold præcis faktisk tid i timer, minutter og sekunder.
6. Pak de vedhæftede SVG-filer ud sikkert, læg dem i mediebiblioteket og opdater den fælles illustrationsoversigt.
7. Kobl hver illustration til den sektion, dens filnavn beskriver. Navigation og små handlingsknapper beholder velkendte standardikoner.
8. Kontrollér Min dag, rutevalg, tjekliste, Statistik og relevante offentlige sektioner på mobil, mindre computer og bred skærm.

## Teknisk
- Eksisterende `service-panel-*`-struktur, semantiske farver og mørk tilstand bevares.
- Ingen rute-, tidsregistrerings-, ordre- eller statistiklogik ændres.
- Rigtige billeder og eksisterende standardikoner i kompakte kontroller bevares.
- Illustrationerne indlæses som projektmedier og får beskrivende alternativ tekst, hvor de bærer indhold.
