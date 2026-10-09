# Samlet redesign af alle offentlige undersider

## Mål
Opdatere alle sider, der kan nås fra footeren, så de føles som samme platform som forsiden: tydelig blå/lys sektionsrytme, høj ikonkontrast, rolige overgange, ensartede knapper og indhold, der prioriteres forskelligt på mobil, tablet og computer.

## 1. Fælles designramme
- Samle de offentlige sider om fælles hero-, sektions-, kort-, CTA- og artikelmønstre frem for side-specifikke kopier.
- Bevare forsidens mørkeblå visuelle identitet og tydelige lyse sektioner, men bruge den levende baggrund mere afdæmpet på undersider, så indholdet forbliver let at læse.
- Fjerne dekorative små labels, chips og fakta-striber, der blot gentager overskriften eller fylder under heroen. Brødkrummer, filtre, statustekster og juridisk navigation bevares, når de faktisk hjælper brugeren.
- Reducere store illustrationer og ikonflader til et ensartet hierarki med tydelig lys kontrastbaggrund. Hjælpecentrets nuværende 80 px ikonfelter gøres mindre og mere balancerede.
- Ensrette overskrifter, sektionsafstande, knapper, kort, fokus-, hover-, aktiv- og deaktiverede tilstande med projektets eksisterende designtokens.

## 2. “Bliv udbyder”
- Fjerne fakta-striben under heroen og gøre introduktionen kortere, så CVR-oprettelsen kommer tidligere frem på mobil.
- Omlægge formularens trin til mere rolige, kompakte sektioner med tydelig fremdrift, bedre feltgrupper og mindre tilvalgsikoner.
- Gøre prisoversigten responsiv: sidekolonne på brede skærme, kompakt sammenfatning på tablet og en sikker bundhandling på mobil uden at dække formular eller footer.
- Erstatte den faste 400 px desktopkolonne med et flydende layout, så især tablet og små computere ikke får en klemt formular.
- Bevare CVR-opslag, livepris, funktioner, logins, faktureringsperiode, validering og oprettelseslogik uændret.

## 3. “Systemet” og alle sider for virksomheder
- Redesign systemoversigten med en tydeligere første handling, mindre kortikoner og færre gentagne signaler over folden.
- Fjerne fakta-striben under heroen og samle søgning, funktionsoversigt, pris og CTA i en roligere sektionsrytme.
- Opdatere den fælles skabelon for ruteplanlægger, medarbejder-app, booking/tilbud, fakturering, brancher, priser og branchespecifikke systemsider, så én ændring gælder hele produktuniverset.
- På mobil vises kerneforklaring og vigtigste handling først; lange fakta- og relaterede lister bliver sammenfoldelige eller flyttes længere ned. På tablet udnyttes to kolonner, mens computer beholder læsevenlig hovedtekst og sideoversigt.

## 4. Anmeldelser, Om os og Support
- Redesign Anmeldelser uden unødige “forhåndsvisning”, “eksempel” og andre pyntelabels. Gør tom/kommende-anmeldelser-tilstanden ærlig, kompakt og handlingsorienteret.
- Forenkle Om os ved at fjerne gentagne sektionslabels, reducere statistik- og ikonstørrelser og skabe tydeligere skift mellem mission, kategorier, geografi, principper og kontakt.
- Opdatere Hjælpecenter med mindre afbalancerede emneikoner, kompakte genveje, en bedre mobil søge-/filterlinje og FAQ, der er let at skanne på touchskærme.
- Opdatere Kontakt og øvrige supportsider med et enklere informationshierarki, mere direkte kontaktmuligheder og mindre gentagelse mellem hero, kontaktkort og CTA.

## 5. Guides, prisguides og blog
- Opdatere Guides-indekset, guidehubs, prisguides og byoversigter gennem de fælles guide-/artikel-skabeloner, så alle kort, pristabeller, fakta, FAQ og CTA’er følger samme visuelle system.
- Gøre lange indekslister progressive: vigtigste emner vises først på mobil med “Vis flere”, tablet viser flere kolonner, og computer viser hele overblikket uden unødige chips.
- Opdatere blogindeks, kategorisider og alle blogartikler gennem det fælles artikel-layout; fjerne dekorative kategori-/læsetidslabels, hvor oplysningerne allerede fremgår, men bevare nyttig artikelmetadata ét sted.
- Gøre tabeller til mobilvenlige rækker/kort, hvor vandret tabelvisning ellers bliver trang, uden at skjule priser eller noter.

## 6. Politikker og juridiske sider
- Bevare søgning, print, læseprogression, delbare afsnit og indholdsfortegnelse, fordi de er funktionelle.
- Gøre dokumentvælgeren kompakt og sammenfoldelig på mobil i stedet for en permanent række af chips under heroen; tablet og computer får en tydelig, men rolig dokumentnavigation.
- Forenkle afsnitskort og metadata, forbedre linjelængde og mellemrum og sikre, at lange ord, links og tabeller aldrig skaber vandret rulning.
- Lade alle politikker arve ændringerne fra den fælles juridiske skabelon.

## 7. Responsiv indholdsprioritering
- Bruge responsive breakpoints og progressive disclosure frem for browser-/enhedsgenkendelse: ca. 390 px mobil, 768 px tablet og 1280 px computer.
- Mobil: én kolonne, mindre illustrationer, korte introduktioner, fuldbrede primære handlinger og sammenfoldning af sekundære lister.
- Tablet: bevidste to-kolonnelayouts, ingen opskaleret mobilvisning og ingen faste sidekolonner, der klemmer hovedindholdet.
- Computer: bredere oversigter og sideindhold, men begrænset tekstbredde og uden overdimensionerede tomme flader.
- Indhold må kun skjules visuelt, når det er sekundært og stadig kan åbnes; vigtigt indhold, priser, vilkår og SEO-tekst forbliver tilgængeligt.

## 8. Navigation, indlæsning og kontrol
- Bevare den ene vedvarende offentlige navigation og sikre, at redesignede sider ikke genindfører dobbelte headers eller layoutskift ved navigation.
- Opdatere offentlige skeletons, så hero, kortgitre, artikler og formularer matcher de nye layouts uden hop; fjerne eventuelle resterende ubrugte offentlige skeleton-varianter.
- Browserkontrollere alle footerlinks og repræsentative sider fra hver fælles skabelon ved 390×710, 768×1024 og 1280×900 samt korte mobilhøjder.
- Kontrollere navigation, filtre, søgning, FAQ, dokumentvælger, formularflow og CTA’er i normal-, hover-, aktiv-, fokus-, loading-, tom- og fejltilstand.
- Verificere ingen vandret overflow, afskåret tekst, skjulte handlinger, fokuszoom eller overlappende sticky elementer; køre relevante tests og kontrollere den aktuelle buildstatus.

## Tekniske rammer
- Ændringer skal primært ske i de delte offentlige skabeloner og små genbrugelige sektionskomponenter, så alle relaterede sider følger med og ikke driver fra hinanden.
- Bevar eksisterende SEO, strukturerede data, URL’er, juridisk indhold og forretningslogik.
- Brug kun semantiske farve- og skyggetokens; ingen nye rå farver eller parallelle designsystemer.