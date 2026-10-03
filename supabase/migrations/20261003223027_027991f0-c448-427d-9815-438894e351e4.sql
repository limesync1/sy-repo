CREATE TABLE public.ai_usage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fn text NOT NULL,
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_usage_events TO service_role;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_usage_events_fn_time_idx ON public.ai_usage_events (fn, created_at DESC);
CREATE INDEX ai_usage_events_fn_client_time_idx ON public.ai_usage_events (fn, client_key, created_at DESC);