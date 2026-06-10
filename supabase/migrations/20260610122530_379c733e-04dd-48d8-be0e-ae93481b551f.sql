
REVOKE EXECUTE ON FUNCTION public._allocate_agreement_number(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._assign_agreement_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._assign_occurrence_number() FROM PUBLIC, anon, authenticated;
