# Plan: "Kun profil" – virksomheder kan liste sig uden ruteplanlægger

## Idé i én sætning
Ved oprettelse vælger virksomheden mellem **"Kun profil på Serviceydere"** (gratis) og **"Fuldt system"** (ruteplanlægger, medarbejdere, fakturering m.m. – som i dag). Valget gemmes ét sted, og både skærmene og serveren tjekker det samme valg. Derfor kan man ikke ende med en halv opsætning.

## Hvad virksomheden oplever

**Ved oprettelse (/opret-virksomhed)**
- Første trin er to store valgkort: "Kun profil – gratis" og "Fuldt system – 14 dage gratis".
- Med "Kun profil" er guiden kortere: firmanavn, CVR, by, brancher, services med priser, logo/billeder og kontakt. Medarbejder-, rute- og regnskabstrinnene springes over.

**I panelet med "Kun profil"**
- Følgende vises: Overblik (forenklet), Min profil, Services, Anmeldelser, Beskeder/forespørgsler og Indstillinger.
- Følgende vises ikke: Ruteplanlægger, Medarbejdere, Kunder, Aftaler/bestillinger, Regnskab, Håndværk og medarbejderappen.
- Øverst står et diskret kort: "Vil du også planlægge ruter? Prøv det fulde system gratis i 14 dage". Det er én knap uden ny oprettelse, og alle profildata bevares.
- Der er ingen prøveperiode-nedtælling og ingen betalingsbanner, fordi profilen er gratis.

**Offentligt**
- Profilen, services og priser vises i søgning, på bysider og på virksomhedens side som i dag. Den kan modtage tilbudsforespørgsler.

**Opgradering og nedgradering**
- **Opgradering:** Valget skifter til "Fuldt system", og der starter en normal 14-dages prøveperiode. Ruteplanlæggeren m.m. dukker op med det samme.
- **Nedgradering:** Fra fuldt system til "Kun profil" kan man kun skifte, når der ikke er aktive ruter, aftaler eller et betalt abonnement. Ellers vises en tydelig dansk forklaring på, hvad der skal afsluttes først. Intet slettes automatisk.

## Sådan undgås fejl og overlap
- **Én sandhed:** valget ligger i virksomhedens abonnementsoplysninger. I dag gemmes "ruteplanlægning til/fra" to steder; det samles, så de ikke kan blive uenige.
- **Serveren håndhæver det:** en "Kun profil"-virksomhed kan ikke oprette ruter, medarbejdere, aftaler eller regnskabsjob, heller ikke ved et direkte kald. Det giver en dansk fejlbesked i stedet for halve data.
- **Eksisterende virksomheder:** alle får automatisk "Fuldt system". Intet ændrer sig for dem.
- **Én fælles liste over funktioner:** panelets menu, genveje, "Kom godt i gang"-trin og forsidekort bruger den samme liste. Så kan et link til ruteplanlæggeren ikke dukke op et sted, hvor det er slået fra.
- **Tests:** en profil-virksomhed kan ikke oprette en rute. Opgradering giver adgang med det samme. Nedgradering afvises, når der er aktive ruter. Eksisterende virksomheder er fortsat "Fuldt system".

## Åbne valg (antaget, kan ændres)
- "Kun profil" er gratis og uden tidsbegrænsning.
- Virksomheden kan svare på tilbudsforespørgsler og beskeder, men ikke oprette bestillinger. Det kræver det fulde system.

## Teknisk sektion
- **Database (tilføjende migration):**
  - Ny kolonne `business_plans.plan_kind text not null default 'full'` med valideringstrigger (`'listing' | 'full'`). Alle eksisterende rækker forbliver `'full'`.
  - Ny SECURITY DEFINER-funktion `business_has_operations(_business_id)`, som returnerer `plan_kind = 'full'` og aktiv plan.
  - BEFORE INSERT-guards på `routes`, `route_stops`, `employees`, `agreements`, `orders` (manuelle) og `accounting_sync_queue` afviser med dansk fejl, når virksomheden er `listing`.
- **Kilde til sandhed:** `route_planning_enabled` læses fremover fra `business_plans` via `useBusinessPlan`. `businesses.settings.route_planning_enabled` holdes synkron af en trigger, så gammel kode ikke bryder, og markeres som udfaset.
- **Frontend:**
  - Ny `src/lib/business-capabilities.ts` (`capabilitiesFor(plan)`) bruges af `AdminShell`-flags, fanelisten og registry-navigationen, onboarding-signaler, `RoutePlanner`-route-guard og `EmployeesTab`.
  - Direkte URL'er til skjulte faner sender videre til Overblik med en kort forklaring.
- **Onboarding:**
  - `BusinessOnboarding.tsx` får et valgtrin. Profilvejen indsætter plan med `plan_kind='listing'`, `status='active'`, pris 0 og uden `trial_ends_at`, så `business_has_active_plan` er sand og ingen banner vises.
  - `admin-create-business` accepterer samme parameter.
- **Opgradering/nedgradering:**
  - RPC `set_business_plan_kind(kind)` med ejertjek.
  - Opgradering sætter `trialing` og `trial_ends_at = now() + 14 dage`.
  - Nedgradering afvises ved aktive ruter, aftaler eller Stripe-abonnement.
- **Tests:** vitest for `capabilitiesFor` og SQL-tjek af guards/RPC via read-queries efter migration.
