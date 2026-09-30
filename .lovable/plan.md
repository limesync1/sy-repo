# Ikonløft, ens modaler og forbedrede forsidesektioner

## Resultat
- Kundesiden får tydelige, ensartede illustrationer i alle nøgletal, kundelisten og relevante tomme tilstande, mens små handlingsknapper fortsat bruger velkendte standardsymboler.
- “Opret rute” får samme responsive opbygning, afstande, sektionskort, footer og visuelle hierarki som “Opret bestilling” og “Rediger rute”.
- Forsidens proces-, virksomheds- og William-sektioner bruger de præcist angivne nye SVG-illustrationer i læsbare størrelser.
- “Skriv til mig” og “Få personlig hjælp” åbner den eksisterende kundeservicechat direkte.
- De øvrige vedhæftede illustrationer placeres i de angivne statistik- og funktionskort i virksomheds- og medarbejderpanelet uden at ændre navigation eller kompakte værktøjsknapper.

## Gennemførelse
1. Pak de 40 vedhæftede SVG-filer sikkert ud, upload dem som projektmedier og saml dem i registre for forside, virksomhedspanel og medarbejderpanel.
2. Udvid den fælles ikonkomponent, så illustrationerne får ens beskæring, størrelse og skjult alternativ tekst, når den synlige label allerede beskriver dem.
3. Opdater hele kundesiden:
   - illustrationer i alle nøgletal øverst, herunder kunder i alt, privat, erhverv, omsætning og eventuel forfalden betaling;
   - tydelig illustration ved kundelistens skiftende label “Alle kunder”, “Private kunder” eller “Erhvervskunder”;
   - passende illustrationer i tomme tilstande og større kundeafsnit;
   - behold standardsymboler til se detaljer, rediger, slet, søg, filtrering og andre små kontroller.
4. Saml “Opret rute” på både aftalesiden og ruteplanlæggeren i den samme modalstruktur som “Opret bestilling”: ens bredde, header, scrollområde, sektionskort, felter, aftalevalg og fast footer på mobil og computer.
5. Opdater forsiden:
   - brug `Søg efter service`, `Sammenlign udbydere` og `Book eller hent tilbud` i tretrinsforløbet;
   - brug de tre angivne virksomhedsillustrationer ved “Flere kunder”, “Ruteplanlægning” og “Prisberegner”;
   - redesign “Manden bag Serviceydere” som en særskilt, rolig farveflade med stærkere billed-, tekst- og kortbalance;
   - brug illustrationerne til “Lokalt skal være let”, “Fair for virksomhederne” og “Et menneske…” i William-afsnittet.
6. Kobl de to personlige hjælpeknapper til appens eksisterende kundeservicechat-event og behold e-mail som en mulighed inde i chatoplevelsen.
7. Følg den vedhæftede placeringsliste i de øvrige paneler: services, medarbejdere, anmeldelser, omsætning, uge/måned samt medarbejderens rutevalg og statistik. Illustrationerne bruges kun i rummelige nøgletal, overskrifter, tomme tilstande og valgkort, hvor detaljerne kan aflæses.

## Designregler
- Ingen ændring af ikoner i venstremenu, bundnavigation eller kompakte handlingsknapper.
- Ingen detaljerede SVG'er i 12–20 px størrelse; de vises typisk omkring 28–48 px afhængigt af kortet.
- Eksisterende marine/teal-farver, lyse paneler, dark mode og `service-panel-*`-system bevares.
- Ingen nye funktioner eller ændringer i data og forretningslogik.

## Kontrol
- Kontroller forside, `/tilbud`, kundeside, services, medarbejdere, anmeldelser, medarbejderstatistik og rutevalg på mobil, lille computer og bred skærm.
- Kontroller begge “Opret rute”-indgange mod “Opret bestilling” og “Rediger rute”, inklusive lange aftalelister og mobilhøjde.
- Kontroller at chatten åbner fra begge knapper, at SVG'er er skarpe og uklippede, og at ingen navigation eller små knapper har fået illustrationerne.
- Kør typekontrol, relevante tests og den automatiske forhåndsvisningsbygning.
