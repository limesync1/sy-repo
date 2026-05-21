
# Platform Admin — Omfattende opgradering

Målet: gøre platform-admin til et reelt kontrolcenter hvor du fuldt ud kan styre virksomheder, prøveperioder, abonnementer, brugere, betalinger og support — ikke kun se data, men handle på det.

## Hvad jeg foreslår at bygge (prioriteret)

### 1. Virksomheder — fuld kontrol (vigtigste)
Ny **detalje-sheet** ved klik på en virksomhed med følgende handlinger samlet ét sted:

- **Prøveperiode**
  - Forlæng prøveperiode (+7 / +14 / +30 dage eller custom dato)
  - Nulstil prøveperiode (start forfra)
  - Afslut prøveperiode nu (tving til betaling)
- **Abonnement**
  - Skift plan (månedlig/kvartal/årlig)
  - Tænd/sluk tilkøb (rute, regnskab, ekstra-logins)
  - Marker som "betalende" manuelt (kulance)
  - Fjern gemt kort
  - Åbn Stripe Billing Portal som virksomheden
  - Send re-aktiverings-mail
- **Virksomhedsdrift**
  - Aktivér / deaktivér
  - Verificér / fjern verifikation
  - Soft-delete (markér slettet, 30 dages grace)
  - Hard-delete (permanent — kræver bekræftelse med navn)
  - Skift ejer (overdrag til anden bruger)
  - Tilføj/fjern medarbejdere
  - Log ind som (eksisterer — flyttes ind i panelet)

### 2. Opret virksomhed manuelt
Ny knap **"+ Opret virksomhed"** → wizard:
1. Virksomhedsinfo (navn, CVR-opslag, kategori, by)
2. Ejer (eksisterende bruger via e-mail eller opret ny)
3. Plan (prøveperiode længde, evt. tilkøb, evt. spring prøve over)
4. Bekræft → opret + send velkomst-mail

### 3. Brugere — manglende handlinger
- Send password-reset
- Skift e-mail
- Tildel/fjern roller (admin, business owner)
- Suspendér bruger
- Slet bruger (med konsekvens-visning: "ejer 2 virksomheder")
- Opret bruger manuelt

### 4. Abonnementer-tab forbedring
- Filtrer på status (trial, trial_ending, expired, active, past_due, canceled)
- Dunning-liste (kort fejlede)
- MRR-graf + churn
- Manuel handling: forlæng, refunder, annullér

### 5. Nye anbefalede tabs
- **Mails & beskeder** — kø, fejlede, suppression-liste, send test-mail
- **Aktivitetslog** — audit-trail af admin-handlinger (hvem gjorde hvad hvornår)
- **Systemstatus** — edge-functions sundhed, cron-jobs, fejlrater
- **Refunderinger & disputes** — Stripe disputes overblik
- **Onboarding-pipeline** — virksomheder under oprettelse (drop-off tracking)

### 6. Småfixes på tværs
- Konsistent dansk talformat ("3.700 kr") overalt
- Bedre tom-tilstande
- Bekræftelsesdialoger for destruktive handlinger (ikke `confirm()`)
- Søgning der dækker e-mail/CVR/slug/by samtidig
- Bulk-handlinger udvides (send mail, eksportér, forlæng prøve)

---

## Teknisk

**Database/migrationer der skal til:**
- `admin_audit_log` tabel (admin_id, action, target_type, target_id, details, created_at)
- `business_plans.deletion_requested_at` allerede der → soft-delete cron
- RPC'er: `admin_extend_trial`, `admin_reset_trial`, `admin_end_trial`, `admin_force_active`, `admin_transfer_business_owner`, `admin_soft_delete_business`, `admin_hard_delete_business`, `admin_create_business`, `admin_suspend_user`
- Alle RPC'er logger til audit_log + tjekker `has_role(auth.uid(), 'admin')`

**Edge functions:**
- `admin-create-business` (orkestrerer user + business + plan + invite-mail)
- `admin-stripe-action` (refund, cancel, portal-as-business)

**Frontend:**
- Ny `BusinessDetailSheet.tsx` med tabs (Oversigt / Plan / Brugere / Fakturering / Fare-zone)
- Ny `CreateBusinessDialog.tsx` (multi-step)
- Ny `UserDetailSheet.tsx`
- Ny `ActivityLogTab.tsx`
- Ny `EmailsTab.tsx`
- Refaktor `PlatformBusinessesTab` så rækken kun viser oversigt + åbner sheet

---

## Omfang

Det her er stort — realistisk 8-12 commits hvis vi laver det hele. Jeg foreslår at vi starter med **fase 1 + 2 + 3** (virksomheds-detalje, opret virksomhed, bruger-handlinger) som er det vigtigste i din besked, og så tager resten i efterfølgende runder.

**Bekræft venligst:**
1. Skal jeg starte med fase 1+2+3 nu? Eller vil du have alt i én omgang?
2. Soft-delete vs hard-delete — vil du have 30-dages grace, eller bare hard-delete med bekræftelse?
3. Skal "Opret virksomhed" sende velkomst-mail med login-link automatisk, eller bare oprette stille?
