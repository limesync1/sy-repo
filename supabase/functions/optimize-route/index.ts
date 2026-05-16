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
    // Foretræk Authorization-headeren (sat automatisk af supabase.functions.invoke).
    // Falder tilbage til body.access_token for bagudkompatibilitet.
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const headerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const bodyToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";
    const accessToken = headerToken || bodyToken;
    const preserveAssignees = body?.preserve_assignees !== false;
    const respectPinned = body?.respect_pinned === true || preserveAssignees;

    if (!routeId) {
      return new Response(JSON.stringify({ ok: false, error: "route_id required" }), {
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
    // Færdige/sprungne stops må ALDRIG omrokkeres af optimeringen — de
    // ligger fast i historikken på den sekvens de blev udført på. Vi
    // beholder dem først i listen med deres oprindelige rækkefølge og
    // optimerer kun de stops der stadig er pending/in_progress.
    const lockedStops = allStopsRaw.filter((s) => {
      const st = (s.status ?? "pending").toLowerCase();
      return st === "completed" || st === "done" || st === "skipped" || st === "cancelled";
    });
    const openStopsRaw = allStopsRaw.filter((s) => !lockedStops.includes(s));
    const stopIds = openStopsRaw.map((s) => s.id);

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

    // NY MODEL: medarbejdere er knyttet pr. STOP, ikke pr. rute. Vi samler
    // unikke medarbejdere fra alle stops på ruten — det er dem optimeringen
    // skal arbejde med. Hvis et stop ingen assignees har, kan VRP heller
    // ikke gøre noget meningsfuldt med det (det ender som "unassigned").
    const uniqueEmployeeIds = Array.from(new Set((assignees || []).map((a: any) => a.employee_id)));
    const { data: empRows } = uniqueEmployeeIds.length > 0
      ? await supabase
          .from("employees")
          .select("id, name, home_latitude, home_longitude, work_start_time, work_end_time")
          .in("id", uniqueEmployeeIds)
      : { data: [] as any[] };

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

    const employees: EmployeeCtx[] = (empRows || []).map((e: any) => {
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
    });

    // Hvis ingen medarbejdere er tilknyttet stops'ne, optimerer vi alligevel
    // rækkefølgen som en simpel TSP for én virtuel "kørsel" der starter på
    // rutens start-adresse. Vi rører IKKE assignees (preserveAssignees=true
    // pr. default) — vi ændrer kun sequence og tider.
    const usingVirtualEmployee = employees.length === 0;
    if (usingVirtualEmployee) {
      employees.push({
        id: "__virtual_optimizer__",
        name: "Optimering",
        start_lat: defaultStart.lat,
        start_lng: defaultStart.lng,
        end_lat: defaultStart.lat,
        end_lng: defaultStart.lng,
        work_start_min: planStartMin,
        work_end_min: 24 * 60,
      } as EmployeeCtx);
    }

    // Normaliser adresse til en cluster-nøgle: lowercased, trimmet, fjern
    // dobbelt-mellemrum og komma — så "H.C. Andersens Gade 10" og
    // "H. C. Andersens Gade 10," ender i samme klynge.
    const normalizeAddress = (raw: string | null | undefined): string | null => {
      if (!raw) return null;
      return raw
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[,.;]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Saml stops til VRP-format (kun ikke-låste stops optimeres)
    const validStops: Stop[] = openStopsRaw
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
        // Med virtuel medarbejder skal vi ignorere pins — ellers afviser
        // VRP'en alle stops (deres assignee findes ikke i employees-listen).
        pinned_assignees: usingVirtualEmployee
          ? []
          : (respectPinned ? (assigneesByStop.get(s.id) || []) : []),
        cluster_key: normalizeAddress(s.address),
      }));

    if (validStops.length === 0) {
      return new Response(JSON.stringify({
        ok: true, message: "Ingen stop med GPS at optimere", reordered: 0,
        total_km: 0, total_minutes: 0, provider: "none",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Hent preferred_time_* fra ordrer for soft-windows
    const orderIds = Array.from(new Set(openStopsRaw.map((s) => s.order_id).filter(Boolean)));
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, preferred_time_start, preferred_time_end")
        .in("id", orderIds);
      const orderMap = new Map((orders || []).map((o: any) => [o.id, o]));
      for (const stop of validStops) {
        const raw = openStopsRaw.find((r) => r.id === stop.id);
        if (raw?.order_id) {
          const o = orderMap.get(raw.order_id);
          if (o) {
            if (o.preferred_time_start) stop.preferred_start_min = hhmmssToMin(o.preferred_time_start, 0);
            if (o.preferred_time_end) stop.preferred_end_min = hhmmssToMin(o.preferred_time_end, 24 * 60);
          }
        }
      }
    }

    // === INPUT-FINGERAFTRYK ===
    // Beregn en stabil hash over alt der kan påvirke optimerings-resultatet.
    // Hvis denne hash matcher den vi gemte sidst → ruten er allerede optimal
    // for det aktuelle input, og vi skipper hele VRP-kørslen. Det betyder at
    // gentagne klik på "Optimér" uden ændringer ikke spilder tid eller giver
    // forskellige resultater.
    const fingerprintPayload = {
      algorithm: "route-order-v3",
      stops: validStops
        .map((s) => ({
          id: s.id,
          seq: openStopsRaw.find((r) => r.id === s.id)?.sequence ?? null,
          lat: Number(s.latitude.toFixed(6)),
          lng: Number(s.longitude.toFixed(6)),
          ck: s.cluster_key ?? null,
          dur: s.duration_minutes,
          hs: s.hard_start_min,
          he: s.hard_end_min,
          ps: s.preferred_start_min,
          pe: s.preferred_end_min,
          rs: s.required_staff,
          pa: [...s.pinned_assignees].sort(),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      employees: employees
        .map((e) => ({
          id: e.id,
          sl: Number(e.start_lat.toFixed(6)),
          sg: Number(e.start_lng.toFixed(6)),
          ws: e.work_start_min,
          we: e.work_end_min,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      startFromHome: !!route.start_from_home,
      planStart: planStartMin,
      respectPinned,
    };
    const fpStr = JSON.stringify(fingerprintPayload);
    // Stabil 32-bit hash (FNV-1a) — tilstrækkeligt til at detektere ændringer
    let h = 0x811c9dc5;
    for (let i = 0; i < fpStr.length; i++) {
      h ^= fpStr.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    const inputFingerprint = `fp_${h.toString(16)}_${validStops.length}s_${employees.length}e`;

    // Tjek om vi har et identisk fingerprint fra sidste optimering
    const existingSuggestions = (route as any).optimization_suggestions;
    const lastFingerprint = Array.isArray(existingSuggestions)
      ? null
      : existingSuggestions?._input_fingerprint ?? null;

    if (lastFingerprint === inputFingerprint && route.optimized_at && body?.allow_cached === true) {
      // Intet er ændret siden sidste optimering — returnér tidligere resultat
      return new Response(JSON.stringify({
        ok: true,
        already_optimal: true,
        reasoning: "Ruten er allerede optimeret. Ingen ændringer detekteret siden sidste kørsel.",
        summary: route.optimization_summary ?? null,
        suggestions: Array.isArray(existingSuggestions)
          ? existingSuggestions
          : (existingSuggestions?.items ?? []),
        reordered: 0,
        total_km: Number(route.total_distance_km ?? 0),
        total_minutes: Number(route.total_duration_minutes ?? 0),
        before_km: Number(route.total_distance_km ?? 0),
        before_minutes: Number(route.total_duration_minutes ?? 0),
        saved_km: 0,
        saved_minutes: 0,
        provider: "cached",
        unassigned: 0,
        soft_violations: 0,
        employees: employees.length,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Kør VRP ===
    const { plan, provider, weather, current } = await solveVRP(employees, validStops, { routeDate: route.route_date });
    // Mål før-tilstanden på den rækkefølge der faktisk ligger på stops lige nu.
    // Det gør toast-besparelsen ægte, også efter drag/drop eller manuel ændring.
    const beforeKm = current.feasible ? current.total_km : Number(route.total_distance_km ?? 0);
    const beforeMinutes = current.feasible ? current.total_minutes : Number(route.total_duration_minutes ?? 0);
    const plannedOrder = Array.from(plan.per_employee.values()).flat().map((s) => s.stop_id);
    const orderChanged = plannedOrder.join("|") !== current.stop_order.join("|");

    // === Skriv plan tilbage til DB ===
    // 1) Opdater route_stops: sequence, planned_arrival/departure, distance/travel
    // 2) Synkronisér route_stop_assignees (kun hvis stoppet ikke var pinned)
    // Reservér de første pladser til låste stops — de bevarer deres
    // oprindelige indbyrdes rækkefølge.
    let globalSeq = 0;
    const writes: PromiseLike<any>[] = [];
    const lockedSorted = [...lockedStops].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    for (const s of lockedSorted) {
      writes.push(
        supabase.from("route_stops").update({ sequence: globalSeq++ }).eq("id", s.id),
      );
    }

    for (const [, scheduled] of plan.per_employee.entries()) {
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

        // Sync assignees: kun når vi eksplicit tillader ændring af bemanding
        if (!preserveAssignees && stop.pinned_assignees.length === 0) {
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
    const noGpsStops = openStopsRaw.filter((s) => s.latitude == null || s.longitude == null);
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

    const weatherNote = weather.summary
      ? ` Vejr-justering anvendt (+${Math.round((weather.multiplier - 1) * 100)}%): ${weather.summary}.`
      : "";
    const trafficNote = provider === "mapbox"
      ? " Rejsetider beregnet med live trafikforhold."
      : provider === "osrm"
        ? " Rejsetider beregnet uden live trafik (OSRM-fallback)."
        : "";
    const enrichedSummary = (ai?.summary ?? `VRP plan via ${provider} for ${employees.length} medarbejdere, ${validStops.length} stops`) + trafficNote + weatherNote;

    await supabase.from("routes").update({
      optimized_at: new Date().toISOString(),
      total_distance_km: plan.total_km,
      total_duration_minutes: plan.total_minutes,
      optimization_summary: enrichedSummary,
      // Gem som object så vi også kan persistere fingerprint sammen med items.
      // (Læses bagudkompatibelt nedenfor: hvis kolonnen er et array, bruges det direkte.)
      optimization_suggestions: {
        items: ai?.suggestions ?? [],
        _input_fingerprint: inputFingerprint,
        _weather: weather,
      },
    }).eq("id", routeId);

    return new Response(JSON.stringify({
      ok: true,
      reasoning: enrichedSummary,
      summary: enrichedSummary,
      suggestions: ai?.suggestions ?? [],
      reordered: validStops.length,
      total_km: plan.total_km,
      total_minutes: plan.total_minutes,
      before_km: beforeKm,
      before_minutes: beforeMinutes,
      saved_km: Math.max(0, beforeKm - plan.total_km),
      saved_minutes: Math.max(0, beforeMinutes - plan.total_minutes),
      order_changed: orderChanged,
      provider,
      weather,
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
