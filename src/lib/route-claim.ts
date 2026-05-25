/**
 * Idempotency-claim hjælper for ruteplanlæggerens mutationer.
 *
 * Hver mutation (drag-drop, flet, slet, opret) genererer en unik nøgle og
 * kalder `claimRouteMutation()` FØR den udfører handlingen. Hvis claim'en
 * fejler (nøglen allerede er set) skipper vi handlingen stille — det betyder
 * at en dobbeltklik eller network-retry aldrig kan duplikere skrivninger.
 *
 * Backend: `public.try_claim_route_mutation(_key, _kind, _business_id)`
 * laver `INSERT … ON CONFLICT DO NOTHING` på `route_mutation_claims` og
 * returnerer true KUN første gang.
 */
import { supabase } from "@/integrations/supabase/client";

export type RouteMutationKind =
  | "create_route"
  | "delete_route"
  | "move_route"
  | "merge_route"
  | "add_stop"
  | "move_stop"
  | "remove_stop"
  | "shift_projected"
  | "optimize_route";

/** Generér en stabil idempotency-nøgle der overlever React-rerenders i samme drop. */
export function newRouteMutationKey(kind: RouteMutationKind, hint?: string): string {
  const id = (globalThis as any).crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return hint ? `${kind}:${hint}:${id}` : `${kind}:${id}`;
}

/** Returnerer true hvis vi har "vundet" handlingen — false hvis nogen anden allerede har taget den. */
export async function claimRouteMutation(
  key: string,
  kind: RouteMutationKind,
  businessId?: string | null,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("try_claim_route_mutation" as any, {
      _key: key, _kind: kind, _business_id: businessId ?? null,
    });
    if (error) {
      // Fail-open: en RPC-fejl må ikke blokere brugeren — vi falder tilbage
      // til normal flow og lader DB-unikke constraints fange dubletter.
      console.warn("claimRouteMutation rpc-fejl — fail-open", error);
      return true;
    }
    return data === true;
  } catch (e) {
    console.warn("claimRouteMutation kastet — fail-open", e);
    return true;
  }
}

/**
 * Pak en mutation ind så den kun udføres én gang pr. nøgle.
 * Eksempel:
 *   const key = newRouteMutationKey("move_stop", stop.id);
 *   await withRouteClaim(key, "move_stop", businessId, async () => {
 *     await actuallyMoveStop();
 *   });
 */
export async function withRouteClaim<T>(
  key: string,
  kind: RouteMutationKind,
  businessId: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T | null> {
  const won = await claimRouteMutation(key, kind, businessId);
  if (!won) {
    console.info(`[route-claim] springer over duplikeret ${kind} (key=${key})`);
    return null;
  }
  return fn();
}