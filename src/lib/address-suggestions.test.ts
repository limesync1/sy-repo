import { beforeEach, describe, expect, it, vi } from "vitest";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: {} } }) } } }));
import { searchAddresses } from "./address-suggestions";
import { supabase } from "@/integrations/supabase/client";

describe("address suggestions", () => {
  beforeEach(() => invoke.mockReset());
  it("does not bill for very short input", async () => {
    expect(await searchAddresses("Vi")).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });
  it("deduplicates requests and reuses selected address results", async () => {
    const values = [{ address: "Vistorpvej 30", zip_code: "7540", city: "Haderup", latitude: 56.3, longitude: 9.0 }];
    invoke.mockResolvedValue({ data: { suggestions: values }, error: null });
    const [a, b] = await Promise.all([searchAddresses("Vistorpvej 30"), searchAddresses("Vistorpvej 30")]);
    expect(a).toEqual(values); expect(b).toEqual(values);
    expect(await searchAddresses("Vistorpvej 30")).toEqual(values);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("does not cache failed requests", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(searchAddresses("Test address failure")).rejects.toThrow("Adresseforslag");
    await expect(searchAddresses("Test address failure")).rejects.toThrow();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
  it("uses the unmetered guest provider when signed out", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null }, error: null });
    invoke.mockResolvedValue({ data: { suggestions: [] }, error: null });
    await searchAddresses("Guest address lookup");
    expect(invoke).toHaveBeenCalledWith("geocode-address", { body: { address: "Guest address lookup", suggestions: true } });
  });
});