/**
 * Verificerer at server-side guarden mod for-tidlig completion virker
 * og returnerer en tydelig dansk fejlbesked med tidszone og resterende tid.
 *
 * Kører mod den deployede database via RPC `_test_completion_guard`, så
 * vi tester den FAKTISKE SQL-logik — ikke en kopi af reglen i JS.
 */
import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

const skip = !import.meta.env.VITE_SUPABASE_URL;
const d = skip ? describe.skip : describe;

d("server-side completion guard", () => {
  it("tillader completion når planlagt tid ligger i fortiden", async () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const { data, error } = await (supabase.rpc as any)("_test_completion_guard", { _planned: past });
    expect(error).toBeNull();
    expect((data as any).ok).toBe(true);
  });

  it("blokerer completion 30 minutter ude i fremtiden med tydelig besked", async () => {
    const soon = new Date(Date.now() + 30 * 60_000).toISOString();
    const { data, error } = await (supabase.rpc as any)("_test_completion_guard", { _planned: soon });
    expect(error).toBeNull();
    expect((data as any).ok).toBe(false);
    expect((data as any).hint).toBe("OCCURRENCE_NOT_YET_DUE");
    expect((data as any).error).toMatch(/Kan først udføres/);
    expect((data as any).error).toMatch(/dansk tid/);
    expect((data as any).error).toMatch(/om \d+ min/);
  });

  it("inkluderer dato og klokkeslæt når blokeret flere dage frem", async () => {
    const days = new Date(Date.now() + 3 * 24 * 3600_000).toISOString();
    const { data, error } = await (supabase.rpc as any)("_test_completion_guard", { _planned: days });
    expect(error).toBeNull();
    expect((data as any).error).toMatch(/\d{2}-\d{2}-\d{4}/);
    expect((data as any).error).toMatch(/kl\. \d{2}:\d{2}/);
    expect((data as any).error).toMatch(/om \d+ dage/);
  });
});
