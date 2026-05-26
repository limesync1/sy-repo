/**
 * Hooks for "Smartere ruteplanlægger" — kapacitet, færdigheder, ruteforslag.
 *
 * Holdt samlet i én fil så DB-tabeller (employee_skills, service_duration_history)
 * og RPCs (suggest_routes_for_stop, get_employee_capacity_usage) er nemme at finde
 * og udvide senere.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Employee skills ─────────────────────────────────────────── */

export type EmployeeSkill = {
  id: string;
  employee_id: string;
  service_id: string;
  business_id: string;
};

export const useEmployeeSkills = (employeeId?: string) =>
  useQuery({
    queryKey: ["employee-skills", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employee_skills")
        .select("*")
        .eq("employee_id", employeeId);
      if (error) throw error;
      return (data ?? []) as EmployeeSkill[];
    },
  });

/** Alle skills for et firma — bruges til at vise hvem kan hvad i forslag. */
export const useAllEmployeeSkills = (businessId?: string) =>
  useQuery({
    queryKey: ["employee-skills-all", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employee_skills")
        .select("*")
        .eq("business_id", businessId);
      if (error) throw error;
      return (data ?? []) as EmployeeSkill[];
    },
  });

/** Erstatter hele skill-sættet for en medarbejder. */
export const useSetEmployeeSkills = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      business_id: string;
      service_ids: string[];
    }) => {
      // Slet eksisterende
      await (supabase as any)
        .from("employee_skills")
        .delete()
        .eq("employee_id", input.employee_id);
      if (input.service_ids.length === 0) return;
      const rows = input.service_ids.map((service_id) => ({
        employee_id: input.employee_id,
        business_id: input.business_id,
        service_id,
      }));
      const { error } = await (supabase as any)
        .from("employee_skills")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee-skills", vars.employee_id] });
      qc.invalidateQueries({ queryKey: ["employee-skills-all", vars.business_id] });
    },
  });
};

/* ── Capacity usage ──────────────────────────────────────────── */

export type CapacityUsage = {
  stops_used: number;
  stops_max: number | null;
  minutes_used: number;
  hours_max: number | null;
  km_used: number;
  km_max: number | null;
};

export const useEmployeeCapacityUsage = (employeeId?: string, date?: string) =>
  useQuery({
    queryKey: ["employee-capacity-usage", employeeId, date],
    enabled: !!employeeId && !!date,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_employee_capacity_usage",
        { _employee_id: employeeId, _date: date },
      );
      if (error) throw error;
      return data as CapacityUsage | null;
    },
  });

/* ── Route suggestions ───────────────────────────────────────── */

export type RouteSuggestion = {
  route_id: string;
  route_name: string | null;
  employee_id: string;
  employee_name: string;
  route_date: string;
  stop_count: number;
  minutes_used: number;
  km_used: number;
  nearest_km: number | null;
  has_skill: boolean;
  same_zone: boolean;
  score: number;
  capacity: {
    stops_max: number | null;
    hours_max: number | null;
    km_max: number | null;
  };
};

export const useRouteSuggestions = (input: {
  business_id?: string;
  date?: string;
  latitude?: number | null;
  longitude?: number | null;
  service_id?: string | null;
  duration_minutes?: number;
  zone_key?: string | null;
  weather_bad?: boolean;
  enabled?: boolean;
}) =>
  useQuery({
    queryKey: [
      "route-suggestions",
      input.business_id,
      input.date,
      input.latitude,
      input.longitude,
      input.service_id,
    ],
    enabled:
      (input.enabled ?? true) &&
      !!input.business_id &&
      !!input.date &&
      input.latitude != null &&
      input.longitude != null,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "suggest_routes_for_stop",
        {
          _business_id: input.business_id,
          _date: input.date,
          _latitude: input.latitude,
          _longitude: input.longitude,
          _service_id: input.service_id ?? null,
          _duration_minutes: input.duration_minutes ?? 30,
          _zone_key: input.zone_key ?? null,
          _weather_bad: input.weather_bad ?? false,
        },
      );
      if (error) throw error;
      const payload = data as { suggestions?: RouteSuggestion[] } | null;
      return payload?.suggestions ?? [];
    },
  });

/* ── Helper: udled zone-nøgle (samme regel som DB-trigger) ───── */

export const deriveZoneKey = (zip?: string | null): string | null => {
  if (!zip) return null;
  const trimmed = zip.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 2);
};

/* ── Daily capacity overview (kalender-bjælke #9) ────────────── */

export type DailyCapacity = {
  route_date: string;
  minutes_booked: number;
  minutes_capacity: number;
  load_pct: number;
  employees_count: number;
};

export const useDailyCapacity = (input: {
  business_id?: string;
  start?: string;
  end?: string;
}) =>
  useQuery({
    queryKey: ["daily-capacity", input.business_id, input.start, input.end],
    enabled: !!input.business_id && !!input.start && !!input.end,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "business_daily_capacity",
        { _business_id: input.business_id, _start: input.start, _end: input.end },
      );
      if (error) throw error;
      return (data ?? []) as DailyCapacity[];
    },
  });

/* ── Skill-mismatch pr. rute (#9) ─────────────────────────────── */

export type SkillMismatch = {
  route_id: string;
  missing_service_ids: string[];
  missing_count: number;
};

export const useRouteSkillMismatch = (input: {
  business_id?: string;
  start?: string;
  end?: string;
}) =>
  useQuery({
    queryKey: ["route-skill-mismatch", input.business_id, input.start, input.end],
    enabled: !!input.business_id && !!input.start && !!input.end,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "routes_with_skill_mismatch",
        { _business_id: input.business_id, _start: input.start, _end: input.end },
      );
      if (error) throw error;
      return (data ?? []) as SkillMismatch[];
    },
  });

/* ── Læring fra historik: anbefalede service-varigheder (#8) ── */

export type LearnedDuration = {
  service_id: string;
  service_name: string;
  avg_actual_minutes: number;
  min_actual_minutes: number;
  max_actual_minutes: number;
  samples: number;
  suggested_minutes: number;
};

export const useLearnedServiceDurations = (businessId?: string) =>
  useQuery({
    queryKey: ["learned-service-durations", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "learned_service_durations",
        { _business_id: businessId },
      );
      if (error) throw error;
      return (data ?? []) as LearnedDuration[];
    },
  });
