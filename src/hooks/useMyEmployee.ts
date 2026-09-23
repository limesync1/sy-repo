// useMyEmployee — henter medarbejder-record for nuværende auth-user
// samt aggregerede statistik-data over en periode.
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { calcEmployeeShare, exclVat } from "@/lib/commission";
import { getEmployeeWorkspace } from "@/lib/employee-workspace";

export type Employee = Tables<"employees">;

export type EmployeeWithBusiness = Employee & {
  business?: {
    id: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    zip_code: string | null;
    category: string | null;
  } | null;
};

/**
 * ALLE medarbejder-records for den indloggede bruger — én pr. virksomhed
 * brugeren arbejder for. Inkluderer virksomhedens navn/logo så vi kan vise
 * et pænt valg-interface når der er mere end én.
 */
export const useMyEmployees = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-employees", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<EmployeeWithBusiness[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("*, business:businesses(id, name, logo_url, city, zip_code, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as EmployeeWithBusiness[];
    },
  });
};

/**
 * Den indloggede medarbejders egen record (incl. avatar, navn, business).
 *
 * Arbejder brugeren for flere virksomheder, bruges det valgte arbejdssted
 * (se `lib/employee-workspace`). Er der intet valg endnu, returneres den
 * første — EmployeeShell viser i så fald vælgeren først.
 */
export const useMyEmployee = () => {
  const list = useMyEmployees();
  const selectedBusinessId = getEmployeeWorkspace();
  const rows = list.data || [];
  const match = selectedBusinessId
    ? rows.find((e) => e.business_id === selectedBusinessId)
    : undefined;
  const data = rows.length === 0 ? null : (match ?? rows[0]);
  return { ...list, data: list.data ? (data as EmployeeWithBusiness | null) : undefined } as
    typeof list & { data: EmployeeWithBusiness | null | undefined };
};


/**
 * Lightweight helper: returnerer KUN medarbejderens id (eller undefined).
 * Genbruger samme cache-entry som `useMyEmployee` — ingen ekstra request.
 */
export const useMyEmployeeId = (): string | undefined => {
  const { data } = useMyEmployee();
  return data?.id;
};

export type EmployeeStats = {
  routesCount: number;
  stopsTotal: number;
  stopsCompleted: number;
  workdaysCount: number;
  workSeconds: number;
  totalDistanceKm: number;
  revenue: number;        // omsætning fra completede stop (ordrer)
  commission: number;     // medarbejderens andel (commission_pct)
  perDay: {
    date: string;
    stops: number;
    revenue: number;
    /** Medarbejderens egen indtjening for dagen (sum af shares). */
    earnings: number;
    /** En række pr. udført opgave på dagen — bruges i "Daglig aktivitet". */
    entries: {
      stopId: string;
      customerName: string | null;
      orderAmount: number;
      share: number;
      paymentStatus: "paid" | "settling" | "pending" | "unknown";
      /** Tidspunkt opgaven blev markeret færdig (ISO). */
      completedAt: string | null;
      /** Adresse / lokation for opgaven. */
      address: string | null;
      /** Servicenavn (hvis kendt fra ordren). */
      serviceName: string | null;
      /** Antal medarbejdere som delte opgaven (provisionsdeling). */
      sharers: number;
      /** Note fra medarbejderen ifm. udførelsen (hvis udfyldt). */
      note: string | null;
    }[];
  }[];
};

/** Aggregeret statistik for medarbejder i et datointerval (inkl. begge ender). */
export const useMyEmployeeStats = (
  employeeId: string | undefined,
  commissionPct: number,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["my-employee-stats", employeeId, from, to],
    enabled: !!employeeId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async (): Promise<EmployeeStats> => {
      if (!employeeId) {
        return {
          routesCount: 0, stopsTotal: 0, stopsCompleted: 0,
           workdaysCount: 0, workSeconds: 0, totalDistanceKm: 0,
          revenue: 0, commission: 0, perDay: [],
        };
      }

      // 1) Find ruter i perioden, hvor medarbejderen er tilknyttet (via
      //    junction-tabel, legacy-kolonne eller stop-niveau).
      const [linksRes, stopAssignRes] = await Promise.all([
        supabase.from("route_employees").select("route_id").eq("employee_id", employeeId),
        supabase.from("route_stop_assignees").select("stop_id").eq("employee_id", employeeId),
      ]);

      const linkedRouteIds = new Set<string>(
        (linksRes.data || []).map((l: any) => l.route_id),
      );
      const myAssignedStopIds = new Set<string>(
        (stopAssignRes.data || []).map((a: any) => a.stop_id),
      );

      // 2) Hent alle ruter i perioden hvor medarbejderen er på (via junction
      //    eller legacy employee_id).
      const { data: linkedRoutes } = await supabase
        .from("routes")
        .select("id, route_date, total_distance_km, total_duration_minutes")
        .gte("route_date", from)
        .lte("route_date", to)
        .or(`id.in.(${Array.from(linkedRouteIds).join(",") || "00000000-0000-0000-0000-000000000000"}),employee_id.eq.${employeeId}`);

      // Tilføj ruter hvor medarbejderen kun har stop-niveau-assignment
      let extraRouteRows: { id: string; route_date: string; total_distance_km: number | null; total_duration_minutes: number | null }[] = [];
      if (myAssignedStopIds.size > 0) {
        const { data: stopRoutes } = await supabase
          .from("route_stops")
          .select("route_id")
          .in("id", Array.from(myAssignedStopIds));
        const stopRouteIds = Array.from(new Set((stopRoutes || []).map((s: any) => s.route_id)));
        if (stopRouteIds.length > 0) {
          const { data: extra } = await supabase
            .from("routes")
            .select("id, route_date, total_distance_km, total_duration_minutes")
            .in("id", stopRouteIds)
            .gte("route_date", from)
            .lte("route_date", to);
          extraRouteRows = (extra || []) as any;
        }
      }

      const routeMap = new Map<string, { id: string; route_date: string; total_distance_km: number | null; total_duration_minutes: number | null }>();
      [...(linkedRoutes || []), ...extraRouteRows].forEach((r: any) => routeMap.set(r.id, r));
      const routeIds = Array.from(routeMap.keys());

      if (routeIds.length === 0) {
        return {
          routesCount: 0, stopsTotal: 0, stopsCompleted: 0,
           workdaysCount: 0, workSeconds: 0, totalDistanceKm: 0,
          revenue: 0, commission: 0, perDay: [],
        };
      }

      // 3) Hent alle stop på de ruter
      const { data: stops } = await supabase
        .from("route_stops")
        .select("id, route_id, status, assigned_employee_id, completed_at, order_id, customer_name, address, notes, service_summary, planned_arrival, duration_minutes")
        .in("route_id", routeIds);

      // Filtrér stop som tilhører medarbejderen (specifik tildeling eller team)
      const myStops = (stops || []).filter((s: any) => {
        return (
          s.assigned_employee_id === employeeId ||
          myAssignedStopIds.has(s.id) ||
          // team-stop på rute hvor medarbejderen er linket
          (linkedRouteIds.has(s.route_id) && !s.assigned_employee_id)
        );
      });

      const stopsCompleted = myStops.filter((s: any) => s.status === "completed").length;
      const completedStops = myStops.filter((s: any) => s.status === "completed" && s.order_id);
      const completedOrderIds = completedStops.map((s: any) => s.order_id);

      // 4) Omsætning + status fra completede ordrer (pr. ordre, så vi kan dele pr. stop)
      const orderAmountMap = new Map<string, number>();
      const orderStatusMap = new Map<string, string>();
      const orderAddressMap = new Map<string, { address: string | null; zip: string | null; city: string | null }>();
      if (completedOrderIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total_amount, adjusted_amount, status, address, zip_code, city")
          .in("id", completedOrderIds);
        (orders || []).forEach((o: any) => {
          orderAmountMap.set(o.id, Number(o.adjusted_amount ?? o.total_amount ?? 0));
          orderStatusMap.set(o.id, String(o.status || ""));
          orderAddressMap.set(o.id, {
            address: o.address ?? null,
            zip: o.zip_code ?? null,
            city: o.city ?? null,
          });
        });
      }
      const revenue = completedStops.reduce(
        (sum: number, s: any) => sum + (orderAmountMap.get(s.order_id) || 0),
        0,
      );

      // 4b) Provision deles ligeligt mellem medarbejderne på hvert stop.
      //     Vi henter antal assignees pr. completed-stop. Stop uden specifikke
      //     assignees ("team") deles på antal medarbejdere knyttet til ruten.
      const completedStopIds = completedStops.map((s: any) => s.id);
      const assigneeCountByStop = new Map<string, number>();
      if (completedStopIds.length > 0) {
        const { data: stopAssignees } = await supabase
          .from("route_stop_assignees")
          .select("stop_id")
          .in("stop_id", completedStopIds);
        (stopAssignees || []).forEach((a: any) => {
          assigneeCountByStop.set(a.stop_id, (assigneeCountByStop.get(a.stop_id) || 0) + 1);
        });
      }
      // Antal medarbejdere pr. rute (til team-fallback)
      const teamSizeByRoute = new Map<string, number>();
      if (routeIds.length > 0) {
        const { data: routeTeam } = await supabase
          .from("route_employees")
          .select("route_id")
          .in("route_id", routeIds);
        (routeTeam || []).forEach((re: any) => {
          teamSizeByRoute.set(re.route_id, (teamSizeByRoute.get(re.route_id) || 0) + 1);
        });
        // Inkludér også legacy-kolonnen routes.employee_id som "én medarbejder"
        // hvis route_employees-rækker mangler.
        routeIds.forEach((rid) => {
          if (!teamSizeByRoute.has(rid)) teamSizeByRoute.set(rid, 1);
        });
      }

      // Provision deles ligeligt mellem medarbejdere på opgaven OG beregnes
      // KUN af beløb uden moms (jf. lib/commission.ts).
      const shareByStop = new Map<string, number>();
      const commission = completedStops.reduce((sum: number, s: any) => {
        const orderAmount = orderAmountMap.get(s.order_id) || 0;
        const explicit = assigneeCountByStop.get(s.id) || 0;
        const sharers = explicit > 0
          ? explicit
          : Math.max(teamSizeByRoute.get(s.route_id) || 1, 1);
        const share = calcEmployeeShare(orderAmount, commissionPct, sharers);
        shareByStop.set(s.id, share);
        return sum + share;
      }, 0);

      // 5) Arbejdsdage
      const { data: workdays } = await supabase
        .from("employee_workdays")
        .select("workday_date, duration_minutes, started_at, ended_at")
        .eq("employee_id", employeeId)
        .gte("workday_date", from)
        .lte("workday_date", to);

      const workSeconds = (workdays || []).reduce(
        (sum: number, w: any) => {
          const start = w.started_at ? new Date(w.started_at).getTime() : NaN;
          const end = w.ended_at ? new Date(w.ended_at).getTime() : NaN;
          if (Number.isFinite(start) && Number.isFinite(end)) {
            return sum + Math.max(0, Math.floor((end - start) / 1000));
          }
          return sum + Math.max(0, Math.round(Number(w.duration_minutes || 0) * 60));
        },
        0,
      );

      // 6) Total distance — sum kun de ruter hvor medarbejderen reelt har stop
      const myRouteIds = new Set(myStops.map((s: any) => s.route_id));
      let totalDistanceKm = 0;
      myRouteIds.forEach((rid) => {
        const r = routeMap.get(rid as string);
        if (r?.total_distance_km) totalDistanceKm += Number(r.total_distance_km);
      });

      // 7) Per-dag aggregering — inkluderer en række pr. udført opgave
      const perDayMap = new Map<string, EmployeeStats["perDay"][number]>();
      const stopRouteDate = new Map<string, string>();
      myStops.forEach((s: any) => {
        const r = routeMap.get(s.route_id);
        if (r) stopRouteDate.set(s.id, r.route_date);
      });
      // Sortér så nyeste opgaver vises først pr. dag
      const sortedCompleted = [...completedStops].sort((a: any, b: any) => {
        const ta = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const tb = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return tb - ta;
      });
      sortedCompleted.forEach((s: any) => {
        const d = stopRouteDate.get(s.id);
        if (!d) return;
        const row = perDayMap.get(d) || { date: d, stops: 0, revenue: 0, earnings: 0, entries: [] };
        const orderAmount = orderAmountMap.get(s.order_id) || 0;
        const share = shareByStop.get(s.id) || 0;
        row.stops += 1;
        row.revenue += orderAmount;
        row.earnings += share;
        const orderStatus = orderStatusMap.get(s.order_id);
        const paymentStatus: "paid" | "settling" | "pending" | "unknown" =
          orderStatus === "completed" ? "paid"
          : orderStatus === "in_progress" || orderStatus === "confirmed" ? "settling"
          : orderStatus === "pending" ? "pending"
          : "unknown";
        const explicit = assigneeCountByStop.get(s.id) || 0;
        const sharers = explicit > 0
          ? explicit
          : Math.max(teamSizeByRoute.get(s.route_id) || 1, 1);
        // Sammensæt fuld adresse: vej + postnr by — så medarbejderen
        // ALDRIG ser kun gaden uden by (jf. konsekvent adresseformat
        // i hele medarbejderpanelet).
        const ord = orderAddressMap.get(s.order_id);
        const street = (s as any).address || ord?.address || null;
        const cityLine = [ord?.zip, ord?.city].filter(Boolean).join(" ");
        const fullAddress = (() => {
          if (!street && !cityLine) return null;
          if (street && cityLine && !street.toLowerCase().includes(cityLine.toLowerCase())) {
            return `${street}, ${cityLine}`;
          }
          return street || cityLine || null;
        })();
        row.entries.push({
          stopId: s.id,
          customerName: s.customer_name ?? null,
          orderAmount,
          share,
          paymentStatus,
          completedAt: s.completed_at ?? null,
          address: fullAddress,
          serviceName: (s as any).service_summary ?? null,
          sharers,
          note: (s as any).notes ?? null,
        });
        perDayMap.set(d, row);
      });
      const perDay = Array.from(perDayMap.values()).sort((a, b) => b.date.localeCompare(a.date));

      return {
        routesCount: myRouteIds.size,
        stopsTotal: myStops.length,
        stopsCompleted,
        workdaysCount: (workdays || []).length,
        workSeconds,
        totalDistanceKm,
        revenue,
        commission,
        perDay,
      };
    },
  });
};