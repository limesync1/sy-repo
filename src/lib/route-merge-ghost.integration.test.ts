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
 * efter en fletning. Vi verificerer to server-side invarianter som
 * RoutePlanner's projektions-loop er afhængig af for at undgå ghosts:
 *
 *   1) FK fra agreements.preferred_route_id → routes(id) ON DELETE SET NULL.
 *      Sammen med den eksisterende FK på subscriptions sikrer det at en
 *      slettet rute aldrig kan efterlade dangling referencer der ville
 *      få projektionen til at tegne et ghost-kort med kildens navn/farve.
 *
 *   2) assert_route_safely_deleted(_route_id) er en server-side invariant-
 *      tjekker som RoutePlanner kalder EFTER hver fletning. Den raiser
 *      hvis en sletning alligevel efterlod referencer (defense in depth
 *      mod fremtidige RPC'er der måtte glemme oprydning).
 *
 * Begge invariants er rene schema-/funktionstjek — de kræver ikke
 * destruktive grants og kan derfor køres i sandbox.
 */
describe.skipIf(!hasDb)("DB integration: ingen spøgelses-ruter efter fletning", () => {
  it("agreements.preferred_route_id har FK med ON DELETE SET NULL", () => {
    const sql = String.raw`
SELECT confdeltype
  FROM pg_constraint
 WHERE conname = 'agreements_preferred_route_id_fkey'
   AND conrelid = 'public.agreements'::regclass;
`;
    const out = runSql(sql).trim();
    // 'n' = SET NULL i pg_constraint.confdeltype
    expect(out).toBe("n");
  });

  it("subscriptions.preferred_route_id har FK med ON DELETE SET NULL", () => {
    const sql = String.raw`
SELECT confdeltype
  FROM pg_constraint
 WHERE conname = 'subscriptions_preferred_route_id_fkey'
   AND conrelid = 'public.subscriptions'::regclass;
`;
    const out = runSql(sql).trim();
    expect(out).toBe("n");
  });

  it("assert_route_safely_deleted findes som SECURITY DEFINER og kan kaldes", () => {
    const sql = String.raw`
SELECT prosecdef::int
  FROM pg_proc
 WHERE proname = 'assert_route_safely_deleted'
   AND pronamespace = 'public'::regnamespace;
`;
    const out = runSql(sql).trim();
    expect(out).toBe("1");
  });

  it("assert_route_safely_deleted returnerer rent for et tilfældigt aldrig-eksisteret rute-id", () => {
    // Et UUID der aldrig har eksisteret i routes må per definition ikke have
    // dangling references. Assert SKAL returnere uden at raise.
    const sql = String.raw`
DO $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  PERFORM public.assert_route_safely_deleted(v_id);
END $$;
SELECT 'ok';
`;
    const out = runSql(sql).trim();
    expect(out.endsWith("ok")).toBe(true);
  });

  it("der findes ingen dangling agreements eller subscriptions i live-databasen", () => {
    // Cross-check af live-tilstanden: FK'erne bør gøre dette umuligt, men
    // testen fungerer som canary hvis en migration nogensinde introducerer
    // en ghost-rute igen (fx via en SECURITY DEFINER der omgår FK).
    const sql = String.raw`
SELECT
  (SELECT count(*) FROM public.agreements a
    LEFT JOIN public.routes r ON r.id = a.preferred_route_id
   WHERE a.preferred_route_id IS NOT NULL AND r.id IS NULL)
  +
  (SELECT count(*) FROM public.subscriptions s
    LEFT JOIN public.routes r ON r.id = s.preferred_route_id
   WHERE s.preferred_route_id IS NOT NULL AND r.id IS NULL)
  AS total_dangling;
`;
    const out = runSql(sql).trim();
    expect(out).toBe("0");
  });
});