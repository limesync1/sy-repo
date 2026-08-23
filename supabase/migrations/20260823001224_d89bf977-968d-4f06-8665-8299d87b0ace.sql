GRANT SELECT, UPDATE, DELETE ON public.chat_message_feedback TO authenticated;
GRANT ALL ON public.chat_message_feedback TO service_role;
DROP POLICY IF EXISTS "Admins manage chat message feedback" ON public.chat_message_feedback;
CREATE POLICY "Admins manage chat message feedback" ON public.chat_message_feedback
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));