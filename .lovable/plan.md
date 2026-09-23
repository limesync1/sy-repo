# Samlet redesign af virksomheds- og medarbejderpanel

## Mål
Udbred ruteplanlæggerens kompakte, professionelle designsprog til hele virksomheds- og medarbejderpanelet uden at ændre funktioner eller arbejdsgange. Venstremenuen får en meget lys grå baggrund i lys tilstand.

## Implementering

### 1. Fælles paneldesign
- Opret fælles panel-klasser og semantiske tokens for arbejdsflade, kort, værktøjslinjer, felter, tabeller, statusser og vinduer.
- Brug samme 4–6 px hjørner, tynde skillelinjer, diskrete skygger, marine/grafittekst og teal til fokus, valg og primære handlinger som i ruteplanlæggeren.
- Ensret normal, hover, aktiv, valgt, tastaturfokus, deaktiveret, indlæsning, succes, advarsel, fejl og tom tilstand.
- Bevar eksisterende mørk tilstand og sørg for korrekt kontrast.

### 2. Panelrammer og navigation
- Opdater virksomhedspanelets sidebar, topbar, mobilmenu og bundnavigation til det fælles design.
- Gør sidebaren meget let lysegrå i lys tilstand, med tydelig aktiv teal-markering og stabil mini-visning ved sammenfoldning.
- Opdater medarbejderpanelets topnavigation, profil-/virksomhedsvælger og mobilnavigation til samme designsprog.
- Bevar alle nuværende navigationspunkter, adgangsregler og panel-skift.

### 3. Alle virksomhedssider
- Redesign Overblik, Kom godt i gang, Services, Aftaler, Leads, Kunder, Medarbejdere, Anmeldelser, Livechat, Regnskab og Indstillinger.
- Ensret sidehoveder, statistikfelter, filtre, søgning, lister, tabeller, formularer, tomme tilstande, fejlvisninger og handlingsområder.
- Gør store, bløde standardkort mere kompakte og arbejdsorienterede uden at skjule information eller handlinger.

### 4. Alle medarbejdersider
- Redesign Min dag, Statistik, Livechat og rutekørslens omgivende paneler med samme kort-, status- og kontrolsystem.
- Bevar rutekørslens specialiserede kortoplevelse, men ensret dens vinduer, stopkort, kontrolknapper og beskeder med resten af panelerne.
- Sørg for tydelig, kompakt visning på computer, tablet og mobil.

### 5. Alle vinduer og flydende elementer
- Ensret dialogs, sheets, popovers, dropdowns, menuer, kalendere, bekræftelser, tooltips og toast-beskeder i begge paneler.
- Brug tydelige header-, indholds- og footerzoner, stabile luk-/handlingsknapper og mobilvenlig højde/bredde.
- Fjern visuelle særtilfælde, der ikke matcher det nye paneldesign.

### 6. Kontrol
- Kontroller de vigtigste sider og vinduer i lys og mørk tilstand ved desktop, tablet og mobil.
- Test navigation, sammenfoldet sidebar, filtre, menuer, formularer og centrale dialogs/sheets.
- Kør eksisterende tests og kontroller fejl, overlap, afskåret tekst og vandret scroll.

## Bevares uændret
- Funktioner, data, roller, tilladelser og arbejdsgange.
- Ruteplanlæggerens nuværende funktionelle krav og nøglefri kort.
- Dansk tekst og eksisterende indhold, medmindre en tekst kun ændres for at passe i et kontrolfelt.
