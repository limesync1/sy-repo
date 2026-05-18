-- 1) Update employee login limit trigger: owner gets a free seat,
--    so the effective limit = extra_employee_logins + 1.
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

    -- Owner-loginnet er altid inkluderet gratis (+1 plads).
    v_limit := v_limit + 1;

    SELECT COUNT(*)
      INTO v_count
      FROM public.employees
     WHERE business_id = NEW.business_id
       AND is_active = true
       AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_count >= v_limit THEN
      RAISE EXCEPTION
        'Du har nået grænsen på % medarbejderlogin(s) i jeres abonnement (inkl. ejer-login). Opskalér antallet under Indstillinger → Tilvalg og ekstra funktioner for at tilføje flere.',
        v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Auto-create the owner as an employee whenever a business is created.
CREATE OR REPLACE FUNCTION public.create_owner_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name  text;
BEGIN
  SELECT u.email,
         COALESCE(
           NULLIF(u.raw_user_meta_data->>'full_name', ''),
           NULLIF(u.raw_user_meta_data->>'name', ''),
           split_part(u.email, '@', 1)
         )
    INTO v_email, v_name
    FROM auth.users u
   WHERE u.id = NEW.owner_id;

  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Undgå dubletter hvis triggeren af en eller anden grund kører to gange.
  IF EXISTS (
    SELECT 1 FROM public.employees
     WHERE business_id = NEW.id
       AND (user_id = NEW.owner_id OR lower(email) = lower(v_email))
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.employees (business_id, user_id, name, email, title, is_active)
  VALUES (NEW.id, NEW.owner_id, v_name, v_email, 'Ejer', true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_owner_employee ON public.businesses;
CREATE TRIGGER trg_create_owner_employee
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.create_owner_employee();

-- 3) Backfill: opret ejer-medarbejder for eksisterende virksomheder, der
--    endnu ikke har én.
INSERT INTO public.employees (business_id, user_id, name, email, title, is_active)
SELECT
  b.id,
  b.owner_id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  ),
  u.email,
  'Ejer',
  true
FROM public.businesses b
JOIN auth.users u ON u.id = b.owner_id
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.employees e
     WHERE e.business_id = b.id
       AND (e.user_id = b.owner_id OR lower(e.email) = lower(u.email))
  );