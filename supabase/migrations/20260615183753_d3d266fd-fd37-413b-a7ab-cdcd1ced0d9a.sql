CREATE POLICY "Business owners can view their accounting health alerts"
ON public.accounting_health_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = accounting_health_alerts.business_id
      AND b.owner_id = auth.uid()
  )
);