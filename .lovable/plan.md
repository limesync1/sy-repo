# Admin panel — oprydning & forbedringer

Målet er to ting:
1. **Sikkerhed**: Kun `william@adely.dk` er admin. Ingen — heller ikke andre admins — kan oprette/fjerne admin-rollen via UI eller RPC.
2. **Kvalitet**: Fjern designfejl, dobbelte luk-knapper, forkert størrelse på knapper, hover-bugs, irrelevante funktioner, og fyld manglende huller ud.

Vi udfører det i 6 trin — hvert trin er afgrænset, kan reviewes, og bryder ikke det øvrige panel.

---

## Trin 1 — Lås admin-rollen til William (sikkerhed først)

**Backend**
- Database-trigger på `user_roles`: blokér enhver `INSERT/UPDATE/DELETE` der involverer `role = 'admin'`, medmindre det er `william@adely.dk` der allerede er admin. Trigger er den eneste pålidelige måde — RLS kan omgås af security definer-funktioner.
- Opdatér `admin_set_user_role` RPC: returnér fejl hvis `_role = 'admin'`. Funktionen må stadig bruges til at give/fjerne `business_owner`.
- Seed: sikr at `william@adely.dk` har admin-rollen (idempotent insert).

**Frontend (`PlatformUsersTab`)**
- Fjern "Gør admin / Fjern admin"-knappen helt. Erstat med en låst badge "Admin (låst)" når brugeren er admin.
- Behold rollefilter, men fjern "admin" som mulighed at *tildele* — den findes kun til visning.

---

## Trin 2 — Globale UI-fejl (knapper, hover, dobbelte X)

Gennemgang af alle sheets/dialogs i `src/components/platform-admin/`:

- **Dobbelte luk-knapper**: shadcn `Sheet`/`Dialog` har indbygget X i `SheetContent`/`DialogContent`. Fjern manuelle X-knapper i `BusinessDetailSheet`, `CreateBusinessWizard`, `CreateBusinessDialog` (slettes — erstattes 100% af wizard).
- **Inkonsistente knap-størrelser**: standardisér til `size="sm"` (h-9) i tabeller/lister, `size="default"` i sheets/forms. Fjern hardcoded `h-8`/`h-10` der bryder rytmen.
- **Hover-states**: ikon-knapper uden `aria-label` og uden `Button`-wrapper får ikke korrekt hover. Konvertér rå `<a>`/`<button>` med ikoner til `<Button variant="ghost" size="icon">` med `aria-label`.
- **Ikon-only knapper på mobil**: tilføj `min-h-11 min-w-11` på primære tap-targets.
- **Tomme `title=` på ikoner**: erstat med `aria-label` + tooltip via shadcn `Tooltip`.

---

## Trin 3 — Ryd op i sidemenu & topbar

- Konsolidér `CreateBusinessDialog` → slettes (wizarden afløser den).
- Topbar: tilføj global Cmd+K søgning (springer til virksomhed/bruger/ordre). Fjern den brødkrumme-overskrift der duplikerer sidebar-label.
- Sidebar: del NAV i to grupper — "Drift" (Overblik, Virksomheder, Brugere, Ordrer, Abonnementer) og "Indhold & system" (Anmeldelser, Livechat, Domæner, Aktivitetslog, Platform). Visuelt cleaner ved 10 items.
- Mobil: sidebar overlay får i dag ingen swipe-luk — tilføj swipe + ESC.

---

## Trin 4 — Virksomheder-fanen + DetailSheet (kerneflow)

`PlatformBusinessesTab`:
- Tilføj kolonner: **Plan-status** (Trial X dage tilbage / Aktiv / Forfalden), **MRR**, **Sidste login (ejer)**, **Antal brugere**.
- Quick filters som chips: Aktive · Trial · Forfaldne · Pauserede.
- Bulk-handlinger (checkboxes): Forlæng trial · Sæt på pause · Send mail.
- Rækkens "..." menu: Åbn detail · Impersonate · Forlæng trial · Slet (med dobbeltbekræftelse).

`BusinessDetailSheet` — udvid til tabs:
- **Overblik** — kontaktinfo, plan, trial, branche
- **Aktivitet** — login-historik, sidste handling, audit-log filtreret på virksomhed
- **Økonomi** — fakturaer, MRR, kommende fornyelse, manuelle credits
- **Brugere** — alle medarbejdere + ejer, mulighed for at sende password-reset
- **Indstillinger** — slug, custom domæne, suspendér, slet

---

## Trin 5 — Brugere-fanen + nyt UserDetailSheet

Nyt `UserDetailSheet.tsx`:
- Profil (navn, email, telefon, oprettet, sidste login)
- Roller (read-only for admin — se trin 1)
- Tilknyttede virksomheder (med link)
- Ordrer (sidste 10 + link)
- Handlinger: Send password-reset · Send magic-link · Suspendér konto · Slet konto (dobbeltbekræftelse + audit)

Klik på en bruger-række åbner sheet i stedet for kun email-link.

---

## Trin 6 — Manglende funktioner & nye faner

Anbefalinger til reelt nyttige tilføjelser (ikke "fluff"):

- **Sundhed-fane**: edge function-status, sidste fejl, DB-størrelse, queue (hvis vi tilføjer en), seneste mail-bounces.
- **Mails-fane**: send/genindsend transaktionsmails (velkomst, faktura, password-reset), se template-preview.
- **Notifikationer i topbar**: nye virksomheder, forfaldne trials, fejlede betalinger, nye chat-beskeder uden svar.
- **Impersonation**: "Log ind som ejer"-knap der genererer engangs-magic-link til support.
- **Aktivitetslog**: udvid filtre (handling, admin, virksomhed, dato-range) + eksport CSV.

---

## Tekniske detaljer

**Trin 1 SQL (skitse)**
```text
- Trigger på user_roles BEFORE INSERT/UPDATE/DELETE WHERE role = 'admin'
  → RAISE EXCEPTION undtagen for william@adely.dk's eksisterende række
- admin_set_user_role: raise 'admin role is locked' hvis _role = 'admin'
- Seed: insert william's admin-rolle hvis den ikke findes
```

**Komponenter der berøres**
- Slet: `CreateBusinessDialog.tsx`
- Stort refactor: `PlatformBusinessesTab.tsx`, `BusinessDetailSheet.tsx`, `PlatformUsersTab.tsx`, `PlatformAdmin.tsx`
- Nyt: `UserDetailSheet.tsx`, `PlatformHealthTab.tsx`, `PlatformMailsTab.tsx`, `AdminCommandPalette.tsx`
- Nye edge functions: `admin-impersonate-user`, `admin-resend-mail`

**Migration-rækkefølge**: Trin 1 først (sikkerhed). Resten kan tages i hvilken som helst rækkefølge, men anbefalet 2 → 3 → 4 → 5 → 6.

---

## Næste skridt

Trin 1–5 er udført. Tilbage: **Trin 6** (Sundhed, Mails, Notifikationer, Impersonation, udvidet aktivitetslog) — samt opfølgning på trin 5: suspendér/slet konto med dobbeltbekræftelse.
