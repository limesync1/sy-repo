
-- Trin 1: Lock admin role to william@adely.dk only

-- 1) Trigger function: block any insert/update/delete on user_roles where role='admin'
--    except for the existing william@adely.dk admin row.
CREATE OR REPLACE FUNCTION public.guard_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  william_id uuid;
  target_user uuid;
  target_role app_role;
BEGIN
  SELECT id INTO william_id FROM auth.users WHERE lower(email) = 'william@adely.dk' LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    target_user := OLD.user_id;
    target_role := OLD.role;
  ELSE
    target_user := NEW.user_id;
    target_role := NEW.role;
  END IF;

  IF target_role = 'admin'::app_role THEN
    -- Allow only seeding/preserving William's admin row
    IF william_id IS NULL OR target_user <> william_id THEN
      RAISE EXCEPTION 'Admin role is locked and can only be held by william@adely.dk';
    END IF;
    -- Block delete of William's admin row too
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot remove the locked admin role';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_admin_role_trg ON public.user_roles;
CREATE TRIGGER guard_admin_role_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role();

-- 2) Update admin_set_user_role to reject admin grants/revokes outright
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role app_role, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _role = 'admin'::app_role THEN
    RAISE EXCEPTION 'Admin role is locked and cannot be assigned or removed';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

-- 3) Idempotent seed: ensure William has admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email)='william@adely.dk'
ON CONFLICT (user_id, role) DO NOTHING;
