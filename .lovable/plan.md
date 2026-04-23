
Mål: gøre virksomhedspanelet markant mere standardiseret, professionelt og genkendeligt som et moderne adminpanel, inspireret af den klarhed og systematik man ser i Shopify-lignende produkter, men tilpasset Serviceyderes eget brand og en mere moderne, lettere visuel stil. Fokus er ét gennemgående system for layout, navigation, listevisning, formularer og handlinger.

1. Etablere en egentlig “admin app shell” som alle faner følger
- Opdatere `src/pages/Admin.tsx`, så panelet ikke længere føles som specialbygget sidebar + særskilte faner, men som en samlet app-ramme.
- Gøre sidebaren mere neutral, mørk og præcis:
  - mindre visuelt pynt
  - skarpere aktiv state
  - tydeligere sektionering
  - mere ens rækkehøjde og spacing
- Gøre topbaren enklere og mere standard admin-agtig:
  - tydelig sidetitel
  - diskret kontekstlinje
  - færre chips/toggles
  - samme mønster på alle faner

2. Indføre ét fælles UI-system for adminfladen
- Stramme `src/components/admin/shared/AdminUI.tsx` op, så alle faner bruger de samme byggesten i stedet for forskellige lokale layouts.
- Standardisere:
  - kompakt `PageHeader`
  - ens `SectionCard`
  - tæt `AppList` / `AppListRow`
  - rolige `InsightPill` / statuschips
  - mindre og mere præcise KPI-kort
  - tomme states med samme struktur
- Fjerne komponentmønstre der virker mere som marketing/landing page end som adminværktøj.

3. Omdesigne Overblik til et rigtigt driftsoverblik
- Opdatere `src/components/admin/DashboardTab.tsx`, så “Overblik” bliver mere som et moderne operations-dashboard og mindre som store præsentationsmoduler.
- Reducere:
  - meget store tal
  - brede hero-lignende moduler
  - lang forklarende tekst
  - for mange visuelle lag
- Erstatte med:
  - kompakte KPI’er med tabulære tal
  - en stram prioriteringssektion øverst
  - kortere og mere direkte handlingsblokke
  - en mere tabel-/listeagtig “Seneste bestillinger”
- Målet er, at brugeren på få sekunder kan forstå status, problemer og næste handling.

4. Harmonere Kunder med resten af adminsystemet
- Opdatere `src/components/admin/CustomersTab.tsx`, så fanen bruger samme header, samme filterlinje, samme sektionskort og samme lister som resten.
- Gøre kundelisten mere CRM-lignende:
  - tydelig primær kolonne
  - faste sekundære metadata
  - mindre badge-støj
  - mere konsekvent rækkeopbygning
- Stramme kundedetaljer og sidepanel/dialog-flow op, så redigering føles som samme system som øvrige faner.

5. Stramme kundedialogen op til et mere professionelt formularmønster
- Opdatere `src/components/admin/CustomerEditDialog.tsx`.
- Fjerne følelsen af blandede UI-stilarter i dialogen.
- Gøre dialogen mere standard admin-agtig:
  - tydelig sektionering
  - rolige inputgrupper
  - mindre dekorativ avatarblok
  - mere konsekvent feltspacing
  - færre visuelle variationer mellem privat- og erhvervskunde
- Målet er, at den føles som en naturlig del af samme produktfamilie.

6. Gøre Aftaler mere standardiseret og beslutningsorienteret
- Opdatere `src/components/admin/AftaleTab.tsx`, så den visuelt matcher resten af panelet.
- Erstatte særskilte kort- og detaljemønstre med:
  - ens headerstruktur
  - kompakte handlingsrækker
  - rolige statusvisninger
  - mere professionel ordredetaljevisning
- Nedtone farveflader og gøre status mere nøgtern og systematisk.
- Sikre at ordrebehandling, svar og progression bruger samme UX-logik som resten af admin.

7. Gøre Medarbejdere mindre special-case og mere admin-standard
- Opdatere `src/components/admin/EmployeesTab.tsx`.
- Stramme create/edit flowet op:
  - mindre formularblokke
  - mindre dekorativ avatar/farvebehandling
  - mere standard rækkevisning
- Fjerne eller nedtone elementer der virker eksperimentelle i forhold til de øvrige faner.
- Gøre medarbejderlisten mere konsistent med kunder og aftaler.

8. Gøre Services mere professionel og mindre “bygger-oplevelse”
- Opdatere services-delen i `src/pages/Admin.tsx`, især:
  - `ServicesTab`
  - `ServiceRow`
  - `ServiceForm`
  - relaterede previews
- Erstatte nuværende blanding af chips, previewbokse og step-flow med en mere strømlinet adminoplevelse.
- Gøre serviceoversigten mere som en professionel produkt-/ydelsesliste:
  - kompakt rækkevisning
  - tydelig kategori, type og pris
  - mindre støj omkring beskrivelse og badges
- Gøre formularen mere lineær og mindre wizard-agtig, så den minder mere om moderne SaaS-admin UX.

9. Gøre Anmeldelser mere analytisk og mindre widget-agtig
- Opdatere `src/components/admin/ReviewsTab.tsx`.
- Erstatte nuværende særskilte reviewkort med samme sektion-/listeprincip som resten.
- Nedtone stjernevisualisering og gøre indholdet mere datadrevet:
  - samlet score
  - verificering
  - dato
  - kommentar
- Målet er, at anmeldelser føles som driftsdata, ikke en social widget.

10. Samle Indstillinger ind under samme UI/UX-system
- Opdatere indstillinger-sektionen i `src/pages/Admin.tsx`, så den følger samme mønstre som øvrige faner.
- Fjerne eventuelle one-off layouts og store blokke.
- Gøre indstillinger mere modulære og forudsigelige:
  - ens sektionskort
  - samme titel-/beskrivelsesrytme
  - samme placering af gem-handlinger
  - samme formularlogik som i kunde- og service-redigering

11. Justere globale admin-styles så hele oplevelsen føles mere som et moderne standardprodukt
- Opdatere `src/index.css` admin-relaterede utilities.
- Flade baggrunde og paneler ud yderligere, så shell og indhold ikke kæmper mod hinanden.
- Indføre mere konsekvente tokens/utilities for:
  - paneler
  - separators
  - statuschips
  - kompakte tabeller/lister
  - hover/focus states
- Målet er ikke at kopiere Shopify visuelt 1:1, men at opnå samme modenhed, systematik og ro — med Serviceyderes mørke foreground + afdæmpede teal-accenter.

12. Afsluttende UX-harmonisering på tværs af alle faner
- Gennemgå hele panelet og fjerne:
  - lang, forklarende tekst der ikke hjælper
  - store moduler uden høj informationsværdi
  - unødvendige sekundære badges og pynt
  - inkonsistente knapper, radius og spacing
  - særskilte interaktionsmønstre kun brugt ét sted
- Ensrette:
  - CTA-hierarki
  - filterplacering
  - rækkeopbygning
  - tomme states
  - redigér/luk/gem-flow
  - hover/focus/adfærdsdetaljer

Tekniske detaljer
- Primære filer:
  - `src/pages/Admin.tsx`
  - `src/components/admin/shared/AdminUI.tsx`
  - `src/components/admin/DashboardTab.tsx`
  - `src/components/admin/AftaleTab.tsx`
  - `src/components/admin/CustomersTab.tsx`
  - `src/components/admin/CustomerEditDialog.tsx`
  - `src/components/admin/EmployeesTab.tsx`
  - `src/components/admin/ReviewsTab.tsx`
  - `src/index.css`
- Designretning:
  - moderne adminpanel
  - højere informationsdensitet
  - færre store kort
  - kortere tekst
  - stærkere systematik
  - roligere farvebrug
  - konsistent navigation og layout
- Retning ift. reference:
  - inspireret af etablerede adminpaneler med Shopify-lignende klarhed og struktur
  - men mere moderne, lettere og mere premium i udførelsen
  - uden at forlade Serviceyderes eget brand og farvebase

Acceptkriterier
- Panelet føles som ét samlet adminprodukt og ikke forskellige faner med forskellig stil.
- Sidebar, topbar, overblik og alle centrale faner bruger samme layoutlogik.
- Overblik er mere kompakt, mindre teksttungt og mere brugervenligt.
- Kunder, aftaler, medarbejdere, services, anmeldelser og indstillinger følger samme UI/UX-mønster.
- Store tal, store moduler og lange forklaringer er reduceret markant.
- Oplevelsen fremstår professionel, moderne og strømlinet.
- Resultatet minder om et modent standard adminpanel i kvalitet og forudsigelighed, men føles stadig som Serviceydere.
