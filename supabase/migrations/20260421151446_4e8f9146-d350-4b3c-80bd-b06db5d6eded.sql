-- Add avatar_url and color to employees so business owners can either upload a photo
-- or fall back to a coloured dot in the route planner UI.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#64748b';