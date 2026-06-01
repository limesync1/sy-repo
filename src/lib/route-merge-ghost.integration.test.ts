import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

const hasDb = Boolean(process.env.PGHOST);

const runSql = (sql: string) => {
  if (!hasDb) return "";
  return execFileSync("psql", ["-v", "ON_ERROR_STOP=1", "-X", "-q", "-At"], {
    input: sql,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
};

/**
 * Regression-suite: garanterer at "spøgelses-ruter" aldrig kan blive stående
 * efter en fletning. Vi tester to ortogonale invarianter på server-niveau:
 *
 *   1) FK fra agreements.preferred_route_id → routes(id) ON DELETE SET NULL
 *      sørger for at en aftale aldrig kan pege på en slettet rute.
 *   2) assert_route_safely_deleted(_route_id) raiser hvis nogen alligevel
 *      manager at omgå FK'en (fx hvis et fremtidigt RPC glemmer at rydde op).
 *
 * Begge invariants validerer at projektionsloopet i RoutePlanner aldrig kan
 * få fat i en deleted-but-referenced rute og tegne en ghost.
 */
describe.skipIf(!hasDb)("DB integration: ingen spøgelses-ruter efter fletning", () => {
  it("FK rydder agreements.preferred_route_id automatisk når kilderuten slettes", () => {
    const sql = String.raw`
BEGIN;
DO $$
DECLARE
  v_business uuid;
  v_source uuid := gen_random_uuid();
  v_target uuid := gen_random_uuid();
  v_agreement uuid := gen_random_uuid();
  v_dangling int;
BEGIN
  SELECT id INTO v_business
    FROM public.businesses
   WHERE owner_id IS NOT NULL AND deleted_at IS NULL
   ORDER BY created_at LIMIT 1;
  IF v_business IS NULL THEN
    RAISE EXCEPTION 'DB integration prerequisite missing: no business';
  END IF;

  INSERT INTO public.routes (id, business_id, route_date, status, name)
  VALUES
    (v_source, v_business, DATE '2031-07-01', 'planned', 'Ghost regression: source'),
    (v_target, v_business, DATE '2031-07-02', 'planned', 'Ghost regression: target');

  INSERT INTO public.agreements (
    id, business_id, customer_name, customer_email, start_date, interval,
    preferred_route_id, employee_ids, total_amount, status
  ) VALUES (
    v_agreement, v_business, 'Ghost A', 'ghost-a@example.test',
    DATE '2031-07-01', 'hver uge', v_source, ARRAY[]::uuid[], 0, 'active'
  );

  -- Slet kilderuten — FK skal NULL'e preferred_route_id på aftalen.
  DELETE FROM public.routes WHERE id = v_source;

  SELECT COUNT(*) INTO v_dangling
    FROM public.agreements
   WHERE id = v_agreement AND preferred_route_id IS NOT NULL;

  IF v_dangling > 0 THEN
    RAISE EXCEPTION
      'Ghost route regression: agreement still references deleted route';
  END IF;
END $$;
ROLLBACK;
SELECT 'ok';
`;
    const out = runSql(sql).trim();
    expect(out.endsWith("ok")).toBe(true);
  });

  it("assert_route_safely_deleted raiser hvis nogen omgår FK'en og efterlader dangling refs", () => {
    // Vi simulerer den umulige tilstand ved at DISABLE FK'en kortvarigt,
    // efterlade en dangling ref, og forvente at assert-funktionen fanger det.
    const sql = String.raw`
BEGIN;
DO $$
DECLARE
  v_business uuid;
  v_source uuid := gen_random_uuid();
  v_agreement uuid := gen_random_uuid();
  v_raised boolean := false;
BEGIN
  SELECT id INTO v_business
    FROM public.businesses
   WHERE owner_id IS NOT NULL AND deleted_at IS NULL
   ORDER BY created_at LIMIT 1;

  INSERT INTO public.routes (id, business_id, route_date, status, name)
  VALUES (v_source, v_business, DATE '2031-07-10', 'planned', 'Assert regression');

  INSERT INTO public.agreements (
    id, business_id, customer_name, customer_email, start_date, interval,
    preferred_route_id, employee_ids, total_amount, status
  ) VALUES (
    v_agreement, v_business, 'Assert A', 'assert-a@example.test',
    DATE '2031-07-10', 'hver uge', v_source, ARRAY[]::uuid[], 0, 'active'
  );

  -- Omgå FK midlertidigt for at konstruere den "umulige" spøgelses-tilstand.
  ALTER TABLE public.agreements DISABLE TRIGGER ALL;
  DELETE FROM public.routes WHERE id = v_source;
  ALTER TABLE public.agreements ENABLE TRIGGER ALL;

  -- Aftalen peger nu på en ikke-eksisterende rute. Assert SKAL fange det.
  BEGIN
    PERFORM public.assert_route_safely_deleted(v_source);
  EXCEPTION WHEN data_exception THEN
    v_raised := true;
  END;

  IF NOT v_raised THEN
    RAISE EXCEPTION 'Assertion failed: assert_route_safely_deleted should have raised';
  END IF;
END $$;
ROLLBACK;
SELECT 'ok';
`;
    const out = runSql(sql).trim();
    expect(out.endsWith("ok")).toBe(true);
  });

  it("assert_route_safely_deleted godtager den sunde tilstand efter en korrekt fletning", () => {
    const sql = String.raw`
BEGIN;
DO $$
DECLARE
  v_business uuid;
  v_source uuid := gen_random_uuid();
  v_target uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_business
    FROM public.businesses
   WHERE owner_id IS NOT NULL AND deleted_at IS NULL
   ORDER BY created_at LIMIT 1;

  INSERT INTO public.routes (id, business_id, route_date, status, name)
  VALUES
    (v_source, v_business, DATE '2031-07-20', 'planned', 'Clean merge: source'),
    (v_target, v_business, DATE '2031-07-21', 'planned', 'Clean merge: target');

  -- Korrekt fletning: ingen aftaler, ingen stops → sikkert at slette.
  DELETE FROM public.routes WHERE id = v_source;
  PERFORM public.assert_route_safely_deleted(v_source);
END $$;
ROLLBACK;
SELECT 'ok';
`;
    const out = runSql(sql).trim();
    expect(out.endsWith("ok")).toBe(true);
  });
});