// Anvend et AI-forslag på en rute. Aktuelt understøttes "swap_assignee":
// flyt ét stop fra én medarbejder til en anden. Efter ændringen kør
// ikke optimering automatisk — planlæggeren kan trykke Optimer igen hvis ønsket.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const routeId = typeof body?.route_id === "string" ? body.route_id.trim() : "";
    const suggestionId = typeof body?.suggestion_id === "string" ? body.suggestion_id.trim() : "";
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const headerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const bodyToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";
    const accessToken = headerToken || bodyToken;

    if (!routeId || !suggestionId) {
      return new Response(JSON.stringify({ ok: false, error: "route_id og suggestion_id påkrævet" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!accessToken) {
      return new Response(JSON.stringify({ ok: false, error: "Du skal være logget ind" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabase.rpc("is_route_owner", { _route_id: routeId, _user_id: user.id }),
    ]);
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ ok: false, error: "Ingen adgang" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: route } = await supabase
      .from("routes")
      .select("optimization_suggestions")
      .eq("id", routeId)
      .maybeSingle();
    if (!route) {
      return new Response(JSON.stringify({ ok: false, error: "Rute findes ikke" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestions = Array.isArray(route.optimization_suggestions) ? route.optimization_suggestions : [];
    const suggestion = suggestions.find((s: any) => s.id === suggestionId);
    if (!suggestion) {
      return new Response(JSON.stringify({ ok: false, error: "Forslag ikke fundet (måske allerede anvendt)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const action = suggestion.action;
    if (!action || action.type !== "swap_assignee") {
      return new Response(JSON.stringify({ ok: false, error: "Ukendt action-type" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stopId = action.stop_id;
    const fromEmp = action.from_employee_id;
    const toEmp = action.to_employee_id;
    if (!stopId || !toEmp) {
      return new Response(JSON.stringify({ ok: false, error: "Manglende stop_id eller to_employee_id" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Slet from-medarbejder hvis specificeret, ellers slet alle
    if (fromEmp) {
      await supabase.from("route_stop_assignees")
        .delete()
        .eq("stop_id", stopId)
        .eq("employee_id", fromEmp);
    } else {
      await supabase.from("route_stop_assignees")
        .delete()
        .eq("stop_id", stopId);
    }

    // Tilføj to-medarbejder som lead
    await supabase.from("route_stop_assignees").insert({
      stop_id: stopId,
      employee_id: toEmp,
      is_lead: true,
    });

    // Fjern det anvendte forslag fra listen
    const remaining = suggestions.filter((s: any) => s.id !== suggestionId);
    await supabase.from("routes").update({
      optimization_suggestions: remaining,
    }).eq("id", routeId);

    return new Response(JSON.stringify({ ok: true, applied: suggestion }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("apply-route-suggestion error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
