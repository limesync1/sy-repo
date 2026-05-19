// Unit tests for decideLock — verificerer at lock-cron kun låser planer
// indenfor 3-dages vinduet før fakturering, og at den ikke låser samme
// cyklus to gange. Køres via `deno test` på edge function.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideLock, LOCK_WINDOW_DAYS, type LockCandidate } from "./index.ts";

const NOW = new Date("2026-01-15T12:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

function plan(overrides: Partial<LockCandidate> = {}): LockCandidate {
  return {
    id: "p1",
    extra_employee_logins: 2,
    accounting_integration_enabled: true,
    trial_ends_at: null,
    current_period_end: inDays(2),
    locked_at: null,
    ...overrides,
  };
}

Deno.test("låser når periode slutter indenfor 3 dage", () => {
  const d = decideLock(plan({ current_period_end: inDays(2) }), NOW);
  assertEquals(d.shouldLock, true);
  assertEquals(d.patch?.locked_extra_employee_logins, 2);
  assertEquals(d.patch?.locked_accounting_integration, true);
});

Deno.test("låser præcis på vinduets kant (3 dage)", () => {
  const d = decideLock(plan({ current_period_end: inDays(LOCK_WINDOW_DAYS) }), NOW);
  assertEquals(d.shouldLock, true);
});

Deno.test("låser IKKE hvis periode slutter udenfor vinduet (>3 dage)", () => {
  const d = decideLock(plan({ current_period_end: inDays(5) }), NOW);
  assertEquals(d.shouldLock, false);
  assertEquals(d.reason, "outside_window");
});

Deno.test("låser IKKE hvis periode allerede er passeret", () => {
  const d = decideLock(plan({ current_period_end: inDays(-1) }), NOW);
  assertEquals(d.shouldLock, false);
  assertEquals(d.reason, "period_passed");
});

Deno.test("låser IKKE hvis allerede låst i samme cyklus", () => {
  const d = decideLock(
    plan({ current_period_end: inDays(2), locked_at: inDays(-1) }),
    NOW,
  );
  assertEquals(d.shouldLock, false);
  assertEquals(d.reason, "already_locked_this_cycle");
});

Deno.test("låser IGEN i ny cyklus (locked_at >30 dage før period_end)", () => {
  const d = decideLock(
    plan({ current_period_end: inDays(2), locked_at: inDays(-31) }),
    NOW,
  );
  assertEquals(d.shouldLock, true);
});

Deno.test("falder tilbage på trial_ends_at hvis current_period_end mangler", () => {
  const d = decideLock(
    plan({ current_period_end: null, trial_ends_at: inDays(1) }),
    NOW,
  );
  assertEquals(d.shouldLock, true);
});

Deno.test("låser IKKE uden nogen periode", () => {
  const d = decideLock(
    plan({ current_period_end: null, trial_ends_at: null }),
    NOW,
  );
  assertEquals(d.shouldLock, false);
  assertEquals(d.reason, "no_period_end");
});

Deno.test("simulerer 7 daglige kørsler — låser nøjagtigt én gang i cyklus", () => {
  let state: LockCandidate = plan({ current_period_end: inDays(7) });
  let lockCount = 0;
  for (let day = 0; day < 7; day++) {
    const cronTime = new Date(NOW.getTime() + day * 24 * 60 * 60 * 1000);
    const d = decideLock(state, cronTime);
    if (d.shouldLock && d.patch) {
      lockCount++;
      state = { ...state, locked_at: d.patch.locked_at };
    }
  }
  assertEquals(lockCount, 1);
});