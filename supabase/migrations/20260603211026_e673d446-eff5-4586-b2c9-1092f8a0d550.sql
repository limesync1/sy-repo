-- Seed missing default notification templates for every business
-- so the UI never shows an empty subject/body for standard events.
INSERT INTO public.customer_notification_templates
  (business_id, event_type, channel, enabled, subject, body)
SELECT b.id, v.event_type, v.channel, true, v.subject, v.body
FROM public.businesses b
CROSS JOIN (VALUES
  ('service_upcoming',  'email',
   'Vi kommer og udfører {{service}}',
   E'Hej {{kundens_navn}},\n\nVi kommer forbi {{tidspunkt}} og udfører {{service}}.\n\nVi glæder os til at se dig.\n\nVenlig hilsen,\n{{firmanavn}}'),
  ('service_upcoming',  'sms',
   NULL,
   'Hej {{kundens_navn}}, vi kommer {{tidspunkt}} og udfører {{service}}. Mvh {{firmanavn}}'),
  ('service_completed', 'email',
   'Vi har udført {{service}}',
   E'Hej {{kundens_navn}},\n\nVi har i dag været forbi og udført {{service}}.\nDu modtager snarest faktura via vores regnskabssystem.\n\nTak fordi du valgte os.\n\nVenlig hilsen,\n{{firmanavn}}'),
  ('service_completed', 'sms',
   NULL,
   'Hej {{kundens_navn}}, vi har udført {{service}} i dag. Faktura sendes snarest. Mvh {{firmanavn}}')
) AS v(event_type, channel, subject, body)
ON CONFLICT (business_id, event_type, channel) DO NOTHING;