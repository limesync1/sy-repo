import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.PGHOST);

describe.skipIf(!hasDb)("completion-gated five-minute recurrence", () => {
  it("waits five minutes after completion, creates one routed order, and never repeats pending work", () => {
    const result = execFileSync("psql", ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1"], {
      encoding: "utf8",
      input: String.raw`
BEGIN;
DO $test$
DECLARE
  sub public.subscriptions%ROWTYPE;
  stop public.route_stops%ROWTYPE;
  child uuid;
  count_before integer;
  count_after integer;
BEGIN
  SELECT s.* INTO sub FROM public.subscriptions s
  JOIN public.orders o ON o.id = s.order_id
  WHERE s.interval = 'every_5_minutes_test' AND s.status = 'active'
    AND EXISTS (SELECT 1 FROM public.route_stops rs WHERE rs.order_id=o.id)
  LIMIT 1;
  IF sub.id IS NULL THEN RAISE EXCEPTION 'No routed five-minute test subscription available'; END IF;
  SELECT * INTO stop FROM public.route_stops WHERE order_id=sub.order_id LIMIT 1;

  -- A completed appointment must schedule exactly five minutes, not tomorrow.
  stop.completed_at := now();
  PERFORM public._apply_completion_handle(stop);
  IF (SELECT next_service_date FROM public.subscriptions WHERE id=sub.id) <> now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Next appointment is not five minutes after completion';
  END IF;
  SELECT count(*) INTO count_before FROM public.orders WHERE business_id=sub.business_id;
  PERFORM public.auto_recur_hourly_test_orders();
  SELECT count(*) INTO count_after FROM public.orders WHERE business_id=sub.business_id;
  IF count_after <> count_before THEN RAISE EXCEPTION 'Appointment repeated before five minutes'; END IF;

  -- Make only this test subscription due; all mutations and HTTP queue inserts roll back.
  UPDATE public.subscriptions SET next_service_date=now()+interval '1 day'
  WHERE interval IN ('every_5_minutes_test','every_30_minutes_test','every_1_hour_test') AND id<>sub.id;
  UPDATE public.subscriptions SET next_service_date=now()-interval '1 second' WHERE id=sub.id;
  PERFORM public.auto_recur_hourly_test_orders();
  SELECT order_id INTO child FROM public.subscriptions WHERE id=sub.id;
  IF child = sub.order_id THEN RAISE EXCEPTION 'Next order was not created'; END IF;
  IF (SELECT status FROM public.orders WHERE id=child) <> 'confirmed' THEN
    RAISE EXCEPTION 'Next order is not uncompleted';
  END IF;
  IF (SELECT count(*) FROM public.route_stops WHERE order_id=child AND subscription_id=sub.id AND status='pending') <> 1 THEN
    RAISE EXCEPTION 'Next order does not have exactly one pending route stop';
  END IF;
  IF (SELECT count(*) FROM public.subscriptions WHERE order_id=child AND status='active') <> 1 THEN
    RAISE EXCEPTION 'Recurring child created another subscription';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_integrations WHERE business_id=sub.business_id AND is_active)
    AND NOT EXISTS (SELECT 1 FROM public.accounting_sync_queue WHERE entity_id=child AND entity_type='order') THEN
    RAISE EXCEPTION 'Next uncompleted order was not queued for accounting';
  END IF;

  SELECT count(*) INTO count_before FROM public.orders WHERE business_id=sub.business_id;
  UPDATE public.subscriptions SET next_service_date=now()-interval '1 second' WHERE id=sub.id;
  PERFORM public.auto_recur_hourly_test_orders();
  SELECT count(*) INTO count_after FROM public.orders WHERE business_id=sub.business_id;
  IF count_after <> count_before THEN RAISE EXCEPTION 'Outstanding order repeated'; END IF;

  -- Even a stale subscription pointing at a completed ancestor cannot duplicate the child.
  UPDATE public.subscriptions SET order_id=sub.order_id WHERE id=sub.id;
  PERFORM public.auto_recur_hourly_test_orders();
  SELECT count(*) INTO count_after FROM public.orders WHERE business_id=sub.business_id;
  IF count_after <> count_before THEN RAISE EXCEPTION 'Stale ancestor duplicated outstanding order'; END IF;
END;
$test$;
ROLLBACK;
SELECT 'recurrence guards passed';
`,
    });
    expect(result.trim()).toBe("recurrence guards passed");
  });
});