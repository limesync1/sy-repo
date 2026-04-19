// optimize-route v2: ægte multi-medarbejder VRP med tidsvinduer, arbejdstid,
// hjemmeadresse og AI-forklaring + AI-forslag.
import { createClient } from "npm:@supabase/supabase-js@2";
import { solveVRP } from "./vrp.ts";
import { generateAIInsights } from "./ai.ts";
import type { EmployeeCtx, Stop } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT_MIN = 15;

const hhmmssToMin = (s: string | null | undefined, fallback: number): number => {
  if (!s) return fallback;
  const [h, m] = s.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return fallback;
  return h * 60 + m;
};

function timeToDateIso(routeDate: string, addMinutes: number): string {
  const d = new Date(routeDate + "T00:00:00");
  d.setHours(0, addMinutes, 0, 0);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const routeId = typeof body?.route_id === "string" ? body.route_id.trim() : "";
    const accessToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";
    // Hvis true: tillader VRP at omfordele alle stops (selv manuelt tildelte) for max gevinst.
    // Default: true — det er standard adfærd ved klik på "Optimer".
    const respectPinned = body?.respect_pinned === true;

    if (!routeId) {
      return new Response(JSON.stringify({ ok: false, error: "route_id required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!accessToken) {
      return new Response(JSON.stringify({ ok: false, error: "access_token required" }), {
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
      return new Response(JSON.stringify({ ok: false, error: "Du har ikke adgang til at optimere denne rute" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: route } = await supabase
      .from("routes")
      .select("*, businesses(address, zip_code, city)")
      .eq("id", routeId)
      .maybeSingle();
    if (!route) {
      return new Response(JSON.stringify({ ok: false, error: "Route not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rawStops } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("sequence", { ascending: true });

    const allStopsRaw = (rawStops || []) as any[];
    const stopIds = allStopsRaw.map((s) => s.id);

    const { data: assignees } = stopIds.length > 0
      ? await supabase
          .from("route_stop_assignees")
          .select("stop_id, employee_id, is_lead")
          .in("stop_id", stopIds)
      : { data: [] as any[] };

    const assigneesByStop = new Map<string, string[]>();
    (assignees || []).forEach((a: any) => {
      const arr = assigneesByStop.get(a.stop_id) || [];
      arr.push(a.employee_id);
      assigneesByStop.set(a.stop_id, arr);
    });

    // Hent medarbejdere på ruten
    const { data: routeEmps } = await supabase
      .from("route_employees")
      .select("employee_id, employees(id, name, home_latitude, home_longitude, work_start_time, work_end_time)")
      .eq("route_id", routeId);

    const startFromHome = !!route.start_from_home;
    const fallbackStart = {
      lat: route.start_latitude != null ? Number(route.start_latitude) : null,
      lng: route.start_longitude != null ? Number(route.start_longitude) : null,
    };
    // Hvis ingen rute-start: brug første gyldige stop som fallback
    const firstStopWithGps = allStopsRaw.find((s) => s.latitude != null && s.longitude != null);
    const defaultStart = fallbackStart.lat != null && fallbackStart.lng != null
      ? { lat: fallbackStart.lat, lng: fallbackStart.lng }
      : firstStopWithGps
        ? { lat: Number(firstStopWithGps.latitude), lng: Number(firstStopWithGps.longitude) }
        : { lat: 55.6761, lng: 12.5683 }; // Kbh fallback

    const planStartMin = hhmmssToMin(route.planned_start_time, 8 * 60);

    const employees: EmployeeCtx[] = (routeEmps || [])
      .map((re: any) => {
        const e = re.employees;
        if (!e) return null;
        const hasHome = startFromHome && e.home_latitude != null && e.home_longitude != null;
        const lat = hasHome ? Number(e.home_latitude) : defaultStart.lat;
        const lng = hasHome ? Number(e.home_longitude) : defaultStart.lng;
        return {
          id: e.id,
          name: e.name,
          start_lat: lat,
          start_lng: lng,
          end_lat: lat,
          end_lng: lng,
          work_start_min: Math.max(planStartMin, hhmmssToMin(e.work_start_time, 8 * 60)),
          work_end_min: hhmmssToMin(e.work_end_time, 16 * 60),
        } as EmployeeCtx;
      })
      .filter(Boolean) as EmployeeCtx[];

    // Hvis ingen ruteansatte, fald tilbage til alle eksisterende assignees
    if (employees.length === 0) {
      const allAssigneeIds = Array.from(new Set((assignees || []).map((a: any) => a.employee_id)));
      if (allAssigneeIds.length > 0) {
        const { data: empRows } = await supabase
          .from("employees")
          .select("id, name, home_latitude, home_longitude, work_start_time, work_end_time")
          .in("id", allAssigneeIds);
        for (const e of empRows || []) {
          const hasHome = startFromHome && e.home_latitude != null && e.home_longitude != null;
          employees.push({
            id: e.id,
            name: e.name,
            start_lat: hasHome ? Number(e.home_latitude) : defaultStart.lat,
            start_lng: hasHome ? Number(e.home_longitude) : defaultStart.lng,
            end_lat: hasHome ? Number(e.home_latitude) : defaultStart.lat,
            end_lng: hasHome ? Number(e.home_longitude) : defaultStart.lng,
            work_start_min: Math.max(planStartMin, hhmmssToMin(e.work_start_time, 8 * 60)),
            work_end_min: hhmmssToMin(e.work_end_time, 16 * 60),
          });
        }
      }
    }

    if (employees.length === 0) {
      return new Response(JSON.stringify({
        ok: false, error: "Ingen medarbejdere tilknyttet ruten — tilføj mindst én før optimering",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Saml stops til VRP-format
    const validStops: Stop[] = allStopsRaw
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        id: s.id,
        customer_name: s.customer_name,
        address: s.address,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        duration_minutes: Math.max(s.duration_minutes || 30, SLOT_MIN),
        // hard windows = time_window_*
        hard_start_min: s.time_window_start ? hhmmssToMin(s.time_window_start, 0) : null,
        hard_end_min: s.time_window_end ? hhmmssToMin(s.time_window_end, 24 * 60) : null,
        // soft windows = preferred_* fra ordren (kig efter via order_id senere hvis ønsket)
        preferred_start_min: null,
        preferred_end_min: null,
        required_staff: Math.max(1, s.required_staff || 1),
        pinned_assignees: respectPinned ? (assigneesByStop.get(s.id) || []) : [],
      }));

    if (validStops.length === 0) {
      return new Response(JSON.stringify({
        ok: true, message: "Ingen stop med GPS at optimere", reordered: 0,
        total_km: 0, total_minutes: 0, provider: "none",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Hent preferred_time_* fra ordrer for soft-windows
    const orderIds = Array.from(new Set(allStopsRaw.map((s) => s.order_id).filter(Boolean)));
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, preferred_time_start, preferred_time_end")
        .in("id", orderIds);
      const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));
      for (const stop of validStops) {
        const raw = allStopsRaw.find((r) => r.id === stop.id);
        if (raw?.order_id) {
          const o = orderMap.get(raw.order_id);
          if (o) {
            if (o.preferred_time_start) stop.preferred_start_min = hhmmssToMin(o.preferred_time_start, 0);
            if (o.preferred_time_end) stop.preferred_end_min = hhmmssToMin(o.preferred_time_end, 24 * 60);
          }
        }
      }
    }

    // === Kør VRP ===
    const { plan, provider } = await solveVRP(employees, validStops);

    // === Skriv plan tilbage til DB ===
    // 1) Opdater route_stops: sequence, planned_arrival/departure, distance/travel
    // 2) Synkronisér route_stop_assignees (kun hvis stoppet ikke var pinned)
    let globalSeq = 0;
    const writes: Promise<any>[] = [];

    for (const [empId, scheduled] of plan.per_employee.entries()) {
      for (const sched of scheduled) {
        const stop = validStops.find((s) => s.id === sched.stop_id)!;
        const arrivalIso = timeToDateIso(route.route_date, sched.arrival_min);
        const departureIso = timeToDateIso(route.route_date, sched.departure_min);
        writes.push(
          supabase.from("route_stops").update({
            sequence: globalSeq++,
            planned_arrival: arrivalIso,
            planned_departure: departureIso,
            distance_to_next_km: sched.travel_km_to_next,
            travel_time_to_next_min: sched.travel_min_to_next,
          }).eq("id", sched.stop_id),
        );

        // Sync assignees: hvis ikke pinned, opdater til de valgte
        if (stop.pinned_assignees.length === 0) {
          // Slet eksisterende og tilføj nye
          writes.push(
            supabase.from("route_stop_assignees").delete().eq("stop_id", sched.stop_id).then(() => {
              const inserts = sched.assignees.map((eid, i) => ({
                stop_id: sched.stop_id,
                employee_id: eid,
                is_lead: i === 0,
              }));
              if (inserts.length > 0) {
                return supabase.from("route_stop_assignees").insert(inserts);
              }
            }),
          );
        }
      }
    }

    // Stops uden GPS -> placeres til sidst med dummy tider
    const noGpsStops = allStopsRaw.filter((s) => s.latitude == null || s.longitude == null);
    for (const s of noGpsStops) {
      writes.push(
        supabase.from("route_stops").update({
          sequence: globalSeq++,
          planned_arrival: timeToDateIso(route.route_date, planStartMin),
          planned_departure: timeToDateIso(route.route_date, planStartMin + (s.duration_minutes || 30)),
        }).eq("id", s.id),
      );
    }

    await Promise.all(writes);

    // === AI-forklaring + forslag (kører parallelt med DB-skrivning ovenfor er ikke muligt
    // pga. afhængighed af plan-data, men vi kører det nu) ===
    const ai = await generateAIInsights(employees, validStops, plan);

    await supabase.from("routes").update({
      optimized_at: new Date().toISOString(),
      total_distance_km: plan.total_km,
      total_duration_minutes: plan.total_minutes,
      optimization_summary: ai?.summary ?? null,
      optimization_suggestions: ai?.suggestions ?? [],
    }).eq("id", routeId);

    return new Response(JSON.stringify({
      ok: true,
      reasoning: ai?.summary ?? `VRP plan via ${provider} for ${employees.length} medarbejdere, ${validStops.length} stops`,
      summary: ai?.summary ?? null,
      suggestions: ai?.suggestions ?? [],
      reordered: validStops.length,
      total_km: plan.total_km,
      total_minutes: plan.total_minutes,
      provider,
      unassigned: plan.unassigned_stops.length,
      soft_violations: plan.soft_window_violations,
      employees: employees.length,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("optimize-route error:", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
