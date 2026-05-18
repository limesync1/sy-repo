# Plan: Bedre onboarding + stats-paneler

To dele, begge fokuseret på "kun det der giver mening".

## Del 1 — Onboarding-overhaul (`OnboardingHub.tsx`)

Den nuværende onboarding fungerer logisk (smart step-prioritering, dependsOn, impact), men ser teknisk ud og savner fremdriftsfølelse. Jeg redesigner uden at fjerne logikken:

**Visuelt & layout**
- Erstat det grå "next-step"-kort med et tydeligere **moderne hero-card**: stort cirkulært progress-ring øverst med "X af Y trin · Z%", samme accent-teal som resten af sitet, hover-løft.
- Trin-listen får ikon-chips med farvet bagside per kategori (Profil, Services, Team, Vækst), bedre vertikal timeline-linje mellem trin.
- Færdige trin glider sammen i en lille "✓ Færdiggjort"-collapse i bunden — fokus bliver kun det som mangler.

**Færre/klarere trin**
- Grupper de 20+ steps i **4 faser**: 1) Profil klar, 2) Klar til kunder, 3) Klar til team, 4) Vækst. Kun aktuel fase vises foldet ud — næste faser låses indtil forrige er ~80% færdig.
- Skjul "set-phone-format", "share-link" mv. som mikroopgaver i en "Småjusteringer (3)"-accordion — fjerner støj.
- Smelt "good-description", "company-info" sammen til ét trin med inline-progress (telefon ✓, adresse ✓, beskrivelse 40%).

**Vejledning**
- Hvert aktivt trin får en lille **"Sådan gør du"-popover** med 2-3 punkter (fx "Vælg et kvadratisk logo · min 200×200 · PNG eller JPG").
- Estimeret tid per trin ("≈ 2 min") — sætter forventning.

**Fremdrift & gamification**
- Konfetti + lyd når en fase færdiggøres (ikke bare ved alt-færdigt).
- Streak-badge: "3 trin på 5 minutter 🔥".
- Velkomst-wizard får bedre slides med små illustrationer/screenshots i stedet for kun ikoner.

## Del 2 — Smart stats-panel — kun hvor det giver mening

Efter at have læst koden: **Overblik (DashboardTab)** har allerede masser af KPI-kort og perioder. **AftaleTab** og **RoutePlanner** har ingen sidebar/stats-panel — det er her screenshottet rammer plet.

### Aftaler (`AftaleTab.tsx`)
Tilføj højrekolonne (kun ≥1280px, ellers top-strip på mobil/tablet):
- **Planlagt omsætning** denne uge + denne måned (sum af planlagte ordrer ekskl. annulleret)
- **Medarbejder-filter** med checkbox per medarbejder (skjul/vis i kalender) — bruger eksisterende employee-data
- **Forklaringer-legend** (collapsible): farvekoder for ordrestatus (pending/confirmed/in_progress/completed/cancelled) + ordretype (manuel/online/abonnement) — så nye brugere forstår kalenderen

### Ruter (`RoutePlanner.tsx`)
Samme sidebar-mønster, kun relevante stats:
- **Planlagt kørselstid** pr. dag i ugen + total uge (fra route-stops)
- **Planlagt omsætning** uge/måned
- **Medarbejder-filter** (skjul/vis ruter)
- **Forklaringer** for rute-status (fastlåst/frigjort) + ordrestatus

### Overblik (`DashboardTab.tsx`)
**Ikke** sidebar — siden har allerede 8+ KPI-kort. I stedet udvider jeg den eksisterende række med 2 manglende, der matcher konkurrenten:
- **Planlagt omsætning næste 7 dage** (forward-looking, ikke historisk)
- **Planlagt kørsel denne uge** (hvis rute-planlægning er aktiveret)

## Filer

```
src/components/admin/onboarding/OnboardingHub.tsx     redesign
src/components/admin/onboarding/StepCard.tsx           ny — udskilt hero-card
src/components/admin/onboarding/PhaseAccordion.tsx     ny — fase-grupper
src/components/admin/AftaleTab.tsx                     +højre stats-panel
src/components/admin/AftaleStatsPanel.tsx              ny komponent
src/pages/RoutePlanner.tsx                             +højre stats-panel
src/components/route-planner/RouteStatsPanel.tsx       ny komponent
src/components/admin/DashboardTab.tsx                  +2 forward-looking KPI'er
```

Alt bygger på eksisterende design-tokens (foreground/accent/border) og shadcn — ingen nye farver.

## Tekniske noter

- Stats-paneler bruger eksisterende hooks (`useOrders`, `useEmployees`, `useRoutes`) — ingen nye DB-kald.
- Medarbejder-filter persistes i `localStorage` per business + side, ikke i DB.
- Panelet er `<aside>` med `xl:w-72 xl:sticky xl:top-20`, falder tilbage til vandret strip under xl.
- Konfetti via lille canvas-helper (ingen ekstra dep — bruger samme mønster som CompletionToast).
