CREATE OR REPLACE FUNCTION public.get_quote_request_contacts(p_ids uuid[])
RETURNS TABLE(quote_request_id uuid, customer_email text, customer_phone text, customer_name text, share_contact boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    qr.id,
    CASE WHEN qr.share_contact THEN qr.customer_email ELSE NULL END,
    CASE WHEN qr.share_contact THEN qr.customer_phone ELSE NULL END,
    qr.customer_name,
    qr.share_contact
  FROM public.quote_requests qr
  WHERE qr.id = ANY(p_ids)
    AND (
      EXISTS (
        SELECT 1
        FROM public.quote_request_matches qrm
        JOIN public.businesses b ON b.id = qrm.business_id
        WHERE qrm.quote_request_id = qr.id
          AND b.owner_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
$function$;

GRANT EXECUTE ON FUNCTION public.get_quote_request_contacts(uuid[]) TO authenticated;