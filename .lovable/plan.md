# Admin panel — resterende arbejde + nyt Platform-overblik

Trin 1–11 er færdige (admin-lås, UI-oprydning, sidebar+Cmd+K, virksomhedsfanen, UserDetailSheet, overblik-redesign, ordrer-sheet+chips, abonnementer-split, sundhed+audit, mails, impersonation). Næste op: Trin 12 (notifikationer), Trin 13 (polering).

---

## Trin 6 — Redesign af Platform-overblik (prioritet 1)

Det nuværende overblik er en lang stak af KPI-rækker. Det mangler hierarki, handling og live-puls. Nyt layout:

**Øverst — "Pulse strip" (live-tal, opdateres hvert 30. sek)**
- Aktive sessioner lige nu (auth + livechat)
- Ordrer i dag · GMV i dag · Nye signups i dag
- Lille grøn/rød prik pr. tal hvis det er over/under 7-dages-snit

**Sektion A — Forretningshelhed (3 store kort)**
- **GMV-graf** med periode + sammenligning forrige periode (overlejret stiplet linje), toggle: dag/uge/måned
- **MRR + ARR + Net-MRR-movement** (new / expansion / churn / reactivation) — vandfaldsdiagram
- **Kohorte-tabel** — retention pr. signup-måned (måned 0, 1, 2, 3…)

**Sektion B — Funnel + Konvertering**
- Besøg → Signup → Aktiv virksomhed → Betalende → Churn — som vandret funnel-diagram med drop-off-procent mellem hvert trin
- "Time to first order" gennemsnit pr. ny virksomhed
- Trial→Paid conversion rate (sidste 30/60/90 dage)

**Sektion C — Operationel sundhed (handleskort)**
- 🔴 Trial udløber inden for 3 dage (klik → filtreret virksomhedsliste)
- 🟠 Forfaldne betalinger
- 🟡 Ubesvarede chat-beskeder >2t
- 🟡 Nye anmeldelser uden svar
- 🔵 Nye virksomheder afventer godkendelse
Hvert kort viser antal + knap "Gå til" — overblikket bliver en arbejdskø, ikke kun en rapport.

**Sektion D — Top-lister** (beholdes, men i kompakte tabs)
Kategorier · Byer · Top virksomheder · Top kunder — som ét kort med tabs i stedet for tre separate kort.

**Sektion E — System-puls** (kompakt strip i bund)
- Edge functions: sidste fejl, p95 latency
- DB-størrelse, antal aktive forbindelser
- Cron jobs: sidste kørsel + status
- Mail-bounces sidste 24t

---

## Trin 7 — Ordrer-fanen (oprydning + dyb-link)

`PlatformOrdersTab` mangler i dag:
- Klik på række → `OrderDetailSheet` (lignende BusinessDetailSheet) med kunde, virksomhed, status-tidslinje, betalingsstatus, fakturalink
- Filter-chips: I dag · Denne uge · Forfaldne · Ubetalte · Kreditnota
- Bulk: Markér som betalt · Send rykker · Eksportér valgte
- Kolonne "Virksomhed" linker direkte til BusinessDetailSheet
- Kolonne "Kunde" linker til UserDetailSheet

---

## Trin 8 — Abonnementer-fanen (forretningskritisk)

`PlatformSubscriptionsTab`:
- KPI-strip øverst: MRR, ARR, Active, Trialing, Past due, Cancelled (sidste 30 dage)
- Liste med plan-badge (Free/Basic/Pro), næste fornyelse, beløb, status
- Filtre: status-chips + plan + interval (måned/år)
- Klik → SubscriptionDetailSheet: historik, faktura-linje, mulighed for at "udskift plan", "udsæt fornyelse 30 dage", "stop ved næste fornyelse", "credit-justering"
- "Risk"-flag: Past due + trial-expiring-soon med tydelig farve

---

## Trin 9 — Aktivitetslog & sundhed (`PlatformAuditLogTab` + ny `PlatformHealthTab`)

**Audit-log:**
- Filtre: handling, admin, mål-type, dato-range (allerede delvis)
- Tilføj: indlejret JSON-detail-visning ved klik (i dag vises kun rå)
- Group-by-toggle: pr. dag · pr. admin · pr. virksomhed
- CSV-eksport af filtreret resultat

**Ny fane "Sundhed":**
- Edge functions: liste m. status, sidste 24t kald, fejlrate, p95
- Database: tabel-størrelser top 10, slow queries (hvis tilgængeligt), aktive forbindelser
- Cron/scheduled tasks: liste med "sidste kørsel", "næste kørsel", success/fail-badge
- Mail: bounces, complaints, leverede sidste 7 dage
- Storage-buckets: forbrug pr. bucket

---

## Trin 10 — Mails & kommunikation (ny `PlatformMailsTab`)

- Template-bibliotek: velkomst, faktura, password-reset, ordre-bekræftelse, trial-udløb — med live preview
- Send/genindsend transaktionsmail til specifik bruger (logges i audit)
- Massemail til segment (alle trial-virksomheder, alle aktive ejere) — med dobbeltbekræftelse
- Send-log: sidste 100 mails sendt, status, modtager, link til template
- Bounce/complaint-håndtering: brugere markeret som problematiske

---

## Trin 11 — Impersonation + UserDetailSheet udvidelse

**Impersonation (ny edge function `admin-impersonate`):**
- Genererer engangs-magic-link gyldig 5 min for support
- Audit-logges altid
- I UI: knap "Log ind som ejer" i BusinessDetailSheet og UserDetailSheet
- Banner i appen når man er impersoneret: "Du er logget ind som X — vend tilbage"

**UserDetailSheet — handlinger der mangler:**
- Suspendér konto (dobbeltbekræftelse + årsag)
- Slet konto (skriv email for at bekræfte + soft-delete først, hard-delete efter 30 dage)
- Skift email (med verifikations-mail)
- Manuel rolle (kun business_owner, aldrig admin)

---

## Trin 12 — Notifikationscenter i topbar

- Klokke-ikon i topbar med badge (antal uløste)
- Dropdown med kategorier: Nye virksomheder · Trial udløber · Forfaldne betalinger · Nye chat-beskeder · Fejlede mails
- "Markér alle som læst", filter pr. type
- Realtime-update via Supabase channels (vi har allerede mønstret)
- Persisteres pr. admin i ny tabel `admin_notifications`

---

## Trin 13 — Mobil + tilgængelighed + sidste polering

- Mobil: sidebar swipe-luk (ESC virker allerede), sticky topbar, bottom-tab på <640px
- Tabeller: horizontal scroll med fade-edge i stedet for at brække layout
- Alle ikon-knapper får `aria-label` + tooltip
- Fokus-ring synlig overalt (`focus-visible:ring-2 ring-accent ring-offset-2`)
- Kontrast-check på badges/chips i lyst og mørkt tema
- Tastatur: Cmd+K søg · `g o` → overblik · `g v` → virksomheder · `g u` → brugere (vim-style)
- Loading-states: erstat resterende `null` med `Skeletons.tsx`

---

## Tekniske noter

**Nye komponenter**
- `PlatformOverviewTab.tsx` (refactor — splittes i `OverviewPulse`, `OverviewBusiness`, `OverviewFunnel`, `OverviewActionQueue`, `OverviewSystem`)
- `OrderDetailSheet.tsx`, `SubscriptionDetailSheet.tsx`
- `PlatformHealthTab.tsx`, `PlatformMailsTab.tsx`
- `AdminNotifications.tsx` (topbar dropdown)
- `ImpersonationBanner.tsx`

**Nye edge functions**
- `admin-impersonate` — magic-link + audit
- `admin-send-mail` — template-render + send + log
- `admin-suspend-user`, `admin-delete-user` (soft/hard)

**Nye RPCs / tabeller (skitse)**
```text
- admin_notifications  (id, admin_id, type, payload, read_at, created_at)
- admin_mail_log       (id, template, to_user, to_email, status, error, sent_by, created_at)
- admin_impersonation_codes (findes allerede)
- admin_funnel_stats() RPC — leverer trin-tal i ét kald
- admin_mrr_movement(from, to) RPC — new/expansion/churn/reactivation
- admin_cohort_retention() RPC
```

**Rækkefølge-anbefaling**
1. **Trin 6** først — overblikket er admins startside, størst gevinst.
2. **Trin 7 + 8** dernæst — kerneforretning (ordrer + abonnementer).
3. **Trin 11** (impersonation) — kritisk for support, lille kodebase-fodaftryk.
4. **Trin 9 + 10** (sundhed + mails) — drift.
5. **Trin 12** (notifikationer) — kræver realtime + ny tabel.
6. **Trin 13** (polering) — løbende eller til sidst.

---

## Næste skridt

Sig "ja" → jeg starter på **Trin 6** (Platform-overblik). Vil du have en anden rækkefølge, sig fx "tag trin 11 først".