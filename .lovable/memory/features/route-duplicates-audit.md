# Route duplicate audit

Status: opdateret 2026-05-26.

## Kendte duplicate-veje der skal holdes sikre

1. `useAddStop` / aftale til rute — skal bruge `add_route_stop_idempotent`, aldrig direkte `route_stops.insert`.
2. Aftale til tom dag — opretter rute og kalder samme idempotente stop-oprettelse.
3. Aftale til eksisterende rute — samme som ovenfor.
4. `move_stops_to_route` — skal låse målruten, deduppe mod `order_id`, `subscription_id`, `agreement_occurrence_id`, og slette redundant source-stop ved konflikt.
5. `move_stops_to_date` — skal finde/oprette split-rute, låse målruten, deduppe og aldrig opdatere ind i en konflikt.
6. `reorder_route_stops` — drag/drop må ikke flytte et stop til en rute der allerede har samme ordre/abo/occurrence.
7. `move_route_to_date` — må flytte ruten in-place og må ikke klone samme ruteserie til en ny dato.
8. `materialize_virtual_route` — må ikke klone stops der allerede findes på materialiseret rute.
9. `_materialize_occurrence_on_route`, `_materialize_single_occurrence`, `_worker_materialize_occurrence`, `materialize_occurrence_to_route` — materialisering skal være idempotent med conflict handling.
10. `ensure_next_agreement_occurrence` / completion-flow — næste occurrence skal genbruge eksisterende occurrence og materialisere idempotent.
11. `auto_recur_due_orders` — tilbagevendende ordre/route_stop-oprettelse skal være conflict-safe.
12. Automatisk route-template materialisering — samme `business_id + route_date + route_template_id` må ikke kunne lave to ruter ved race.
13. Edge function `optimize-route` — må kun opdatere sequence/tider på eksisterende stops; ikke oprette/flytte stops.

## Database-garantier

- `route_stops`: unique pr. rute for `order_id`, `subscription_id`, `agreement_occurrence_id`.
- `routes`: unique pr. ruteserie pr. dato.
- `routes`: unique pr. ruteskabelon pr. dato.
- Stop-flyt/oprettelse skal bruge advisory locks pr. målrute for at lukke race conditions.