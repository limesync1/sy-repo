-- Forhindre fremtidige duplikat-abonnementer pr. ordre+service
-- Først: ryd eksisterende duplikater (behold nyeste active/paused)
WITH ranked AS (
  SELECT id, order_id, service_id, status, created_at,
         ROW_NUMBER() OVER (
           PARTITION BY order_id, COALESCE(service_id::text, service_name)
           ORDER BY CASE status WHEN 'active' THEN 3 WHEN 'paused' THEN 2 WHEN 'pending' THEN 1 ELSE 0 END DESC,
                    created_at DESC
         ) AS rn
    FROM public.subscriptions
   WHERE order_id IS NOT NULL
)
DELETE FROM public.subscriptions s USING ranked r
 WHERE s.id = r.id AND r.rn > 1;

-- Marker subs på cancelled ordrer som cancelled
UPDATE public.subscriptions s
   SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, now()), updated_at = now()
  FROM public.orders o
 WHERE s.order_id = o.id AND o.status = 'cancelled' AND s.status <> 'cancelled';

-- Unik index så vi aldrig får dubletter pr. ordre+service igen
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_order_service
  ON public.subscriptions (order_id, service_id)
  WHERE order_id IS NOT NULL AND service_id IS NOT NULL;
