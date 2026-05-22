-- Drop overly permissive public SELECT on employee_invitations
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.employee_invitations;

-- Allow owners (business) and admins to view their invitations
CREATE POLICY "Owners and admins can view invitations"
ON public.employee_invitations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = employee_invitations.business_id
      AND b.owner_id = auth.uid()
  )
);

-- Token-based single-row lookup for the public invitation accept flow.
-- Returns the row only when an exact token match is provided — no enumeration possible.
CREATE OR REPLACE FUNCTION public.get_employee_invitation_by_token(_token text)
RETURNS SETOF public.employee_invitations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.employee_invitations
  WHERE token = _token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_employee_invitation_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_employee_invitation_by_token(text) TO anon, authenticated;