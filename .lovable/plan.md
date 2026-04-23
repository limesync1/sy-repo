
Mål: gøre virksomhedspanelet mere tydeligt, mere handlingsorienteret og mere unikt for Serviceydere, så hele oplevelsen på tværs af dashboard, faner og sidebar føles som ét samlet produkt med klar prioritering og bedre flow.

1. Etablere et tydeligere visuelt system for hele virksomhedspanelet
- Udvide de delte admin-komponenter i `src/components/admin/shared/AdminUI.tsx`, så de ikke kun er “kort”, men egentlige layout-byggesten med fast hierarki.
- Indføre et mere karakteristisk Serviceydere-udtryk med:
  - roligere baggrundsflader
  - tydeligere kontrast mellem primær handling, status og sekundær information
  - mere konsekvent spacing
  - ensartede radius, shadows og label-stile
- Tilføje fælles varianter til:
  - handlingsbanner / priority banner
  - KPI-række med primær og sekundære metrics
  - sektionstitler med bedre mikrohierarki
  - app-lignende listekort til tabeller/rækker
- Bruge eksisterende farver og brand-retning fra projektet, men gøre dem mere konsekvente i adminfladen.

2. Redesigne dashboardet fra “kortsamling” til handlingsflow
- Omlægge `src/components/admin/DashboardTab.tsx`, så siden læses i denne rækkefølge:
  1. vigtigste opmærksomhedspunkt
  2. performance-overblik
  3. næste anbefalede handlinger
  4. seneste aktivitet
- Gøre afventende bestillinger til et tydeligt topbanner, ikke bare et almindeligt kort.
- Banneret skal være visuelt mest dominerende og indeholde:
  - antal afventende bestillinger
  - kort forklaring
  - tydelig CTA til Aftaler
  - eventuelt sekundær statustekst hvis der ingen afventende er
- Gøre profilfuldendelse mere motiverende og mere “handlingsbaseret” i stedet for kun procentvis status.

3. Stramme KPI-området op og gøre tallene mere meningsfulde
- Opdatere KPI-kortene, så de får tydeligere prioritet:
  - fremhæve ét primært nøgletal, fx omsætning
  - gøre øvrige metrics mere kompakte og sekundære
- Tilføje let kontekst til nøgletal, hvor det er muligt uden backend-ændringer:
  - små udviklingsindikatorer
  - korte hints som “seneste 30 dage”, “aktive nu”, “siden sidst”
- Hvis der ikke findes sammenligningsdata nok, vise mere nyttige hints i stedet for tom pynt.
- Beholde overblikket hurtigt og letlæseligt, uden at gøre dashboardet tungere.

4. Gøre “Seneste bestillinger” mere scanbar og app-agtig
- Forbedre listen i `DashboardTab.tsx`, så rækkerne føles mere responsive og tydelige.
- Justere:
  - spacing
  - statusbadge-kontrast
  - typografisk hierarki
  - hover/focus-states
  - klikbarhed på hele rækken
- Gøre forskellen mellem “Afventer”, “Bekræftet”, “I gang”, osv. mere umiddelbar med stærkere visuelle cues.
- Fremhæve de vigtigste informationer først: kunde, status, beløb, dato.

5. Gøre profilfuldendelse mere motiverende og nyttig
- Omdanne profilsektionen fra generel status til konkret fremdrift.
- Knytte budskabet til fordel, fx synlighed/troværdighed/flere bookinger.
- Vise de vigtigste mangler som små næste skridt i stedet for kun en liste over manglende felter.
- Lade CTA’en føles som en progression frem for bare “Fuldfør profil”.

6. Forbedre sidebar og overordnet panelstruktur
- Opdatere sidebaren i `src/pages/Admin.tsx`, så den føles mere premium og mindre som en simpel mørk liste.
- Skærpe aktiv tilstand med tydeligere kontrast, så det er helt klart hvor man er.
- Gruppere navigation mere logisk, fx:
  - Overblik
  - Drift (Aftaler, Kunder, Medarbejdere, Ruter)
  - Indhold/forretning (Services, Anmeldelser)
  - Opsætning (Indstillinger)
- Forfine business-headeren i sidebaren, så den føles mere som en identitetsblok.
- Sikre at topbaren, sidebar og indholdsområde visuelt hænger sammen som samme produkt.

7. Udrulle den nye stil konsekvent til de vigtigste faner
- Anvende samme designretning på centrale faner, så panelet ikke skifter karakter fra side til side.
- Starte med:
  - `src/components/admin/AftaleTab.tsx`
  - `src/components/admin/CustomersTab.tsx`
  - `src/components/admin/EmployeesTab.tsx`
  - `src/components/admin/ReviewsTab.tsx`
- Fokusere på:
  - ens sideheaders
  - ens sektionkort
  - ens liste-/rækkeoplevelse
  - ens tomme states
  - ens CTA-hierarki
- Målet er, at alle faner føles som variationer af samme system, ikke separate mini-designs.

8. Finpudse Serviceydere-identiteten i adminoplevelsen
- Gøre layoutet mere unikt til Serviceydere uden at overdesigne:
  - lidt stærkere brandet accent-brug
  - mere konsekvent brug af foreground/accent i badges, ikoner og handlinger
  - mere professionel panelæstetik frem for generiske dashboard-kort
- Holde stilen enkel, lys og effektiv, i tråd med resten af projektets nuværende designretning.

Tekniske detaljer
- Primære filer:
  - `src/components/admin/DashboardTab.tsx`
  - `src/components/admin/shared/AdminUI.tsx`
  - `src/pages/Admin.tsx`
  - `src/components/admin/AftaleTab.tsx`
  - `src/components/admin/CustomersTab.tsx`
  - `src/components/admin/EmployeesTab.tsx`
  - `src/components/admin/ReviewsTab.tsx`
  - eventuelt små token-/utility-justeringer i `src/index.css`
- Hovedgreb:
  - flere fælles admin-UI-varianter frem for lokale one-off kort
  - dashboard med tydelig topprioritet og bedre informationsflow
  - sidebar med stærkere aktiv state og bedre gruppering
  - konsekvent Serviceydere-look på tværs af faner

Acceptkriterier
- Dashboardet kommunikerer tydeligt på få sekunder:
  - hvad kræver opmærksomhed
  - hvordan går forretningen
  - hvad bør brugeren gøre nu
- Afventende bestillinger er den mest visuelt dominerende handling på overblikket.
- KPI-området føles mere struktureret og mindre tilfældigt.
- “Seneste bestillinger” er lettere at scanne hurtigt.
- Profilfuldendelse føles mere motiverende og mindre anonym.
- Sidebarens aktive tilstand og gruppering er tydeligere.
- De vigtigste faner deler samme stil, spacing og komponentlogik.
- Virksomhedspanelet føles mere samlet, mere professionelt og mere unikt til Serviceydere.
