// Delte typer for optimize-route modulerne.

export type LatLng = { lat: number; lng: number };

export type Matrix = {
  durations: number[][]; // sekunder
  distances: number[][]; // meter
  provider: "mapbox" | "osrm";
};

export type Stop = {
  id: string;
  customer_name: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  duration_minutes: number;
  // Bløde tidsvinduer (kundens ønsker) — overtrædelse straffes men tillades
  preferred_start_min: number | null;
  preferred_end_min: number | null;
  // Hårde tidsvinduer (lovet) — må ikke overtrædes
  hard_start_min: number | null;
  hard_end_min: number | null;
  required_staff: number;
  /** Hvilke medarbejdere der allerede er tildelt manuelt (låses fast). */
  pinned_assignees: string[];
};

export type EmployeeCtx = {
  id: string;
  name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  work_start_min: number;
  work_end_min: number;
};

export type ScheduledStop = {
  stop_id: string;
  sequence: number;
  arrival_min: number;
  departure_min: number;
  assignees: string[];
  travel_min_to_next: number | null;
  travel_km_to_next: number | null;
};

export type RoutePlan = {
  per_employee: Map<string, ScheduledStop[]>; // employee_id -> stops i rækkefølge
  unassigned_stops: string[]; // stops der ikke kunne planlægges
  total_km: number;
  total_minutes: number;
  soft_window_violations: number;
};
