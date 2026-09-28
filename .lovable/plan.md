# Samlet løft af medarbejderpanel, ruter og platform

## Mål
Gøre medarbejderpanelet lige så sammenhængende som virksomhedspanelet, forenkle rutekørsel markant og rette de konkrete fejl i tilladelser, kundevinduer, rutehandlinger, tekster, supportidentitet og indlæsning. Funktionerne bevares, men information og handlinger samles i et mere roligt og ensartet flow på mobil, tablet og computer.

## 1. Medarbejdere, tilladelser og arbejdspladser
- Fjern “Maks. timer” fra daglig kapacitet i redigering af medarbejdere og stop med at gemme feltet fra formularen. Maks. stop og kilometer bevares.
- Ret Livechat-adgangen, så den valgte arbejdsplads og medarbejderens tilladelse bruges konsekvent. Direkte adgang til siden kontrolleres med samme regel som navigationen.
- Redesign “Dine arbejdspladser” som en enkel del af medarbejderpanelets fælles ramme med korrekte, uk beskårne logoer og tydelig aktiv arbejdsplads.
- Ved arbejdspladsskift skiftes kontekst først, hvorefter alle arbejdspladsafhængige forespørgsler nulstilles og genhentes. Gamle ruter, statistik og beskeder må aldrig blive stående.
- Gør “Tillad tidlig udførelse” optimistisk: kontakten reagerer straks, ruller tilbage ved fejl og opdaterer kun de relevante data i stedet for hele siden.

## 2. Nyt medarbejderpanel og kalenderoverblik
- Brug virksomhedspanelets samme sidebredde, navigation, topbjælke, kort, knapper, farver, fokus-/hovertilstande og mobilstruktur som fælles facit.
- Gør “Min dag” mere kalenderdrevet: dage får diskrete markeringer for ruter og stopbaseret travlhed; valg af dag viser ruter og aftaler direkte.
- Gør “Statistik” til samme kalender-/periodeoplevelse med let aflæselig travlhed, ruter, aftaler og faktisk registreret tid.
- Fjern unødvendige fold-ud-sektioner i aftaledetaljer. Beløb, ruteinfo, faktisk tid og øvrige relevante oplysninger vises med det samme, når skærmpladsen tillader det, og stables overskueligt på mobil.
- Redesign “Omsætning” og “Min/medarbejderens andel” som et forklarende beløbsresumé: total, beregningsgrundlag og andel adskilles visuelt og uden talstøj. Medarbejderen ser fortsat kun de beløb, vedkommende må se.

## 3. Rutekørsel bygget til brug i bilen
- Behold obligatorisk valg ved hver ny rutestart mellem “Listevisning” og “Kortvisning”; fjern automatisk genbrug af et tidligere valg, så medarbejderen altid ved, hvilken visning der starter.
- Genopbyg kortvisningen omkring én primær handling og én tydelig næste aftale: stabilt nøglefrit kort, retning, afstand, enkel status og store trykflader. Sekundære oplysninger og kontroller må ikke konkurrere med kørslen.
- Genopbyg listevisningen som en kompakt, håndholdt arbejdsliste med tydelig aktiv aftale, start/udfør, ring og ekstern navigation.
- Fjern gentagne forslag om “Optimér rækkefølge”. Resterende stop optimeres automatisk og lydløst ved rutestart, efter en udført aftale og ved en reel ruteafvigelse — aldrig kontinuerligt eller ved GPS-støj.
- Automatisk optimering må ikke flytte den aktive aftale, færdige stop eller bryde låste regler. Ny rækkefølge og rutelinje vises straks; fejl beholder sidste gyldige rute uden at forstyrre chaufføren.

## 4. Faktisk tid pr. aftale
- Brug den eksisterende sikre `stop_time_entries`-model i stedet for planlagte varigheder.
- Kortvisning starter tiden automatisk, når medarbejderen stabilt er ankommet inden for stopradius; listevisning får en tydelig “Start aftale”.
- “Aftale udført” afslutter den aktive registrering. Fortryd udført håndterer også tidsregistreringen korrekt uden at opfinde planlagte tider.
- Vis faktisk forløbet tid som timer, minutter og sekunder i medarbejderens detaljer/statistik og virksomhedens relevante aftale- og medarbejdervisninger.
- Bevar den separate arbejdstidsmåling for hele dagen.

## 5. Rutehandlinger og aftaledetaljer i virksomhedspanelet
- Tilføj “Fortryd udført” på udførte stop i virksomhedspanelet.
- Udfør handlingen atomisk i databasen: stop sættes tilbage til afventende, afsluttede afledte registreringer korrigeres efter de eksisterende regler, og en helt færdig rute genåbnes automatisk. Handlingen registreres i historikken.
- Når en aftale klikkes fra virksomhedsforsiden, åbnes præcis samme aftaledetalje som på “Aftaler” — ikke kun selve fanen.
- Genbrug én fælles detailvisning begge steder, så funktioner og layout ikke driver fra hinanden.

## 6. Smartere notifikationer
- Gør medarbejdernotifikationer til rolige informationsrækker, der ikke navigerer ved klik.
- Vis altid korrekt kontekst: rutefarve, rutenavn og, hvis relevant, aftalens kunde/service/adresse. Ulæst-status og dato står tydeligt.
- Tilføj sletning af én eller alle notifikationer med sikker adgangskontrol, optimistisk UI og fortrydelsesmulighed.
- Tilføj en enkel “Send besked” ved en specifik aftale i virksomhedspanelets aftaledetalje/rutestop, med valg af tildelt medarbejder. Beskeden gemmes med både rute- og stopreference.
- Bevar rute-beskeder som separat mulighed, men gør forskellen mellem rute og aftale tydelig.

## 7. Kunde-, logo- og formularrettelser
- Redesign “Opret ny kunde”, så adresselisten åbner over indholdet uden intern dobbelt-scroll. Listen kan trykkes direkte, tastaturnavigeres og lukker efter valg.
- Ret virksomhedslogoer på offentlige virksomhedssider og i paneler til `object-contain` i en stabil ramme, så hele logoet altid ses.
- Forkort og tilpas placeholderen ved “Firmanavn”, så den er læsbar på små skærme; forklar CVR-autoudfyldning som hjælpetekst under feltet.
- Kontrollér alle relevante formularer for afskåret tekst, overlappende dropdowns og utilgængelige handlinger.

## 8. Sprog og indhold
- Gennemgå alle brugervendte interne paneltekster manuelt og erstat “opgave/opgaver” med “aftale/aftaler” eller “stop”, når teksten faktisk handler om en aftale eller et rutestop.
- Bevar “opgave” hvor det betyder kundens frie opgavebeskrivelse, tilbudsforespørgsel eller generelt fagarbejde.
- Vis brandnavnet som “E-conomic” overalt i brugerfladen, på forsiden, software-/guidesider og i e-mails. Tekniske integrations-id’er ændres ikke.

## 9. Kundeserviceidentitet og ny personlig sektion
- Læg det vedhæftede robotikon og portrættet af William i projektets billedlager.
- Før menneskelig overtagelse bruger kundeservice robotikonet og en neutral serviceidentitet. Ved eskalering eller svar fra et menneske skifter avatar og navn til “William Ross Jepsen”. “Serviceydere AI” fjernes som synligt supporternavn.
- Tilføj en ny, tydeligt adskilt sektion lige før “Alt du skal bruge for at drive din servicevirksomhed”. Den præsenterer William, hvorfor Serviceydere blev skabt, fokus på enklere drift og personlig hjælp — med portrættet som tydeligt, autentisk element.
- Fjern de hvide kortkanter i “Trygt valg, hver gang” og brug afstand, svag fladekontrast og ikoner til at skabe struktur i stedet.

## 10. Skeletons og oplevet hastighed
- Kortlæg alle egentlige sideindlæsninger i offentlig side, virksomhedspanel, medarbejderpanel og platform-admin.
- Erstat tomme route-fallbacks og generiske loaders med et lille fælles sæt layoutsvarende skeletons: offentlig indholdsside, dashboard, liste/tabel, statistik, formular/detailvindue, ruteplanlægger og aktiv rutekørsel.
- Skeletons skal matche den endelige højde og struktur for at undgå layout-hop, respektere mørk tilstand og reduceret bevægelse og ikke vises ved små baggrundsopdateringer.
- Bevar eksisterende gode skeletons, men ensret mål, hjørner og rytme med panelsystemet.

## Teknisk udførelse
- Nye databaseændringer laves som migrationer med eksplicitte grants, RLS og policies. Medarbejdere kan kun slette egne notifikationer; virksomhedsejere/admin kan håndtere egne virksomhedsdata.
- Atomiske rutehandlinger laves som databasefunktioner, så stopstatus, rutestatus, tidsregistrering og historik ikke kan ende halvt opdateret.
- Query keys skal indeholde aktiv arbejdsplads, og skift skal annullere gamle requests før ny indlæsning.
- Automatisk optimering throttles og aktiveres kun ved relevante hændelser; kort/GPS-opdateringer pauses fortsat, når skærmen er skjult.
- Alle nye billeder bruges via projektets CDN-assetflow.
- Eksisterende regler bevares: ingen synlige planlagte mødetider eller servicevarigheder, nøglefrit kort, dansk UI og samme designsystem i alle paneler.

## Kontrol
- Test Livechat-tilladelse og skift mellem mindst to arbejdspladser uden genindlæsning.
- Test liste- og kortkørsel, automatisk optimering, ankomst/start, udfør og faktisk stoptid.
- Test “Fortryd udført” på både delvist og helt færdig rute.
- Test rute- og aftalenotifikation, læst-status, sletning og adgangsregler.
- Test kunde-/adressevalg, dashboard-aftaledetalje, logoer og formularer med touch og tastatur.
- Kontrollér forsiden og alle tre paneler ved 393, 768, 1280 og 1440 px i lys og mørk tilstand.
- Kør relevante rute-, tids-, permissions- og integrationstests samt typekontrol og build. Projektet publiceres ikke.
