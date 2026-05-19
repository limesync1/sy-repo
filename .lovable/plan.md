
## Ny prismodel

**Faste priser (overstyrer `platform_settings`):**
- Basis: **289 kr/md** (virksomhedsprogrammet inkl. ruteplanlægning, leads, livechat — alt undtagen regnskab)
- Opstartspris: **2.269 kr** engangsbeløb, tilføjes til første betaling efter prøveperiodens udløb
- Regnskabsintegration: **269 kr/md** (eneste betalte tilvalg)
- Ekstra medarbejderlogin: **59 kr/md pr. stk**
- Ruteplanlægning: **altid med, ikke valgbar, ikke vist** som toggle
- Leads + livechat: **gratis**, nem on/off toggle (vises stadig)

Opdaterer `platform_settings` defaults og UI-tekster i:
- `/bliv-udbyder` (ForBusinesses) — pris-sektion + features
- `/opret-virksomhed` (BusinessOnboarding) — fjerner rute-toggle, fjerner "reservér"-sprog, simplere pris-summary med opstartspris
- Admin → Indstillinger → Tilvalg + Pris og betaling (SettingsTab) — skjuler rute-toggle helt
- Platform-admin → Indstillinger (PlatformPlatformSettingsTab) — opdater default-priser inkl. opstartspris
- Stripe `create-checkout-session` — tilføj opstartspris som engangs line-item ved første faktura

## Smartere/klogere onboarding & guide

Fjern al "reservér plads"-sprog. Erstat med ærlige formuleringer:
- Regnskabsintegration: *"Aktivér når du er klar — så sendes fakturaer automatisk til e-conomic eller Dinero. 269 kr/md, kan aktiveres/deaktiveres når som helst."*
- Leads + livechat: *"Gratis funktion — slå til/fra når du vil."*
- Ruteplanlægning vises som inkluderet feature (ikke som tilvalg).

Opdaterer:
- `BusinessOnboarding.tsx` — fjerner route_planning toggle, opdaterer feature-kort med klare beskrivelser, viser opstartspris tydeligt i pris-summary, viser "i dag: 0 kr (14 dages prøveperiode)" + "ved første betaling: basis + opstartspris + valgte tilvalg".
- `NextStepCard.tsx` / `OnboardingHub.tsx` — gennemgår tekster så de er konkrete handlinger fremfor "reservér".

## Anti-misbrug: lås medarbejderlogins + tilvalg før fakturering

For at undgå at virksomheder skruer ned dagen før fakturering:
- Tilføj kolonner på `business_plans`: `locked_extra_employee_logins int`, `locked_accounting_integration boolean`, `locked_at timestamptz`.
- 3 dage før `current_period_end` (eller før første rigtige faktura efter trial) "fryser" et trigger/cron de aktuelle værdier til `locked_*`.
- Stripe-fakturering bruger `locked_*` værdier, ikke de aktuelle toggles.
- UI viser besked: *"Ændringer træder i kraft fra næste faktureringsperiode (om X dage)"* når man er inden for låseperioden.
- Server-side guard i `useUpdateBusinessPlan`-tilsvarende RPC: opdaterer kun "ønsket" værdi, ikke den låste — og afviser ikke ændringen, men gemmer den til næste periode.

## Opsigelse + sletning af virksomhed

Nyt flow i SettingsTab → "Farezone":
1. Knap "Opsig og slet virksomhed" → dialog der forklarer: ingen refundering, alt data slettes permanent.
2. Brugeren klikker "Send bekræftelseskode" → ny edge function `send-business-deletion-code` genererer 5-cifret kode, gemmer hash + udløb (15 min) i ny tabel `business_deletion_codes`, sender via `send-transactional-email` til virksomhedens email.
3. Brugeren indtaster kode → edge function `confirm-business-deletion` verificerer, kalder Stripe `subscriptions.cancel` (immediate), markerer `businesses.is_active = false` + `deleted_at = now()`, sletter relaterede data via cascade (eller marker som soft-deleted hvis cascade er for risikabelt — vælger soft-delete med `deleted_at` for sikkerhed).
4. Logger handling i `audit_log`.

## Tekniske detaljer

**Migration:**
```sql
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS startup_fee_dkk numeric DEFAULT 2269;
UPDATE platform_settings SET
  base_price_dkk = 289,
  price_route_planning_dkk = 0,
  price_accounting_integration_dkk = 269,
  price_per_employee_login_dkk = 59,
  startup_fee_dkk = 2269
WHERE id = 1;

ALTER TABLE business_plans
  ADD COLUMN locked_extra_employee_logins int,
  ADD COLUMN locked_accounting_integration boolean,
  ADD COLUMN locked_at timestamptz,
  ADD COLUMN startup_fee_charged boolean DEFAULT false,
  ADD COLUMN deletion_requested_at timestamptz;

-- altid på for alle eksisterende
UPDATE business_plans SET route_planning_enabled = true;

ALTER TABLE businesses ADD COLUMN deleted_at timestamptz;

CREATE TABLE business_deletion_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
-- RLS: kun owner kan se egne; insert/update kun via service-role
```

**Lock-trigger:** daglig cron eller trigger ved `current_period_end - 3 days`. Implementeres via pg_cron job `lock_business_plan_changes` der kører hver time.

**Stripe products:**
- Ny `startup_fee_dkk` price (one-time, 2.269 kr) tilføjes som line-item på *første* checkout-session — `startup_fee_charged` sættes via webhook efter første betaling.
- Opret/opdater Stripe priser via `payments` tool: base 289, accounting 269, employee 59, startup 2269.

**Edge functions:**
- `send-business-deletion-code` (ny)
- `confirm-business-deletion` (ny)
- `lock-business-plans` (ny, cron)
- `create-checkout-session` (opdateres)
- `payments-webhook` (opdateres til at sætte `startup_fee_charged`)

## Filer der ændres

- `src/components/admin/BusinessOnboarding.tsx` — nyt tekstindhold, fjern rute-toggle
- `src/components/admin/SettingsTab.tsx` — fjern rute-toggle, ny opsigelses-sektion, lock-banner
- `src/components/admin/NextStepCard.tsx` + `onboarding/OnboardingHub.tsx` — nye tekster
- `src/components/landing/ForBusinesses.tsx` — ny prismodel-sektion
- `src/components/platform-admin/PlatformPlatformSettingsTab.tsx` — opstartspris-felt
- `src/hooks/useBusinessPlan.ts` — nyt `startup_fee_dkk`, lock-felter
- `supabase/functions/create-checkout-session/index.ts` — opstartspris-line-item
- `supabase/functions/payments-webhook/index.ts` — marker `startup_fee_charged`
- Nye edge functions: deletion-code flow + lock-cron
- Ny migration

## Bekræft før jeg fortsætter

1. **Ruteplanlægning altid inkluderet og usynlig som toggle** — bekræftet ✓
2. **Opstartspris 2.269 kr tilføjes til *første rigtige faktura*** (efter prøveperiode), ikke ved kortregistrering. OK?
3. **Lock-periode = 3 dage før fakturering.** OK med 3 dage, eller foretrækker du 7?
4. **Sletning = soft-delete** (`deleted_at`, kan rulles tilbage af platform-admin i 30 dage). OK, eller skal det være hard-delete med det samme?
