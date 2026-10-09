CREATE OR REPLACE FUNCTION public.validate_employee_self_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT EXISTS (
       SELECT 1 FROM public.businesses b
       WHERE b.id = OLD.business_id AND b.owner_id = auth.uid()
     )
  THEN
    IF (to_jsonb(NEW) - ARRAY['name', 'avatar_url', 'updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['name', 'avatar_url', 'updated_at'])
    THEN
      RAISE EXCEPTION 'Employees may only update their own name and avatar';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_employee_self_profile_update_trigger ON public.employees;
CREATE TRIGGER validate_employee_self_profile_update_trigger
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.validate_employee_self_profile_update();

DROP POLICY IF EXISTS "Employees update own profile" ON public.employees;
CREATE POLICY "Employees update own profile"
ON public.employees
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON public.employees TO authenticated;