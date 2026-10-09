# Samlet UX-opgradering af rutekørsel, paneler og navigation

## Mål
Gøre rutekørsel, tjekliste, kort-HUD, aftalevinduer og de berørte virksomheds-/medarbejdersider tydelige og ensartede på mobil, tablet og computer uden at ændre manuel tidsregistrering eller prisregler.

## 1. Rutekørsel, tjekliste og kort-HUD
- Indføre tre bevidste visninger i stedet for ét mobilformat: kompakt mobil, tablet og bred computer.
- På mobil: mindre knapper, mere synligt kort, faste safe-area-zoner og ingen overlap mellem topbjælke, manøvre, GPS-/forbindelsesfejl, notifikationer og stophandlinger.
- På tablet: udnytte bredden med et bredere HUD og bedre placering af manøvre-/stopinformation frem for opskaleret mobilvisning.
- På computer: placere HUD og stophandlinger i et bredere sideområde, så kortet og oplysningerne kan bruges samtidig.
- Ensrette tjeklistens topbjælke, nuværende stop, dagens stop, tidsdata, nattilstand, lyd og skift mellem liste/kort.
- Erstatte den skjulte native “Flere muligheder”-visning med en tydelig menu. Omskrive “Markér som udført uden tidsregistrering” til en forståelig særhandling med forklaring og bekræftelse, mens manuel tidsregistrering forbliver standard.
- Samle tids-, ETA- og varighedsformatering, så guide og tjekliste viser samme værdier og ordvalg.

## 2. Oplysninger, kontakt og handlinger ved et stop
- Redesign “Oplysninger” med samme overlay-sprog som ruteplanlæggeren: kompakt header, tydelige sektioner, stabile footers og passende bredde pr. enhed.
- Gøre navigation, telefon, tidsregistrering, ret aftale, ny aftale og note til kontoret til klart adskilte handlinger med semantiske farver og mindre knapper.
- Bevare én fælles visning i kort- og tjeklistetilstand, så funktioner og fejlhåndtering ikke afviger.
- Gøre alle indlæsning-, offline-, tomme-, gemme- og gentagelsesfejl handlingsorienterede med “Prøv igen” eller et afklaringsvindue, hvor brugerens valg har konsekvenser.

## 3. Ret aftale og opret ny aftale under kørsel
- Omlægge begge flows til samme trinvise, responsive editor med tydelig kundekontekst, valgte services, prisopsætning, interval, foreløbig opstartsdato og opsummering før gem.
- Vise præcis de felter servicens prismodel kræver: fast pris, timepris eller alle trin i prisberegneren. Endelig pris beregnes fortsat sikkert på serveren.
- Erstatte det nuværende native datofelt i “Ny aftale” med den fælles `DatePickerField`/custom kalender og teksten “Foreløbig opstartsdato”, som i “Opret bestilling”.
- Bevare valget mellem kun dette besøg og kommende besøg; forklare interval-/rutekomplikationer før gem.
- Ved ny aftale: spørge tydeligt om en egnet engangsopgave i dag skal på den aktuelle rute; andre datoer og gentagelser går til “Aftaler uden rute” med forklaring.
- Bruge projektets illustrationer i vindueshoveder, men almindelige genkendelige ikoner i handlingsknapper.

## 4. Medarbejderprofil og medarbejdernavigation
- Tilføje “Rediger profil” i medarbejderens profilmenu.
- Lade medarbejderen ændre eget navn og profilbillede i et responsivt vindue med preview, uploadstatus, validering, fejl og sikker annullering af ugemte ændringer.
- Begrænse ændringen til medarbejderens egen profil; arbejdsrolle, løn/provision og virksomhedstilknytning forbliver administreret af virksomheden.
- Fjerne den dobbelte profil-/kontonavigation på mobil, så samme handlinger ikke findes både i topbjælken og nederst i menuen.

## 5. Offentlige sider og navigation
- Genbruge forsidens seneste designprincipper på øvrige offentlige sider: tydelig blå/lys sektionering, samme typografi, knapkontrast, ikonflader, afstande og fælles `PageHero`-mønster — uden at kopiere forsidens WebGL til arbejdsflader eller formularsider.
- Samle testfase-striben og den hvide hovednavigation som én forståelig topstruktur. Forsiden monterer i dag testfase-striben globalt og `SiteNav` i selve siden, hvilket opleves som to headers.
- Kontrollere sticky-adfærd, mobilmenu, login/panelskift, mørk tilstand og scroll på alle offentlige sidetyper.

## 6. Virksomhedens ruteplanlægger
- På mobil fjerne “Opret bestilling” fra “Aftaler uden rute”, men beholde den ene primære knap i mobilens topværktøjslinje. Computerens primære topknap bevares.
- Forkorte og ombygge sortering/filter til kompakte, læsbare kontroller med tydelige valgte tilstande; bevare avancerede filtre uden at presse teksten sammen.
- Fjerne autofordeling helt på mobil og computer: knapper, hjælpetekst, tastaturgenvej, live og forældet kode samt relaterede tomtilstandstekster. Manuel tildeling, multivalg og træk/tryk bevares.
- Samle de tre breakpoint-specifikke topbjælker omkring delte kontroller, så ens handlinger ikke driver fra hinanden.
- Opdatere hele `PlannerSkeleton`, så mobil, tablet, mellemstor computer og bred computer matcher den færdige ruteplanlægger uden layout-hop.
- Omlægge “Flyt aftale” og de øvrige flytte-/datovinduer til samme nye design, fælles custom kalender, fælles valg for dette/kommende besøg og relevant projektillustration i headeren.

## 7. Leads og services på mobil/tablet
- Omlægge Leads efter den responsive kort-/værktøjslinjestruktur fra Aftaler/Kunder: stablede nøgletal, søgning, filtre og statusvalg uden vandret klemning; store datarækker bliver trykvenlige kort på mobil og mere kompakte på tablet/computer.
- Bevare bulkvalg, kilder, konti, opfølgning og leaddetaljer, men gøre deres placering og hierarki ens på tværs af enheder.
- Omlægge opret/rediger service til fuldhøjde mobil-sheet og bredt sidepanel/dialog på større skærme.
- Reducere overskrifter, kort, forklaringstekster og valgflader på mobil; ensrette feltlabels og gøre pris-, prisberegner-, interval- og regnskabsfelter lettere at skanne.
- Bevare alle nuværende servicefunktioner og valideringer.

## 8. Kontrol
- Teste indlogget som en rigtig medarbejder og virksomhedsejer ved ca. 390×710, kort mobilhøjde, 768×1024, 1024×768, 1280×900 og 1440×1000.
- Gennemføre centrale flows: start rute, kort↔tjekliste, oplysninger, kontakt/navigation, start/stop tid, udfør med/uden tid, fortryd, ret aftale, ny aftale, datovalg, offline/gemmefejl og mørk tilstand.
- Gennemføre ruteplanlæggerens mobilflow, flyt dato, multivalg og manuel rutetildeling; kontrollere at autofordeling og den ekstra mobilknap er væk.
- Gennemføre profilredigering, Leads og service-opret/rediger på mobil/tablet/computer.
- Kontrollere normal, hover, aktiv, fokus, deaktiveret, indlæsning, tom og fejltilstand; ingen overlap, afskåret tekst, vandret overflow eller mobilzoom i felter.
- Køre målrettede regressionstests, browserkontrol med skærmbilleder og kontrollere den aktuelle buildstatus.

## Tekniske rammer
- Samle responsive grænser og delte HUD-/overlaymønstre i fælles komponenter frem for flere kopier i den store ruteside.
- Bevare semantiske designtokens, mørk tilstand, fælles panelrammer og serverstyret prisberegning.
- Ingen automatisk tidsstart, ingen automatisk markering som udført og ingen genindførelse af “Find den bedste rute”.
