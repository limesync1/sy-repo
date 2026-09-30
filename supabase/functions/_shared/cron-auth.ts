// Verifies that a request comes from a trusted server caller: either the
// service-role key, or the rotating scheduled-job token that lives only in
// the database (never in source code). The token is checked through a
// service-role-only RPC so it never has to be copied into edge secrets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function isTrustedCronCaller(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (serviceKey && token === serviceKey) return true;

  // Cheap shape check before hitting the database.
  if (!/^[a-f0-9]{64}$/.test(token)) return false;

  const url = Deno.env.get("SUPABASE_URL") || "";
  if (!url || !serviceKey) return false;
  try {
    const admin = createClient(url, serviceKey);
    const { data, error } = await admin.rpc("verify_cron_token" as any, { _token: token });
    return !error && data === true;
  } catch {
    return false;
  }
}
