# Plan: Test-service + dynamiske notifikations-overrides

## 1. Test-service for Ready2Clean ApS
- Opret en service **"Test-service (10 min interval)"** på Ready2Clean ApS.
- `pricing_type = fast_pris`, `base_price = 1`, `interval_options = ['10_min']`, `is_active = true`.
- Bruges kun til at trigge påmindelses- og recurring-flows hurtigt under test.

## 2. Dynamiske notifikations-overrides (3 niveauer)

I dag styres SMS/email-påmindelser kun på virksomheds-niveau via `businesses.notification_settings` og `customer_notification_templates`. Vi udvider med to ekstra niveauer som **overrider** virksomhedens default:

```text
Virksomhed (default)
   └── Kunde (override pr. kunde)
          └── Aftale (override pr. aftale/abonnement)
```

Effektivt valg pr. udsendelse: `aftale ?? kunde ?? virksomhed`.

### Datamodel (ny migration)

Én generisk tabel `notification_overrides` der gælder alle event-types og kanaler:

```text
notification_overrides
  id              uuid pk
  business_id     uuid (fk businesses)
  scope           enum('customer','agreement')
  customer_id     uuid null      -- for scope='customer' og 'agreement'
  subscription_id uuid null      -- for scope='agreement'
  event_type      text           -- service_upcoming | service_completed | invoice_sent | …
  channel         enum('email','sms')
  enabled         boolean null   -- null = arv, true/false = tving
  lead_time_minutes int null     -- override af hvornår påmindelse sendes
  subject         text null      -- override af skabelon
  body            text null
  created_at, updated_at
  UNIQUE (business_id, scope, customer_id, subscription_id, event_type, channel)
```

RLS: virksomhedsejer kan CRUD egne rækker; kunden kan læse/skrive sine egne kunde-rækker.

### Dispatcher-logik
`customer-notifications-dispatch/index.ts` beriges med en `resolveNotificationConfig()` der for hver job slår op:
1. Aftale-override (hvis `agreement_occurrence_id` → subscription)
2. Kunde-override (via `order.customer_id`/email)
3. Virksomheds-skabelon + `notification_settings` (eksisterende)

Hvis `enabled = false` på et niveau → annullér job med årsag "Slået fra på {scope}-niveau".
Hvis `lead_time_minutes` afviger → recurring-orders bruger det ved enqueueing.

### UI (nyt design, semantiske tokens)

**A. På kundens profilside i virksomhedens admin** (`src/components/admin/customers/...`):
- Ny fane/sektion **"Notifikationer"** med kort pr. event-type. Hver række viser:
  - Status-badge: *Arver fra virksomhed* | *Tilpasset for kunde* | *Slået fra*
  - Toggle (3-state: arv / til / fra) + "Tilpas skabelon"-knap der åbner sheet med subject/body + lead time slider.
- Live-preview af resulterende beskedtekst med kundens variabler udfyldt.

**B. På aftalen** (`Aftaler`-siden → aftale-detalje):
- Samme komponent genbrugt men scope=agreement; viser arve-kæden visuelt:
  *Virksomhed → Kunde → Denne aftale*. Bruger kan "afkoble" et niveau.

**C. I kundens eget dashboard** (`CustomerDashboard.tsx`):
- Eksisterende notifikations-præferencer udvides så kunden også kan slå pr. virksomhed/pr. aftale fra.

### Smarte detaljer
- Auto-disable: hvis kunden svarer "STOP" på SMS → opretter automatisk override `enabled=false` på kunde-niveau for sms-kanalen.
- Sammenfald-detektion: hvis aftale-override = virksomheds-default → vis "Nulstil til arv" knap (rydder override-rækken).
- Validering: lead_time_minutes ≥ 0 og ≤ 14 dage; skabelon-variabler valideres mod kendt liste.

## Teknisk omfang
- 1 migration (tabel + RLS + grants + trigger til updated_at)
- 1 data-insert (test-service)
- `customer-notifications-dispatch/index.ts`: tilføj `resolveNotificationConfig()`
- `recurring-orders/index.ts`: brug overridden lead_time når jobs enqueues
- Ny komponent `NotificationOverridesPanel.tsx` (genbruges 3 steder)
- Tilføj fane i kunde-profil + aftale-detalje + customer dashboard

## Det jeg IKKE rører
- Eksisterende `customer_notification_templates` (virksomhedsdefault) — beholdes som bunden af arve-kæden.
- Eksisterende `notification_settings` JSON på businesses — beholdes.
- Auth-emails (signup/reset) — uden for scope.
