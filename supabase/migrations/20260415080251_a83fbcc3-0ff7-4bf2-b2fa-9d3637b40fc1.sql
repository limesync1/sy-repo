-- Add recurring tracking fields to orders
ALTER TABLE public.orders 
ADD COLUMN next_service_date timestamp with time zone DEFAULT NULL,
ADD COLUMN completed_cycles integer NOT NULL DEFAULT 0;