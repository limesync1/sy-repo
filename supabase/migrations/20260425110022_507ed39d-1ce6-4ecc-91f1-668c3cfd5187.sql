ALTER TABLE public.employees
ADD COLUMN commission_pct numeric(5,2) NOT NULL DEFAULT 0
CHECK (commission_pct >= 0 AND commission_pct <= 100);

COMMENT ON COLUMN public.employees.commission_pct IS 'Procent provision medarbejderen får af omsætningen for udførte opgaver (0-100).';