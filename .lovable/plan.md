# Platform-admin: Opret-virksomhed wizard + admin-panel forbedring

## Del 1 — Opret-virksomhed wizard (hovedfokus)

Erstatter den nuværende simple `CreateBusinessDialog` med et flerstegs wizard-flow, der svarer 1:1 til "Bliv udbyder"-siden (`src/components/admin/BusinessOnboarding.tsx`), men tilpasset admin-konteksten.

**Ny komponent:** `src/components/platform-admin/CreateBusinessWizard.tsx` (Sheet eller stor Dialog, 4 trin med progress-bar).

### Trin 1 — Find virksomhed (CVR)
- CVR-input + opslag via eksisterende `cvr-lookup` edge function
- Auto-udfyld: navn, adresse, postnr, by, telefon, mail, branche
- Admin kan også vælge "Spring CVR over — opret manuelt" (for udenlandske / private)
- Branche → mappes til vores `service-taxonomy.ts` kategorier (foreslår automatisk 1-3 kategorier ud fra branchetekst, admin kan justere via multi-select med rigtige Serviceydere-kategorier i stedet for fri tekst)

### Trin 2 — Funktioner & plan
- Samme funktionskort som onboarding: Regnskabsintegration (betalt), Leads (gratis), Livechat (gratis)
- Ekstra medarbejderlogins (stepper 0-20)
- Faktureringsperiode: Månedlig / Kvartal / Årlig (med rabat fra `platform_settings`)
- Prøveperiode-længde i dage (admin-only felt, default fra platform-settings)
- Live pris-breakdown vises i sidepanel

### Trin 3 — Ejer-bruger
- Email (required)
- Vis live: "Findes denne bruger allerede?" (lookup via admin RPC) → enten "Eksisterende bruger bliver tildelt" eller "Ny bruger oprettes"
- Valg: Generér engangskodeord automatisk / Sæt selv
- Checkbox: Send velkomstmail med login + magic link

### Trin 4 — Gennemse & opret
- Resumé af alt
- Admin-only valg:
  - "Marker som betalende med det samme (spring trial over)"
  - "Tilføj note til audit log"
- Knap "Opret virksomhed" → kalder udvidet `admin-create-business` edge function
- Success-skærm: viser slug, login-URL, evt. engangskodeord (kopierbart), knap "Åbn virksomhedspanel som ejer" (impersonation)

### Backend-ændringer
Udvid `supabase/functions/admin-create-business/index.ts`:
- Tag imod alle felter (features, billing, extraLogins, trialDays, forceActive, categories, customAddress)
- Skriv komplet `businesses.settings` med samme struktur som onboarding (leads_enabled, livechat_enabled, etc.)
- Skriv `business_plans` med alle felter inkl. billing_period og monthly_price_dkk
- Hvis `forceActive=true`, sæt status='active' i stedet for 'trialing'
- Returnér `slug`, `businessId`, `temporaryPassword`, `userExisted`, `loginUrl`

## Del 2 — Admin-panel forbedringer

### A) Forbedret `PlatformBusinessesTab` (tabel)
- Tilføj kolonner: Plan-status badge (trial/aktiv/forfalden/annulleret), MRR, dage tilbage af trial, sidste login
- Quick-filters i toolbar: Status (alle/trial/aktiv/forfalden/slettet), Plan-type, Region
- Sortering på kolonner (klik header)
- Bulk-actions: vælg flere → "Forlæng trial med X dage", "Eksportér CSV", "Send mail"
- Søgning rammer også CVR, ejer-email, slug
- Row-action "Log ind som" → impersonation kode (bruger eksisterende `admin_impersonation_codes`)

### B) Udvidet `BusinessDetailSheet`
Nye sektioner (tabs):
- **Aktivitet** — kombineret feed: ordrer, mails sendt, login-historik, plan-ændringer
- **Økonomi** — viser MRR-bidrag, Stripe-fakturaer (fra `payments-webhook`-data), ubetalte fakturaer
- **Brugere** — ejer + medarbejdere med roller, "promote til ejer", "fjern medarbejder"
- **Indstillinger** — toggle is_active, is_verified, kategorier, slug-redigering med history-tracking

### C) Ny `UserDetailSheet` (åbnes fra `PlatformUsersTab`)
- Bruger-info, oprettelsesdato, sidste login
- Liste over: virksomheder bruger ejer, virksomheder bruger er medarbejder hos, ordrer som kunde
- Actions: Reset password, Skift e-mail, Send magic link, Suspender (logout + bloker), Slet bruger, Tildel/fjern admin-rolle

### D) Forbedret `PlatformAdmin` layout
- Sticky topbar med global søgning (cmd+K) — søg på tværs af virksomheder/brugere/ordrer
- "Hurtige handlinger"-knap i topbaren: Opret virksomhed, Opret bruger, Find ordre
- Notifikations-badge i nav når der er nye uløste ting (chats, refund-anmodninger, fejlede betalinger)

### E) Nye platform-admin tabs
- **Sundhed** — system status: edge function fejl-rate (sidste 24t), email-kø backlog, webhook-fejl, DB query times
- **Mails** — log over alle udsendte mails fra platformen (filterbar), genudsend, se template-preview

## Tekniske noter
- Wizard bruger `Sheet` (side-panel, max-w-3xl) for bedre plads end Dialog
- Step-state holdes lokalt, ingen ekstra DB-state nødvendig
- Genbrug `CvrLookupField`, `service-taxonomy.ts` mapping, `formatDkk`
- Audit log skriver hver wizard-oprettelse med fuldt payload-snapshot
- Edge function valideres med zod (følger projektets `_shared` pattern hvis det findes — ellers inline)

## Anbefalet rækkefølge
1. **Nu:** Del 1 (wizard) + udvidelse af `admin-create-business` — det er det konkrete du beder om
2. **Næste runde:** Del 2A (tabel-forbedringer) + 2B (detail-sheet udvidelse)
3. **Senere:** 2C (user-sheet), 2D (global søgning), 2E (sundhed/mails-tabs)

Skal jeg starte med Del 1 nu (wizard + edge function), eller vil du have en anden rækkefølge? Sig også til hvis der er ting fra Del 2 du vil have prioriteret op.
