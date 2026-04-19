
-- Add work hours per employee + start-from-home flag per route
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS work_start_time time without time zone DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS work_end_time   time without time zone DEFAULT '16:00:00';

ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS start_from_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optimization_summary text,
  ADD COLUMN IF NOT EXISTS optimization_suggestions jsonb DEFAULT '[]'::jsonb;
