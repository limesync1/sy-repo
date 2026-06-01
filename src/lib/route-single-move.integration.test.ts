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

describe.skipIf(!hasDb)("DB integration: kun denne gang route move", () => {
  it("reuses one replacement route and never hits routes_unique_series_per_date", () => {
    const sql = String.raw`
BEGIN;
DO $$
DECLARE
  v_owner uuid;
  v_business uuid;
  v_base uuid := gen_random_uuid();
  v_order_1 uuid := gen_random_uuid();
  v_order_2 uuid := gen_random_uuid();
  v_agreement uuid := gen_random_uuid();
  v_result jsonb;
  v_replacement uuid;
  v_count int;
  v_calendar jsonb;
BEGIN
  SELECT id, owner_id INTO v_business, v_owner
  FROM public.businesses
  WHERE owner_id IS NOT NULL AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_business IS NULL THEN
    RAISE EXCEPTION 'DB integration prerequisite missing: no business with owner';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_owner::text, true);

  INSERT INTO public.routes (id, business_id, route_date, status, name)
  VALUES (v_base, v_business, DATE '2031-06-02', 'planned', 'DB regression base route');

  INSERT INTO public.orders (id, business_id, customer_name, customer_email, status, total_amount)
  VALUES
    (v_order_1, v_business, 'DB Regression 1', 'db-regression-1@example.test', 'confirmed', 100),
    (v_order_2, v_business, 'DB Regression 2', 'db-regression-2@example.test', 'confirmed', 200);

  INSERT INTO public.route_stops (route_id, order_id, sequence, status, customer_name, planned_arrival)
  VALUES
    (v_base, v_order_1, 0, 'planned', 'DB Regression 1', TIMESTAMPTZ '2031-06-02 08:00:00+00'),
    (v_base, v_order_2, 1, 'planned', 'DB Regression 2', TIMESTAMPTZ '2031-06-02 09:00:00+00');

  INSERT INTO public.agreements (
    id, business_id, customer_name, customer_email, start_date, interval,
    preferred_route_id, employee_ids, total_amount, status
  ) VALUES (
    v_agreement, v_business, 'DB Regression Agreement', 'db-regression-agreement@example.test',
    DATE '2031-06-02', 'ugentlig', v_base, '{}'::uuid[], 100, 'active'
  );

  v_result := public.move_route_to_date(v_base, DATE '2031-06-09', 'single');
  v_replacement := (v_result->>'new_route_id')::uuid;

  IF v_replacement IS NULL OR v_replacement = v_base THEN
    RAISE EXCEPTION 'single move did not materialize a separate replacement: %', v_result;
  END IF;

  v_result := public.move_route_to_date(v_base, DATE '2031-06-16', 'single');
  IF (v_result->>'new_route_id')::uuid <> v_replacement THEN
    RAISE EXCEPTION 'single move created a second replacement instead of reusing %: %', v_replacement, v_result;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.routes
  WHERE business_id = v_business
    AND COALESCE(base_route_id, id) = v_base
    AND route_date = DATE '2031-06-16'
    AND archived_at IS NULL
    AND deleted_at IS NULL;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected exactly one active route in series on target date, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.routes
  WHERE business_id = v_business
    AND base_route_id = v_base
    AND archived_at IS NULL
    AND deleted_at IS NULL;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'expected one reusable replacement route, got %', v_count;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.route_occurrence_exceptions
  WHERE base_route_id = v_base
    AND occurrence_date = DATE '2031-06-02'
    AND replacement_route_id = v_replacement
    AND exception_type = 'moved';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'missing single moved exception for original base date';
  END IF;

  v_calendar := public.get_route_calendar(v_business, DATE '2031-06-01', DATE '2031-06-30');
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_calendar->'routes') AS r(id uuid, route_date date)
    WHERE r.id = v_base AND r.route_date = DATE '2031-06-02'
  ) THEN
    RAISE EXCEPTION 'calendar still shows the suppressed basis route on its old date';
  END IF;
END $$;
ROLLBACK;
`;
    expect(() => runSql(sql)).not.toThrow();
  });
});