

## Hvad betyder "Mangler GPS"?

Badge'en vises på et stop når dets `latitude`/`longitude` mangler i databasen. Det betyder at adressen ikke er blevet verificeret/geokodet, så stoppet **kan ikke vises på kortet** og **kan ikke indgå i ruteoptimering** (afstand/køretid kan ikke beregnes). Det rammer typisk gamle/seedede ordrer — nye ordrer fra både kunder og virksomhedsejer geokodes nu automatisk via DAWA-autocomplete.

Jeg laver derudover to ting:

---

## 1. Tidsrum + estimeret varighed pr. service (i Opret bestilling-dialogen)

Tilføj felter pr. service-linje i `CreateManualOrderDialog`:

- **Estimeret varighed** (i minutter, default 30 — kan ændres pr. service)
- **Tidsrum** (valgfrit `time_window_start`/`time_window_end`, fx 09:00–11:00) — bruges som blødt vindue i ruteoptimering

Disse værdier skrives videre til hver `route_stop` der oprettes når kunden godkender.

---

## 2. Én ordre = ét stop pr. service i opgavepoolen

I dag oprettes **én ordre med flere `order_items`** → ét stop i poolen, selvom ordren har 5 services. Det giver dårlig planlægning fordi:

- Alle services bindes til samme stop, samme rute, samme medarbejder
- Forskellige services har forskellig varighed/tidskrav
- Kan ikke fordele services over flere dage eller flere medarbejdere

### Ny model: én ordre pr. service

Når en bestilling oprettes (manuelt af virksomhedsejer **eller** via normal kunde-checkout), splittes hver service ud i **sin egen `orders`-row** med ét tilhørende `order_items`. Hver ordre har:

- Egen `total_amount` (kun den service)
- Egen `preferred_date`, `time_window`, `duration_minutes`
- Egen pending/confirmed-status
- Sit eget kort i opgavepoolen → kan trækkes til hver sin rute/medarbejder

Det matcher præcist `route_stops`-modellen (ét stop = én opgave hos én kunde) og rutekørsel-flow'et i medarbejder-appen (medarbejder ser én ydelse ad gangen pr. stop).

### Sammenkædning på tværs af services

For at det stadig giver mening for kunden og som "én bestilling":

- Tilføj `parent_order_id` (uuid, nullable) til `orders` → peger på første ordre i gruppen
- Alle børn-ordrer arver `parent_order_id` = forældrens id (forælderen har sit eget id som parent_order_id)
- **Godkendelse**: kun forælderen får `approval_token` — ved godkendelse opdateres status på alle ordrer i gruppen i én transaktion (edge function loop)
- **Mail**: én mail med alle services listet under hinanden (uændret oplevelse)
- **Faktura/totaler**: virksomhedsejer ser dem grupperet i admin når `parent_order_id` er sat

### Konsekvenser for eksisterende flows

- **Opgavepool (`useUnassignedJobs`)**: ingen ændringer — den lister allerede pr. ordre, så hver service-ordre dukker op som sit eget kort
- **Rutekørsel for medarbejder**: hver `route_stop` peger på én ordre med ét item → simplere visning i `EmployeeRoute.tsx`
- **Abonnementer**: hver service-ordre får sit eget abonnement (uændret — én sub pr. service-id)
- **Route optimization**: VRP'en behandler nu hver service som separat besøg (kan stadig grupperes på samme adresse hvis rækkefølgen tillader det)

---

## Tekniske detaljer

**DB-migration:**
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_order_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;
```
(time-window-felterne `preferred_time_start`/`preferred_time_end` findes allerede.)

**Filer der opdateres:**
- `src/components/route-planner/CreateManualOrderDialog.tsx` — duration + tidsrum-felter pr. service-linje, splitter til N ordrer ved insert
- `src/components/business/CartSheet.tsx` — splitter `group.items` til én ordre pr. service-linje (parent = første)
- `src/hooks/useDatabase.ts` (`useCreateOrder`) — accepter parent-relationen
- `supabase/functions/customer-approve-order/index.ts` — opdater alle ordrer i gruppen ved godkendelse
- `supabase/functions/_shared/transactional-email-templates/manual-order-approval.tsx` — uændret, men modtager nu liste fra alle child-ordrer
- `src/hooks/useRoutes.ts` (`useAddStop`) — propagér `duration_minutes` + `time_window` fra ordren ved drop på rute
- `src/components/route-planner/UnassignedJobCard.tsx` — vis varighed når den er sat (ikke kun udledt fra time-window)

**Ingen ændringer i:** `route_stops`-skemaet, employee-app, ruteoptimering, abonnement-cron-trigger.

