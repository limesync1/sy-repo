// Server-side spend guard for paid AI calls reachable without sign-in.
// Enforces a per-client (hashed IP) and a platform-wide hourly cap before
// the AI gateway is called. Fails closed if usage cannot be recorded.
export type AiBudget = { perClientPerHour: number; globalPerHour: number };

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || req.headers.get("cf-connecting-ip") || "unknown").trim().slice(0, 64);
}

// deno-lint-ignore no-explicit-any
export async function consumeAiBudget(admin: any, fn: string, req: Request, budget: AiBudget): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const clientKey = await sha256(`${fn}:${clientIp(req)}`);
  const [global, perClient] = await Promise.all([
    admin.from("ai_usage_events").select("id", { count: "exact", head: true }).eq("fn", fn).gte("created_at", since),
    admin.from("ai_usage_events").select("id", { count: "exact", head: true }).eq("fn", fn).eq("client_key", clientKey).gte("created_at", since),
  ]);
  if (global.error || perClient.error) return false;
  if ((global.count ?? 0) >= budget.globalPerHour) return false;
  if ((perClient.count ?? 0) >= budget.perClientPerHour) return false;
  const { error } = await admin.from("ai_usage_events").insert({ fn, client_key: clientKey });
  return !error;
}
