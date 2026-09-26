# Plan: Ét samlet design på virksomhed-, medarbejder- og adminpanelet

## Resultat
Alle tre paneler skal opleves som samme produkt: samme lysegrå navigation, kompakte topbjælke, marine/teal-hierarki, tætte arbejdsflader, tydelige tilstande og ens adfærd på mobil, tablet og computer. Eksisterende funktioner, roller og dataflows bevares.

## Implementering

### 1. Én fælles panelramme
- Saml virksomhedens, medarbejderens og platform-admins rammer om de eksisterende fælles navigationselementer.
- Ensret sidebarbredder, logo-/identitetsfelt, aktiv markering, sammenfoldning, hovertekst, topbjælke, indholdsbredde og luft.
- Gør mobilnavigationen ens: samme højde, ikonbehandling, aktiv tilstand, badges, safe-area og “Mere”-adfærd.
- Bevar relevante forskelle som virksomhedsoplysninger, arbejdspladsvælger, admin-søgning og rolle-skift, men vis dem i samme struktur.

### 2. Fælles side- og indholdssystem
- Brug samme sidehoved, værktøjslinje, søgning, filtre, statistikfelter, sektionskort, tabeller/lister, tomme tilstande, fejl og indlæsning.
- Standardisér den kompakte geometri til små hjørner, tynde kanter, diskrete skygger, faste kontrolhøjder og ens typografisk skala.
- Fjern lokale store/bløde kort, afvigende gradienter og rå farver, især i platform-admin og ældre virksomhedssider.
- Bevar dashboardets mørke marine overblik som et bevidst fokusområde, men lad kontroller og undersektioner følge fællessystemet.

### 3. Vinduer og flydende elementer
- Gennemgå alle modaler, sidevinduer, dropdowns, popovers, kalendere, notifikationer, bekræftelser og guider i de tre paneler.
- Brug samme header-, indholds- og footerstruktur, lukkeknap, mellemrum, maksimale højde og scroll-adfærd.
- Gør faner i detaljevinduer mobile med vandret scroll eller kompakt omskiftning, så tekst og handlinger ikke klemmes.
- Ensret normal, hover, aktiv, valgt, fokus, deaktiveret, indlæser, succes, advarsel og fejl med semantiske farver.

### 4. Medarbejderpanelet
- Tilpas arbejdspladsvælgeren, Min dag, Statistik, Livechat, notifikationer, kvittering/print og ruteoversigter til den fælles sidebredde og kortstruktur.
- Bevar den aktive rutekørsels fokuserede kort-/listeoplevelse, men ensret dens kontroller, sheets, knapper og typografi med panelerne.
- Kontrollér lange virksomhedsnavne, arbejdspladser, beskeder, stopoplysninger og handlingsrækker på smalle skærme.

### 5. Virksomheds- og platform-admin
- Ensret virksomhedens eksisterende faner og ruteplanlæggerens omkringliggende navigation med fælles byggeklodser frem for lokale varianter.
- Flyt platform-admin ind i samme panelramme og samme designscope, inklusive mørk tilstand, portalvinduer og responsive indholdsmål.
- Standardisér platform-admins oversigtskort, arbejdskøer, lister, detaljer, oprettelsesguide, sikkerheds-/sundhedsvisninger og mobilnavigation.
- Bevar tætheden i adminpanelet, men fjern uens hjørner, rå statusfarver og skjulte handlinger.

## Teknisk retning
- Udvid de eksisterende semantiske paneltokens og fælles `AdminUI`/sidebar-byggesten; undgå nye lokale farver og særregler.
- Lad alle tre shells aktivere samme panelklasse, så portalbaserede vinduer også arver designet.
- Saml gentagne responsive mønstre i fælles komponenter frem for globale CSS-rettelser, der skjuler lokale problemer.
- Ret fundne React-ref-advarsler, hvis de kommer fra panelernes fælles wrapper eller interaktive elementer.

## Verifikation
- Test centrale sider og handlinger som indlogget virksomhed, medarbejder og platform-admin.
- Kontrollér 393, 768, 1280 og 1440 px samt lys og mørk visning.
- Åbn repræsentative modaler, sidevinduer, dropdowns og mobilmenuer; kontrollér overlap, afskæring, scroll, lange tekster og tastaturfokus.
- Kontrollér aktiv/inaktiv/disabled/loading/error states og at ingen side får vandret scroll.
- Kør relevante tests, typesikring og byggekontrol før afslutning.

## Afgrænsning
- Ingen ændringer af funktioner, adgangsregler, forretningslogik eller datamodel.
- Aktiv rutekørsel må fortsat have et fokuseret navigationslayout; ensretningen gælder dens designkomponenter og responsive adfærd.
