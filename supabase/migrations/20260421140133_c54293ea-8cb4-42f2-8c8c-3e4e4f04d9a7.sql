ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_orders_parent ON public.orders(parent_order_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer;