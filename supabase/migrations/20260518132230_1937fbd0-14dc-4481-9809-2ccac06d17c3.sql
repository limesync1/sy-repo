-- Enforce the paid employee-login limit on the employees table.
-- A business may have at most `business_plans.extra_employee_logins` ACTIVE
-- employee rows. Trying to insert another active employee or to reactivate a
-- deactivated one beyond the limit raises an exception so RLS-permitted
-- writes from the client (and the create-employee edge function) both fail
-- safely with a clear Danish message.

CREATE OR REPLACE FUNCTION public.enforce_employee_login_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
  v_count int;
BEGIN
  -- Only check when the row will be active after the write, and only when
  -- the change actually adds an active employee (new active row, or
  -- reactivating a previously inactive one).
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.is_active, true) = true)
     OR (TG_OP = 'UPDATE'
         AND COALESCE(NEW.is_active, true) = true
         AND COALESCE(OLD.is_active, true) = false)
  THEN
    SELECT COALESCE(extra_employee_logins, 0)
      INTO v_limit
      FROM public.business_plans
     WHERE business_id = NEW.business_id
     LIMIT 1;

    IF v_limit IS NULL THEN
      v_limit := 0;
    END IF;

    SELECT COUNT(*)
      INTO v_count
      FROM public.employees
     WHERE business_id = NEW.business_id
       AND is_active = true
       AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_count >= v_limit THEN
      RAISE EXCEPTION
        'Du har nået grænsen på % medarbejderlogin(s) i jeres abonnement. Opskalér antallet under Indstillinger → Tilvalg og ekstra funktioner for at tilføje flere.',
        v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_employee_login_limit ON public.employees;
CREATE TRIGGER enforce_employee_login_limit
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_employee_login_limit();