
Mål: lave en reel, synlig redesign af virksomhedspanelet, så hele oplevelsen bliver konsekvent, professionel og tydeligt moderniseret i én samlet retning. Det nuværende problem er, at der stadig er blandede mønstre i koden: nogle faner bruger de nye admin-komponenter, mens andre stadig bruger gamle kort, forskellige filterlinjer, forskellige spacing-systemer, store tekstblokke og særskilte interaktioner. Det giver et ujævnt og uprofessionelt resultat.

1. Gøre admin-shell og sidebar markant mere standardiseret
- Opdatere `src/pages/Admin.tsx`, så venstremenu, topbar og content-ramme får en mere moden SaaS-struktur.
- Stramme sidebaren op:
  - mindre visuel vægt i virksomhedsblokken
  - mere præcis aktiv state
  - ens nav-rækker
  - tydeligere sektioner uden støj
- Forenkle topbaren:
  - én tydelig titel
  - kort kontekstlinje
  - færre ekstra elementer
  - samme mønster på alle faner
- Fjerne alt der stadig føles som specialbygget layout fremfor standard adminpanel.

2. Gøre `AdminUI.tsx` til det faktiske fælles designsystem
- Stramme `src/components/admin/shared/AdminUI.tsx` yderligere op, så alle faner bygges ud fra samme primitives.
- Ensrette:
  - `PageHeader`
  - `SectionCard`
  - `StatCard`
  - `AppList` / `AppListRow`
  - `InsightPill`
  - formularetiketter og actions
- Reducere stadig for store størrelser og for meget luft.
- Indføre et fast mønster for:
  - header
  - filter-/action-række
  - indholdssektion
  - liste
  - tom state
  - edit/create-flows

3. Redesigne Overblik, så det faktisk føles brugervenligt
- Opdatere `src/components/admin/DashboardTab.tsx`, fordi det stadig bruger store moduler, store tal og for meget forklarende tekst.
- Gøre overblikket mere operations-orienteret:
  - mindre hero-følelse
  - mindre talstørrelser
  - færre tekstlinjer
  - mere kompakte KPI’er
  - mere tabulær “seneste aktivitet”
- Forenkle profilstyrke- og næste handlinger-sektionerne, så de ikke føles som separate kortfamilier.
- Målet er, at brugeren kan afkode status på få sekunder.

4. Ensrette Aftaler med samme liste- og detaljelogik
- Opdatere `src/components/admin/AftaleTab.tsx`, som stadig har mange egne visuelle mønstre.
- Samle siden i samme system som resten:
  - kompakt page header
  - ens filterlinje
  - ens statuschips
  - ens sektioner
  - ens listehierarki
- Gøre ordredetaljer mere strømlinede:
  - mindre tekst
  - mindre kontraststøj
  - mere tydelig prioritering af status, kunde, tidspunkt, beløb og handling

5. Gøre Kunder til et konsekvent CRM-mønster
- Opdatere `src/components/admin/CustomersTab.tsx`, så den ikke længere blander sheet-logik, statskort og forskellige row-stile.
- Indføre fast CRM-opsætning:
  - kompakt statistik
  - tydelig filterlinje
  - konsekvent kundeliste
  - samme detailvisning som resten af admin
- Gøre kunderækker lettere at skimme med fast prioritet:
  - navn / virksomhed
  - kontaktinfo
  - omsætning / aktivitet
  - status / type
  - handling

6. Gøre kundedialogen mere professionel og mindre “feature-tung”
- Opdatere `src/components/admin/CustomerEditDialog.tsx`.
- Fjerne visuelle særtilfælde:
  - tung profilblok
  - for mange separate sektioner
  - ujævn spacing
- Gøre dialogen mere standard admin:
  - faste formulargrupper
  - ens inputhøjder
  - tydelig primær handling
  - mere kompakt rytme
- Sikre at privat- og erhvervskunde følger samme grundmønster.

7. Gøre Medarbejdere enklere, mere administrative og mindre særlige
- Opdatere `src/components/admin/EmployeesTab.tsx`.
- Fjerne special-case UI omkring avatar/farvevalg som dominerer for meget visuelt.
- Gøre listen mere lig kunder og aftaler:
  - samme rækkehøjde
  - samme metaopbygning
  - samme actionzone
- Gøre opret/redigér-flow mere kompakt og konsekvent med resten af panelet.

8. Gøre Services markant mere strømlinet
- Opdatere services-delene i `src/pages/Admin.tsx`:
  - `ServicesTab`
  - `ServiceRow`
  - `ServiceForm`
  - `CalculatorPreview`
- Fjerne rester af builder-/wizard-følelse og store blokke.
- Gøre serviceoversigten mere som et professionelt katalog:
  - tæt listevisning
  - tydelig service, kategori, prissystem og status
  - færre sekundære chips
- Gøre formularen mere lineær og mere som moderne adminsoftware.
- Nedtone previewet, så det bliver støtteinformation og ikke et visuelt hovednummer.

9. Gøre Anmeldelser mere analytisk og mindre widget-agtig
- Opdatere `src/components/admin/ReviewsTab.tsx`.
- Beholde samme fælles system som øvrige faner:
  - samme header
  - samme stat-kort logik
  - samme listevisning
  - samme spacing og tonalitet
- Nedtone stjerner og visuelle effekter, så fokus bliver på data og feedback.

10. Gøre Indstillinger lige så strømlinet som resten
- Opdatere `SettingsTab` i `src/pages/Admin.tsx`, som stadig har mange gamle mønstre:
  - store formularfelter
  - ujævne knapper
  - forskellige toggle-stilarter
  - blokke med forskellig visuel vægt
- Ensrette hele indstillingssiden med samme adminsystem:
  - ens sektionskort
  - ens labels
  - kompakte inputfelter
  - standardiserede toggles
  - fast save-logik
- Fjerne emoji-/kategori-knap-følelse og gøre alt mere professionelt.

11. Rydde op i globale admin-styles
- Opdatere `src/index.css`.
- Stramme de globale admin-utilities op, så shell og indhold arbejder bedre sammen.
- Indføre mere konsekvente utilities for:
  - panelbaggrund
  - listeheaders
  - separators
  - rolige chips
  - hover/focus states
- Målet er at fjerne den “mærkelige” følelse, der opstår når forskellige overflader kæmper mod hinanden.

12. Gennemføre en samlet harmonisering på tværs af alle faner
- Fjerne:
  - lange beskrivelser
  - store modulhøjder
  - blandede badge-stile
  - one-off cards
  - inkonsistente CTA’er
  - forskellige row- og formularmønstre
- Ensrette:
  - spacing
  - radius
  - typografi
  - hierarchy
  - CTA-placering
  - tomme states
  - redigeringsflows
- Resultatet skal være en tydelig, synlig redesign — ikke små kosmetiske justeringer.

Tekniske detaljer
- Filer der opdateres:
  - `src/pages/Admin.tsx`
  - `src/components/admin/shared/AdminUI.tsx`
  - `src/components/admin/DashboardTab.tsx`
  - `src/components/admin/AftaleTab.tsx`
  - `src/components/admin/CustomersTab.tsx`
  - `src/components/admin/CustomerEditDialog.tsx`
  - `src/components/admin/EmployeesTab.tsx`
  - `src/components/admin/ReviewsTab.tsx`
  - `src/index.css`
- Primært greb:
  - ét adminsystem
  - højere informationsdensitet
  - mindre moduler
  - mindre tekst
  - ens lister
  - ens formularer
  - mere moden, standardiseret SaaS-oplevelse

Acceptkriterier
- Det er visuelt tydeligt, at panelet er redesignet.
- Sidebar, topbar, overblik og alle faner føles som samme produkt.
- Overblik er kompakt, hurtigt at afkode og uden store, tunge moduler.
- Kunder, aftaler, medarbejdere, services, anmeldelser og indstillinger bruger samme UI/UX-mønster.
- Der er ikke længere blandede layoutsystemer mellem fanerne.
- Oplevelsen fremstår professionel, moderne og konsekvent i hele virksomhedspanelet.
