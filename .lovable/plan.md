# Admin panel — runde 2: kvalitet, skala & dybde

Trin 1–13 (struktur, overblik, detaljesheets, audit, sundhed, mails,
notifikationer, mobil/a11y) er på plads. Denne runde fokuserer på
kvalitetsproblemer afdækket ved en ny gennemgang af hver fane.

---

## Tværgående fund (gælder flere faner)

1. **Skala-problem: client-side fetch + filter.**
   `PlatformOverviewTab`, `PlatformBusinessesTab`, `PlatformOrdersTab`,
   `PlatformReviewsTab`, `PlatformSubscriptionsTab` henter hele tabeller
   (op til 1000 rækker, Supabase-loftet) og filtrerer i hukommelse.
   Bryder lydløst ved 1000+ rækker — vi ser kun en del af data.
   Skal flyttes til server-side RPC'er med paging, sortering og filtre.

2. **`any`-typer & manglende validering.**
   `PlatformPlatformSettingsTab` bruger `useState<any>`; numeriske felter
   gemmes uden range-check; secrets vises i klar-tekst input uden
   "masker/vis"-toggle. Skal have zod-skema + maskerede secret-felter.

3. **Store komponenter.**
   `PlatformLiveChatTab` (934 linjer), `CreateBusinessWizard` (673),
   `PlatformBusinessesTab` (551), `BusinessDetailSheet` (527),
   `PlatformOverviewTab` (507). Brydes op i mindre, testbare dele
   (én fil = ét ansvar) — letter både vedligehold og lazy-load.

4. **Tomme/fejl-states inkonsistente.**
   Nogle faner bruger `EmptyState`, andre returnerer `null` eller
   en grå tekst. Standardisér via `EmptyState` + `ErrorState` overalt.

5. **Optimistic updates mangler.**
   Status-skift på ordrer, sletning af anmeldelser, suspendering af
   brugere venter alle på round-trip før UI opdateres. Tilføj
   `onMutate` optimistic-updates med rollback.

---

## Fane-for-fane plan

### Trin 14 — Overblik (`PlatformOverviewTab`) ✅
- ✅ Ny RPC `admin_overview_snapshot(from, to)` samler KPI, prev-periode,
  serie, top-lister, repeat-rate og MRR i ét aggregeret kald.
- ✅ Klient henter ikke længere rå tabeller — skalerer forbi 1000-rækkers loftet.
- Rest: MRR-vandfald (new/expansion/churn), kohorte-retention,
  funnel-trin, sammenlign-overlay på GMV-graf, CSV pr. sektion — flyttes
  til separat trin når der er forretningsbehov.

### Trin 15 — Virksomheder (`PlatformBusinessesTab`)
- Server-side paging: ny `admin_list_businesses(filter, search, page, sort)` RPC.
- Saved views: gem filter-kombinationer ("Mine trial-leads", "Forfaldne").
- Bulk-handlinger: aktiver/deaktiver, send mail, eksportér valgte
  (Trash mangler nu — kun en checkbox uden handling).
- Split fil: `BusinessesTable`, `BusinessesFilters`, `ImpersonationDialog`.
- "Sidste login" og "Sidste ordre"-kolonner (kræver join i RPC).

### Trin 16 — Brugere (`PlatformUsersTab`)
- Paging + søg på server (`admin_list_users` returnerer alt i dag).
- Tilføj filter: "Aldrig logget ind", "Inaktiv >30d", "Har businesses uden ordrer".
- Bulk: send password-reset, mass-mail, eksport.
- Vis avatar fra `profiles.avatar_url` hvis findes.
- `UserDetailSheet`: tilføj "Recent activity"-tidslinje (logins, ordrer, beskeder).

### Trin 17 — Ordrer (`PlatformOrdersTab`) ✅
- ✅ Ny RPC `admin_list_orders` med server-side paging, søg, status, quick-filter, sortering + aggregeret tæller.
- ✅ Saved views (localStorage).
- ✅ Optimistic status-skift med rollback.
- ✅ CSV-eksport over alle sider (op til 50k).
- ✅ "Ubetalte >7d"-chip + tæller på alle chips.
- ✅ Faktura-nummer + forfaldsdato vises i rækken; ikon hvis faktura findes.
- Rest: inline rediger total/note, "send rykker"-bulk-handling — flyttes til separat trin.

### Trin 18 — Abonnementer (`PlatformSubscriptionsTab`) ✅
- ✅ Ny edge function `admin-sync-business-plan` henter live status fra Stripe og opdaterer rækken (+ audit-log).
- ✅ "Synkronisér Stripe"-knap i `PlanDetailDialog` med spinner.
- ✅ Plan-historik vises i dialogen (læser `admin_audit_log` filtreret pr. business_plan).
- ✅ "MRR-vandfald (30d)" CSV-eksport: ny / churn / netto pr. virksomhed til regnskab.
- ✅ Churn-risk score + filter-toggle (allerede på plads).
- Rest: realtime past_due-banner + "send rykker"-bulk — flyttes til separat trin.

### Trin 19 — Anmeldelser (`PlatformReviewsTab`) ✅
- ✅ Migration: nye felter `flagged_at/_reason/_by`, `hidden_at/_by`, `admin_note` på `reviews`.
- ✅ Flag-dialog med årsag (spam/krænkende/fake/off-topic/andet) + valgfri intern note.
- ✅ Skjul/vis-toggle som filtrerer anmeldelser væk fra offentlige views (landing, profil-side, stats, GetQuotes, RecentBusinesses).
- ✅ Filter-chips: "Alle / Lav rating / Flagget / Skjult" med live-tæller.
- ✅ Visuelle markeringer i listen: amber-baggrund for flag, dimmet for skjult + chip-badges.
- ✅ CSV-eksport inkluderer flag-årsag + skjult-status.
- Rest: AI-sentiment-tag + per-virksomhed svarprocent — flyttes til separat trin.

### Trin 20 — Livechat (`PlatformLiveChatTab`)
- **Split filen** i: `ConversationList`, `MessageThread`, `CannedResponsesPanel`,
  `ChatInput`, `useChatRealtime` hook.
- Tilføj "Tildel til admin"-funktion (flere admins kan dele indbakke).
- Snooze: skjul samtale i X timer, dukker op igen automatisk.
- AI-svar-forslag (Lovable AI) ovenpå chat-input.
- Tag-filter (allerede ikon, ikke implementeret).
- Eksport hel samtale som .txt/PDF til support-arkiv.

### Trin 21 — Domæner (`PlatformDomainsTab`)
- Bulk DNS-recheck for alle pending.
- SSL-status pr. domæne (eksp.dato, udsteder).
- Whois-snapshot-link.
- Notifikation 14 dage før et SSL-cert udløber.

### Trin 22 — Aktivitetslog (`PlatformAuditLogTab`)
- Server-side paging — i dag hentes 500 rækker pr. filtrering.
- "Watch this user"-knap → realtime notifikation når en specifik admin handler.
- Diff-visning: hvis `details` har `before/after`, vis side-om-side diff.
- Saved filters + delbart link (URL state).

### Trin 23 — Sundhed (`PlatformHealthTab`)
- Tilføj graf: edge function-fejl pr. time (sidste 24t).
- DB: top 10 store tabeller med trend-pil.
- Cron-status: liste over `pg_cron`-jobs med sidste/næste kørsel.
- Storage-buckets: bytes + filer pr. bucket.
- "Run health check now"-knap (kalder alle RPC'er sekventielt).

### Trin 24 — Mails (`PlatformMailsTab`)
- Send test-mail UI-fejl: "send test" knap mangler valg af modtager-email
  (default = aktuel admin, men bør være redigerbar).
- Skabelon-editor (live preview er der, men ingen redigering — kun read-only).
- Batch-send med dobbelt-bekræftelse + "udsæt til xx:xx".
- Re-send fra send-log med ét klik.
- Blokerede mails: "afblokér"-handling (sletter suppression).

### Trin 25 — Platform-indstillinger (`PlatformPlatformSettingsTab`)
- **Sikkerhed**: maskér Stripe-secret som password-input + "Vis/skjul"-toggle.
- Zod-validering + per-felt fejl i stedet for ét toast.
- Test-knap: "Verificér Stripe-nøgle" (kalder Stripe `account.retrieve`).
- Audit-log entry når Stripe-secret ændres (vis hvem + hvornår sidst).
- Splittet i tabs: "Betaling", "Priser", "Email", "Branding" — i dag én lang form.

### Trin 26 — Delte komponenter & infrastruktur
- `BusinessDetailSheet` (527 linjer) → splittes i `Header`, `PlanPanel`,
  `OrdersPanel`, `DangerZone`.
- `CreateBusinessWizard` (673 linjer) → ét trin pr. fil, delt state-hook.
- Standardisér mutations: lille `useAdminMutation`-wrapper med
  toast + optimistic + audit-log-hint.
- Test-dækning: vitest for de 5 mest brugte RPC-wrappers.
- A11y-revision af nye komponenter fra Trin 14–25.

---

## Rækkefølge (anbefalet)

1. **Trin 14–17** (skala-problemerne på de mest brugte faner) — størst gevinst.
2. **Trin 25** (sikkerhed på Stripe-secret) — risiko, lille indsats.
3. **Trin 20** (livechat-refaktor) — størst kode-pukkel.
4. **Trin 18–19, 22** (forretningsdybde).
5. **Trin 21, 23, 24, 26** (drift & polering).

Sig "**start trin 14**" (eller andet trin) → jeg går i gang.

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