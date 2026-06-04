# `route_stops` triggers — komplet flow

Denne fil dokumenterer alle 17 triggers på `public.route_stops` og hvad der
sker når et stop markeres som udført. Den er én af to indgange (sammen med
koden i `src/lib/route-projection/`) når en udvikler skal forstå hvorfor en
handling i ruteplanlæggeren har en bestemt sideeffekt.

Sidst opdateret: 2026-06-04. Hvis nye triggers tilføjes via migration, opdater
denne fil i samme PR.

## Trigger-katalog

| # | Navn | Timing | Event | Formål |
|---|------|--------|-------|--------|
| 1 | `trg_guard_employee_future_stop_status` | BEFORE | UPDATE OF status | Blokerer markering som udført før `planned_arrival`/rutedato. Returnerer dansk fejlbesked med Europe/Copenhagen-tid og rest-tid. |
| 2 | `trg_route_stops_updated` | BEFORE | UPDATE | Sætter `updated_at = now()`. |
| 3 | `trg_prevent_duplicate_route_stops_cross_route` | BEFORE | INSERT / UPDATE OF route_id, order_id, subscription_id, agreement_occurrence_id | Forhindrer at samme aftale-occurrence ligger på to ruter samtidig. |
| 4 | `trg_handle_route_stop_completion` | AFTER | UPDATE (when completed) | Opdaterer `agreement_occurrences.completed_at` og kalder `ensure_next_agreement_occurrence` så Kørsel N+1 oprettes. |
| 5 | `trg_enqueue_invoice_when_route_stop_completed` | AFTER | UPDATE OF status (when completed) | Indsætter job i `sync_queue` — fanges af `accounting-sync` edge function. Idempotent via `uq_sync_queue_active_entity`. |
| 6 | `trg_enqueue_invoice_on_stop_completion` | AFTER | UPDATE | Legacy/parallel kø-mekanisme. Bevares for bagudkompatibilitet. |
| 7 | `trg_snapshot_completed_stop` | AFTER | INSERT / UPDATE OF status | Fryser pris, kundedata og service-snapshot på det færdige stop. |
| 8 | `trg_record_stop_duration` | AFTER | UPDATE OF status | Skriver faktisk varighed til `service_duration_history`. |
| 9 | `trg_update_service_duration_estimate` | AFTER | UPDATE (when completed) | Opdaterer estimeret varighed på `services` baseret på historik. |
| 10 | `trg_sync_occurrence_from_stop` | AFTER | INSERT / UPDATE OF route_id, agreement_occurrence_id | Holder `agreement_occurrence` synkron med stop-data. |
| 11 | `trg_sync_preferred_route_from_stop` | AFTER | INSERT / UPDATE | Opdaterer `agreement.preferred_route_id` når et stop flyttes. |
| 12 | `trg_queue_customer_notifs` | AFTER | INSERT / UPDATE OF status, planned_arrival, route_id | Lægger kunde-notifikationer i kø (SMS/e-mail). |
| 13 | `trg_audit_route_stops` | AFTER | INSERT / DELETE / UPDATE | Skriver til `audit_log` med hele diff'en. |
| 14 | `recalc_route_totals_trigger` | AFTER | INSERT / DELETE / UPDATE | Genberegner pris/varighed-totaler på `routes`. |
| 15 | `trg_detach_snapshot_on_stop_delete` | BEFORE | DELETE | Bryder snapshot-referencen før sletning så snapshottet kan bevares. |
| 16 | `trg_detach_subscription_route_on_stop_delete` | AFTER | DELETE | Nulstiller `subscription.preferred_route_id` hvis nødvendigt. |
| 17 | `trg_cleanup_empty_route` | AFTER | DELETE | Sletter ruten hvis det var det sidste stop. |

## Flow: medarbejder markerer stop som udført

Diagrammet svarer 1:1 til `/mnt/documents/route-stops-triggers.mmd`.

```text
UPDATE route_stops SET status='completed' WHERE id = :id

┌─ BEFORE UPDATE ──────────────────────────────────────────────────────┐
│  trg_guard_employee_future_stop_status                                │
│    └─ RAISE EXCEPTION hvis planned_arrival > now()                    │
│       "Kan først udføres 12-06-2026 kl. 10:00 (dansk tid) — om 2t"   │
│  trg_route_stops_updated         (updated_at = now())                 │
│  trg_prevent_duplicate_route_stops_cross_route                        │
└──────────────────────────────────────────────────────────────────────┘
              │
              ▼  rækken skrives
┌─ AFTER UPDATE (parallelt, ingen garanteret rækkefølge) ──────────────┐
│  trg_handle_route_stop_completion                                     │
│    ├─ agreement_occurrences.completed_at = now()                      │
│    └─ ensure_next_agreement_occurrence() → Kørsel N+1                 │
│  trg_enqueue_invoice_when_route_stop_completed                        │
│    └─ INSERT INTO sync_queue (... agreement_occurrence_id ...)        │
│       UNIQUE (uq_sync_queue_active_entity) → idempotent ved retry     │
│  trg_snapshot_completed_stop      (fryser pris/kunde-data)            │
│  trg_record_stop_duration         (service_duration_history)          │
│  trg_update_service_duration_estimate                                 │
│  trg_sync_occurrence_from_stop                                        │
│  trg_sync_preferred_route_from_stop                                   │
│  trg_queue_customer_notifs        (SMS/e-mail kø)                     │
│  trg_audit_route_stops            (audit_log)                         │
│  recalc_route_totals_trigger      (rutens totaler)                    │
└──────────────────────────────────────────────────────────────────────┘
              │
              ▼
   accounting-sync edge function (cron + on-demand)
     ├─ accounting_order_links UNIQUE (business_id, provider, agreement_occurrence_id)
     │  → faktura genereres højst én gang pr. occurrence
     └─ external_order_number + invoice_external_id skrives tilbage på occurrence
```

## Idempotens-garantier

1. **Faktura pr. occurrence** — `accounting_order_links` har UNIQUE på
   `(business_id, provider, agreement_occurrence_id)`. Retries fra
   `accounting-sync` rammer enten den eksisterende række eller får
   `unique_violation` og marker jobbet som færdigt.
2. **Sync-kø pr. entitet** — `uq_sync_queue_active_entity` partial unique
   index sikrer at samme `agreement_occurrence_id` kun har ét aktivt job
   ad gangen.
3. **Næste kørsel** — `ensure_next_agreement_occurrence` bruger UNIQUE på
   `(agreement_id, sequence_index)`, så samme Kørsel N+1 ikke kan oprettes
   to gange ved samtidige completions.

## Hvad sker der hvis en trigger fejler?

- **`trg_guard_employee_future_stop_status`** kaster `RAISE EXCEPTION`
  → hele transaktionen rulles tilbage. Frontend viser fejlbeskeden direkte
  (se `src/lib/completion-guard.test.ts`).
- **AFTER-triggers** kører i samme transaktion. Hvis nogen fejler, rulles
  hele completion tilbage — stoppet er ikke markeret udført. Dette er
  ønsket: vi vil hellere have en synlig fejl end et halv-completed stop.
- **`accounting-sync` edge function** kører UDEN for transaktionen. Hvis
  den fejler, bliver `sync_queue`-rækken liggende med fejl-status og
  retry-tæller. Manuelt re-trigger via admin-panelet.

## Relateret kode

- `src/lib/route-projection/` — projection engine (Fase 1).
- `src/lib/completion-guard.test.ts` — verificerer trigger #1.
- `src/pages/RoutePlanner.tsx` — UI-orkestrering (læser denne fil i header).
- Migrationer der opretter/ændrer triggers: søg i `supabase/migrations/` på
  trigger-navnet.