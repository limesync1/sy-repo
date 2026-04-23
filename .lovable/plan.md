
Mål: gøre hele virksomhedspanelet markant mere professionelt, kompakt og gennemtænkt, så intet føles dekorativt eller overflødigt. Fokus er høj informationsværdi, strammere hierarki, mindre visuel støj og ensartet UX på tværs af dashboard, sidebar og alle centrale faner.

1. Stramme det visuelle designsystem op i stedet for at tilføje flere elementer
- Forenkle de delte admin-komponenter i `src/components/admin/shared/AdminUI.tsx`, så de bliver mere produkt-agtige og mindre “showcase”-agtige.
- Reducere:
  - unødige gradients
  - for bløde kortflader
  - overtydelige badges
  - store ikonflader
  - dekorative hover-effekter
- Standardisere et mere professionelt system for:
  - kompakte sideheaders
  - sektioner med præcise titler og kort hjælpetekst
  - tætte, scanbare liste-rækker
  - KPI’er med mindre visuel volumen
  - handlinger med klar primær/sekundær vægtning
- Justere spacing, radius, skygger og typografi, så alt føles roligt, præcist og konsekvent.

2. Gøre sidebaren mere diskret, skarp og funktionel
- Opdatere `src/pages/Admin.tsx`, så sidebaren føles som et professionelt arbejdsredskab og ikke et visuelt “hero-element”.
- Nedtone identitetsblokken for virksomheden:
  - mindre visuel vægt
  - færre pyntelabels
  - tydeligere fokus på navn og hurtige handlinger
- Forbedre navigationen med:
  - stærkere aktiv state
  - renere gruppering
  - mere kompakte nav-rækker
  - mindre kontraststøj i inaktive elementer
- Gennemgå topbaren samtidig, så den matcher samme stramme retning og ikke bruger unødig plads.

3. Omdesigne dashboardet til et mere kompakt og professionelt operations-overblik
- Opdatere `src/components/admin/DashboardTab.tsx`, så siden ikke føles som store præsentationskort.
- Gøre topområdet mere fokuseret:
  - kortere introduktionstekster
  - mindre bannerhøjde
  - tydeligere primær handling
- KPI-området skal gøres mindre og mere præcist:
  - færre visuelle lag
  - mere tabulære tal
  - mindre ikonstøj
  - tydelig prioritet uden store kort
- “Næste handlinger” skal forenkles, så handlingerne virker nødvendige og konkrete, ikke som ekstra bokse for boksens skyld.
- “Seneste bestillinger” skal optimeres mod hurtig scanning:
  - tydeligere rækkehierarki
  - mindre statusstøj
  - bedre alignment
  - mere app-lignende responsivitet

4. Forbedre fanen Aftaler med fokus på arbejdsgang og beslutningshastighed
- Stramme `src/components/admin/AftaleTab.tsx` op visuelt og strukturelt.
- Reducere farveglade statusudtryk og erstatte dem med mere professionelle statustoner.
- Gøre ordrevisning lettere at afkode:
  - vigtigste handling først
  - tydelig adskillelse mellem status, kunde, dato og beløb
  - mindre tekstfyld
- Gennemgå opgavedetaljer og redigeringsflader, så de føles mere operationelle og mindre som lange formularblokke.
- Sikre at labels, badges og actionknapper følger samme admin-system som dashboardet.

5. Forbedre fanen Kunder, så den føles mere som et CRM-værktøj
- Opdatere `src/components/admin/CustomersTab.tsx` og `src/components/admin/CustomerEditDialog.tsx`.
- Gøre kundelisten mere kompakt og professionel:
  - mindre kortfølelse
  - mere tydelig informationsstruktur
  - bedre scanning af omsætning, aktivitet og type
- Forbedre detailvisning og redigering:
  - mindre visuel støj i dialogen
  - tydeligere feltgrupper
  - mere konsekvent spacing
  - mindre “visuel pynt” på avatar og typevalg
- Prioritere de felter og handlinger, som er vigtigst for drift.

6. Forbedre fanen Medarbejdere, så den føles enkel og administrativ
- Opdatere `src/components/admin/EmployeesTab.tsx`.
- Fjerne rester af “sjov” visuel behandling:
  - tunge farveflader
  - unødige badges
  - visuelle effekter der ikke hjælper
- Gøre create/edit-flowet mere kompakt og målrettet:
  - kortere hjælpetekster
  - mere logiske feltgrupper
  - bedre handlingstilstande
- Gøre medarbejderrækker mere ens med øvrige lister i panelet, så der er samme visuelle logik på tværs af faner.

7. Forbedre fanen Anmeldelser, så den bliver mere troværdig og mindre dekorativ
- Opdatere `src/components/admin/ReviewsTab.tsx`.
- Nedtone stjerner, farver og kortstil, så indholdet fremstår mere seriøst.
- Gøre rating-overblik og reviewliste mere analytisk og mindre “social widget”-agtig.
- Prioritere:
  - score
  - verificering
  - dato
  - kommentar
- Skabe tydeligere rytme og bedre læsbarhed i review-rækkerne.

8. Stramme services-fanen op, da den i dag har flere “sjove” visuelle elementer
- Opdatere services-delen i `src/pages/Admin.tsx`, især `ServicesTab`, `ServiceRow`, `ServiceForm` og relaterede previews.
- Fjerne eller nedtone emoji-lignende og overdekorative elementer i kategori- og pricing-UI.
- Gøre servicekort og redigering mere professionelle:
  - mere tabel-/listeagtig struktur
  - færre farvede chips
  - tydeligere pris, kategori og status
- Forbedre formularhierarkiet i opret/redigér service:
  - tydelig progression
  - mindre “wizard-følelse”
  - færre store blokke
  - mere relevant mikrocopy
- Sikre at AI-forslag og hjælpetekster, hvis de bruges, fremstår diskret og nyttigt.

9. Justere globale admin-styles, så hele oplevelsen bliver mere rolig og premium
- Opdatere `src/index.css` admin-relaterede utilities.
- Forenkle admin-baggrunde og panelbaggrunde yderligere.
- Indføre mere konsekvente tokens for:
  - kompakte paneler
  - rolige borders
  - subtile separators
  - fokusstates
- Målet er, at adminoplevelsen føles skarp, ikke pyntet.

10. Gennemføre en samlet UX-finpudsning på tværs af alle faner
- Gennemgå alle primære interaktioner i virksomhedspanelet for at fjerne:
  - ligegyldig tekst
  - dublerede forklaringer
  - store tomme flader
  - inkonsistente knapstile
  - unødige sekundære elementer
- Ensrette:
  - headerstruktur
  - sektionstitler
  - filterplacering
  - tomme states
  - CTA-hierarki
  - række- og listeopbygning
- Sikre at hele panelet føles som ét professionelt system, ikke forskellige designs sat sammen.

Tekniske detaljer
- Primære filer:
  - `src/components/admin/shared/AdminUI.tsx`
  - `src/pages/Admin.tsx`
  - `src/components/admin/DashboardTab.tsx`
  - `src/components/admin/AftaleTab.tsx`
  - `src/components/admin/CustomersTab.tsx`
  - `src/components/admin/CustomerEditDialog.tsx`
  - `src/components/admin/EmployeesTab.tsx`
  - `src/components/admin/ReviewsTab.tsx`
  - `src/index.css`
  - relevante services-sektioner i `src/pages/Admin.tsx`
- Hovedgreb:
  - mindre elementer
  - strammere spacing
  - mindre dekorativ styling
  - højere informationsdensitet
  - stærkere visuel disciplin
  - ens UI/UX-mønstre på tværs af faner

Acceptkriterier
- Panelet føles professionelt fremfor sjovt.
- Elementer er mindre, skarpere og mere informationsbårne.
- Der er ikke unødvendig tekst eller pynt.
- Dashboard, sidebar og alle centrale faner bruger samme visuelle logik.
- Lister og rækker er hurtige at scanne.
- Vigtige handlinger er tydelige uden at dominere unødigt.
- Services-fanen og øvrige faner føles lige så gennemarbejdede som dashboardet.
- Hele virksomhedspanelet fremstår som et gennemtænkt, brugervenligt og konsistent produkt.
