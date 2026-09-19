// detect-user-role
// ---------------
// Efter login: find ud af hvilken type konto brugeren har, så vi kan sende
// dem direkte til det rigtige panel uden de først skal vælge "type".
//
// Prioritet (én bruger kan i princippet have flere — vi vælger den vigtigste):
//   1. admin    → /admin            (platformadministrator)
//   2. employee → /medarbejder      (medarbejder hos en virksomhed)
//   3. business → /virksomhed       (ejer af en virksomhed)
//   4. customer → /min-konto        (privat / kunde)
import { supabase } from "@/integrations/supabase/client";

export type DetectedRole = "admin" | "employee" | "business" | "customer";

export const ROLE_HOME: Record<DetectedRole, string> = {
  admin: "/admin",
  employee: "/medarbejder",
  business: "/virksomhed",
  customer: "/min-konto",
};

/** Slå brugerens rolle op parallelt — hurtigst mulig redirect efter login. */
export const detectUserRole = async (userId: string): Promise<DetectedRole> => {
  const [adminRes, empRes, bizRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    supabase.from("employees").select("id").eq("user_id", userId).limit(1).maybeSingle(),
    supabase.from("businesses").select("id").eq("owner_id", userId).limit(1).maybeSingle(),
  ]);
  if (adminRes.data) return "admin";
  if (empRes.data) return "employee";
  if (bizRes.data) return "business";
  return "customer";
};