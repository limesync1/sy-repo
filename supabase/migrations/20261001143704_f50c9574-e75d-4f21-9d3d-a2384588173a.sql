ALTER TABLE public.employee_workdays
ADD COLUMN IF NOT EXISTS accumulated_seconds integer NOT NULL DEFAULT 0
CHECK (accumulated_seconds >= 0);