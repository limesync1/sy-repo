import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function requireAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  const userId = data?.claims?.sub ? String(data.claims.sub) : null;
  if (error || !userId) {
    return { error: "Unauthorized", status: 401 as const };
  }

  return { authHeader, userClient, userId, status: 200 as const };
}