
-- Sæt planned_arrival ud fra rutens dato + planlagt starttid for alle stop der mangler det.
-- Dette får trigger'en til at fyre og kø-lægge påmindelser.
UPDATE public.route_stops rs
SET planned_arrival = ((r.route_date::timestamp + COALESCE(r.planned_start_time, '08:00'::time))) AT TIME ZONE 'Europe/Copenhagen'
FROM public.routes r
WHERE rs.route_id = r.id
  AND rs.planned_arrival IS NULL
  AND r.route_date IS NOT NULL
  AND rs.status <> 'completed';
