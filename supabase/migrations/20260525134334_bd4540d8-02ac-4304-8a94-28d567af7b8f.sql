
CREATE OR REPLACE FUNCTION public.validate_agreement_pause_range()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'pause end_date (%) cannot be before start_date (%)', NEW.end_date, NEW.start_date;
  END IF;
  RETURN NEW;
END;
$$;
