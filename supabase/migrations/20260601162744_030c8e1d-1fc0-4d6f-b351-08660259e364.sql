-- Tilføj manglende FK fra agreements.preferred_route_id til routes(id) med ON DELETE SET NULL,
-- så ruter aldrig kan slettes uden at rydde aftaleregisterets henvisninger — det forhindrer
-- "spøgelses-ruter" i ruteplanlæggeren efter en fletning/sletning.

-- Ryd eventuelle eksisterende dangling-referencer først så FK kan oprettes.
UPDATE public.agreements a
   SET preferred_route_id = NULL
 WHERE preferred_route_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.routes r WHERE r.id = a.preferred_route_id);

ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_preferred_route_id_fkey
  FOREIGN KEY (preferred_route_id) REFERENCES public.routes(id) ON DELETE SET NULL;