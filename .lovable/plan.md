# Kvalitetssikring af hele ruteplanlæggerens redesign

## Resultat
Ruteplanlæggeren fremstår som ét sammenhængende, professionelt arbejdsredskab på computer, tablet og mobil. Ingen tekst, knapper eller menuer overlapper, alle handlinger er synlige og stabile, og lys/mørk visning fungerer ens i hovedfladen og alle vinduer.

## Rettelser
- Gennemgå arbejdsfladen, værktøjslinjen, kalenderen, rutekortene og **Aftaler uden rute** for størrelser, linjeføring, læsbarhed, tom plads og vandret overløb.
- Ret de konstaterede smalle kalenderceller, hvor datoindhold og rutenavn kan løbe få pixels ud, uden at skjule rutekortets handlinger.
- Afbalancér rutekort: navnet skal være læsbart før klik, metadata skal være sekundær, og den faste handlingszone skal passe i alle kalenderbredder.
- Bevar de kompakte aftalekort, men sikre tydelige touchflader, stabile handlingsrækker og fuld læsbarhed på 375 px.
- Ensret alle dialoger, paneler, menuer, popups, bekræftelser og kortvisninger med samme header, indhold, footer, kanter, afstande og luk-handlinger.
- Kontrollér normal, hover, trykket, valgt, tastaturfokus, deaktiveret, indlæser, fejl, advarsel, succes og drag/drop på alle centrale kontroller.
- Ret mørk visning, hvor kontrast, hævede flader, felter, menuer, kort eller kortfliser endnu afviger fra det nye designsystem.
- Fjern synlige React-advarsler fra planlæggerens brugerflow, hvis de kommer fra de berørte interaktive elementer.

## Verifikation
- Kør indlogget visuel kontrol ved 1305×824, 768×1024 og 375×812 i både lys og mørk visning.
- Åbn og betjen opret rute, opret bestilling, rutedetaljer, rediger rute, stops, historik, tildeling, filtre og handlingsmenuer.
- Kontrollér rutekort med korte og lange navne, flere ruter på samme dag, tomme dage samt kompakte aftalekort.
- Kontrollér tastaturfokus, hover/active, menuer der forbliver åbne, touchflader, scrolling, vandret overløb og drag/drop.
- Tilføj målrettede visuelle/interaktionstests for de fejl, der findes, og kør eksisterende relevante tests samt build.

## Bevares
- Nuværende computerlayout med aftaler til venstre og kalender/kort til højre.
- Mobilens faste **Aftaler uden rute** og samme funktioner som på computer.
- Ingen synlige servicevarigheder eller udførelsestidspunkter, intet **I gang**-filter og stopbaseret kapacitet.
- Eksisterende data, forretningslogik, ruteoptimering og API-nøglefri kort.
