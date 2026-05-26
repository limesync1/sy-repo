import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import { da } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, MapPin, Clock, Wrench, Cloud, CheckCircle2,
  AlertTriangle, User, Loader2, MapPinned, CalendarSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useRouteSuggestions, type RouteSuggestion,
  deriveZoneKey,
} from "@/hooks/useRoutePlannerSmarts";
import { useGeocodeAddress } from "@/hooks/useRoutes";
import { supabase } from "@/integrations/supabase/client";

const norm = (s: string) =>
  s.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();

/** True hvis to adresser er "samme" gade+husnummer+postnummer. */
const addressMatchesInput = (matched: string, typed: string): boolean => {
  const m = norm(matched);
  const t = norm(typed);
  if (!t) return true;
  // Tjek at hvert ord i den indtastede adresse også optræder i match.
  return t.split(" ").every((w) => w.length < 2 || m.includes(w));
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  job: {
    id: string;
    customer_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    zip_code?: string | null;
    city?: string | null;
    estimated_duration_minutes?: number | null;
    preferred_date?: string | null;
    next_service_date?: string | null;
    service_id?: string | null;
    weather_sensitive?: boolean;
  };
  weatherBad?: boolean;
  onAssignToRoute: (routeId: string) => void;
};

const fmtCap = (used: number, max: number | null, unit: string) => {
  if (max == null) return `${Math.round(used)}${unit}`;
  return `${Math.round(used)} / ${Math.round(max)}${unit}`;
};

/** Oversæt rå score til en venlig "passer"-vurdering uden tal-jargon. */
const matchLevel = (score: number): { label: string; cls: string; dot: string } => {
  if (score >= 75) return {
    label: "Passer rigtig godt",
    cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  };
  if (score >= 50) return {
    label: "Passer rimeligt",
    cls: "text-amber-800 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  };
  return {
    label: "Passer dårligt",
    cls: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
  };
};

export const SuggestRouteDialog = ({
  open, onOpenChange, businessId, job, weatherBad = false, onAssignToRoute,
}: Props) => {
  const qc = useQueryClient();
  const geocode = useGeocodeAddress();
  const [resolvedCoords, setResolvedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [matchInfo, setMatchInfo] = useState<{ matched: string; confidence: string; typed: string } | null>(null);
  const [matchAccepted, setMatchAccepted] = useState(false);
  const date = useMemo(() => {
    const d = job.preferred_date || job.next_service_date;
    if (d) return d.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
  }, [job.preferred_date, job.next_service_date]);

  const zoneKey = deriveZoneKey(job.zip_code);
  const duration = job.estimated_duration_minutes ?? 30;
  const latitude = resolvedCoords?.latitude ?? job.latitude ?? null;
  const longitude = resolvedCoords?.longitude ?? job.longitude ?? null;
  const hasAddress = !!(job.address || job.zip_code || job.city);

  useEffect(() => {
    setResolvedCoords(null);
    setMatchInfo(null);
    setMatchAccepted(false);
  }, [job.id]);

  useEffect(() => {
    if (!open || resolvedCoords || (job.latitude != null && job.longitude != null) || !hasAddress || geocode.isPending) return;
    (async () => {
      await runGeocode();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job.id, hasAddress]);

  const { data: suggestions, isLoading, refetch } = useRouteSuggestions({
    business_id: businessId,
    date,
    latitude,
    longitude,
    service_id: job.service_id ?? null,
    duration_minutes: duration,
    zone_key: zoneKey,
    weather_bad: job.weather_sensitive ? weatherBad : false,
    enabled: open,
  });

  const [chosen, setChosen] = useState<string | null>(null);

  // Når der ikke findes ruter på den ønskede dato, henter vi ruter i et
  // ±7-dages vindue så brugeren kan vælge en nærliggende dag i stedet for
  // at få en blindgyde-fejl. Kører kun når hovedforslag er tomme.
  const noSuggestions = !isLoading && (!suggestions || suggestions.length === 0);
  const { data: nearbyRoutes, isLoading: loadingNearby } = useQuery({
    queryKey: ["suggest-nearby-routes", businessId, date],
    // Hent altid nærliggende ruter når hovedforslag mangler — også når vi
    // ikke kunne geokode adressen, så dialogen aldrig bliver en blindgyde.
    enabled: open && !!businessId && (noSuggestions || latitude == null || longitude == null),
    staleTime: 30_000,
    queryFn: async () => {
      const from = format(addDays(parseISO(date), -7), "yyyy-MM-dd");
      const to = format(addDays(parseISO(date), 14), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("routes")
        .select("id, name, route_date, assigned_employee_id, employees(name, color)")
        .eq("business_id", businessId)
        .gte("route_date", from)
        .lte("route_date", to)
        .order("route_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const noCoords = latitude == null || longitude == null;

  const typedAddress = [job.address, [job.zip_code, job.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  async function runGeocode() {
    try {
      const res = await geocode.mutateAsync({
        address: job.address || undefined,
        zip_code: job.zip_code || undefined,
        city: job.city || undefined,
      });
      if (res.found && res.latitude != null && res.longitude != null) {
        const matched = res.matched_address || res.display_name || "";
        const looksSame = !matched || addressMatchesInput(matched, typedAddress);
        if (looksSame && res.confidence === "exact") {
          // Helt sikkert match — gem coords med det samme.
          setResolvedCoords({ latitude: res.latitude, longitude: res.longitude });
          setMatchInfo(null);
          await supabase.from("orders").update({ latitude: res.latitude, longitude: res.longitude }).eq("id", job.id);
          qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
        } else {
          // Usikkert match — spørg brugeren før vi gemmer i ordren.
          setResolvedCoords({ latitude: res.latitude, longitude: res.longitude });
          setMatchInfo({ matched, confidence: res.confidence || "fuzzy", typed: typedAddress });
        }
      }
    } catch { /* fejlen vises i banneret */ }
  }

  const acceptMatch = async () => {
    if (!resolvedCoords) return;
    setMatchAccepted(true);
    setMatchInfo(null);
    await supabase.from("orders").update({
      latitude: resolvedCoords.latitude,
      longitude: resolvedCoords.longitude,
    }).eq("id", job.id);
    qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
  };

  const rejectMatch = () => {
    setResolvedCoords(null);
    setMatchInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Foreslå rute til {job.customer_name || "aftalen"}
          </DialogTitle>
          <DialogDescription>
            Vi finder de ruter på {format(parseISO(date), "EEEE d. MMM", { locale: da })} hvor aftalen passer bedst ind — tæt på, plads til og rigtig medarbejder.
          </DialogDescription>
        </DialogHeader>

        {noCoords ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
              {geocode.isPending ? <Loader2 className="h-4 w-4 mt-0.5 shrink-0 animate-spin" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
              <div className="flex-1 space-y-2">
                <p>
                  {geocode.isPending
                    ? "Finder adressen på kortet…"
                    : hasAddress
                      ? "Vi kunne ikke placere adressen på kortet — vi kan derfor ikke score ruterne på afstand. Du kan stadig vælge en rute manuelt herunder."
                      : "Aftalen har ingen adresse endnu — tilføj én for at få et automatisk forslag, eller vælg en rute manuelt herunder."}
                </p>
                {hasAddress && !geocode.isPending && typedAddress && (
                  <p className="text-xs text-amber-800/80">Vi prøvede: <span className="font-mono">{typedAddress}</span></p>
                )}
                {hasAddress && !geocode.isPending && (
                  <Button size="sm" variant="outline" onClick={runGeocode}>
                    Prøv at finde adressen igen
                  </Button>
                )}
              </div>
            </div>

            {loadingNearby ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Henter ruter…
              </div>
            ) : nearbyRoutes && nearbyRoutes.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <CalendarSearch className="h-3 w-3" /> Vælg en rute manuelt
                </p>
                {nearbyRoutes.map((r: any) => {
                  const dayDiff = differenceInDays(parseISO(r.route_date), parseISO(date));
                  const rel = dayDiff === 0 ? "samme dag" : dayDiff > 0 ? `om ${dayDiff} dag${dayDiff === 1 ? "" : "e"}` : `for ${Math.abs(dayDiff)} dag${Math.abs(dayDiff) === 1 ? "" : "e"} siden`;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setChosen(r.id)}
                      className={cn(
                        "w-full text-left rounded-lg border p-2.5 text-sm flex items-center justify-between gap-2 transition-all",
                        chosen === r.id ? "border-foreground bg-foreground/5 ring-2 ring-foreground/10" : "border-border hover:border-foreground/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground">
                          {r.name || "Rute"}
                          {r.employees?.name && <span className="font-normal text-muted-foreground"> · {r.employees.name}</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(r.route_date), "EEEE d. MMM", { locale: da })} · {rel}
                        </p>
                      </div>
                      {chosen === r.id && <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : matchInfo && !matchAccepted ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Vi fandt ikke et eksakt match på adressen.</p>
                <p className="text-amber-900/80">
                  Du indtastede: <span className="font-medium">{matchInfo.typed}</span>
                </p>
                <p className="text-amber-900/80">
                  Nærmeste match: <span className="font-medium">{matchInfo.matched}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={acceptMatch}>Brug nærmeste match</Button>
              <Button size="sm" variant="outline" onClick={rejectMatch}>
                Nej — jeg retter adressen
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Beregner forslag…
          </div>
        ) : !suggestions || suggestions.length === 0 ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              <p className="text-foreground font-medium mb-1">
                Ingen ruter på {format(parseISO(date), "EEEE d. MMM", { locale: da })}.
              </p>
              <p className="text-xs">
                Du kan vælge en rute på en nærliggende dag herunder — eller lukke og trække aftalen direkte ind på en ledig dag i kalenderen.
              </p>
            </div>
            {loadingNearby ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Henter ruter i nærheden…
              </div>
            ) : nearbyRoutes && nearbyRoutes.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <CalendarSearch className="h-3 w-3" /> Ruter i ±2 uger
                </p>
                {nearbyRoutes.map((r: any) => {
                  const dayDiff = differenceInDays(parseISO(r.route_date), parseISO(date));
                  const rel = dayDiff === 0 ? "samme dag" : dayDiff > 0 ? `om ${dayDiff} dag${dayDiff === 1 ? "" : "e"}` : `for ${Math.abs(dayDiff)} dag${Math.abs(dayDiff) === 1 ? "" : "e"} siden`;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setChosen(r.id)}
                      className={cn(
                        "w-full text-left rounded-lg border p-2.5 text-sm flex items-center justify-between gap-2 transition-all",
                        chosen === r.id ? "border-foreground bg-foreground/5 ring-2 ring-foreground/10" : "border-border hover:border-foreground/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate text-foreground">
                          {r.name || "Rute"}
                          {r.employees?.name && <span className="font-normal text-muted-foreground"> · {r.employees.name}</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(r.route_date), "EEEE d. MMM", { locale: da })} · {rel}
                        </p>
                      </div>
                      {chosen === r.id && <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Der er heller ingen ruter på de nærliggende dage. Luk og træk aftalen direkte ind i kalenderen.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {suggestions.map((s, idx) => (
              <SuggestionCard
                key={s.route_id}
                suggestion={s}
                isTop={idx === 0}
                chosen={chosen === s.route_id}
                onChoose={() => setChosen(s.route_id)}
                durationMinutes={duration}
              />
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuller
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={noCoords || isLoading}>
            Beregn igen
          </Button>
          <Button
            disabled={!chosen}
            onClick={() => {
              if (chosen) {
                onAssignToRoute(chosen);
                onOpenChange(false);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Tildel til valgt rute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SuggestionCard = ({
  suggestion: s, isTop, chosen, onChoose, durationMinutes,
}: {
  suggestion: RouteSuggestion;
  isTop: boolean;
  chosen: boolean;
  onChoose: () => void;
  durationMinutes: number;
}) => {
  const hoursUsed = (s.minutes_used + durationMinutes) / 60;
  const hoursPct = s.capacity.hours_max ? Math.min(100, (hoursUsed / s.capacity.hours_max) * 100) : null;
  const stopsPct = s.capacity.stops_max ? Math.min(100, ((s.stop_count + 1) / s.capacity.stops_max) * 100) : null;

  const overCapacity =
    (s.capacity.hours_max != null && hoursUsed > s.capacity.hours_max) ||
    (s.capacity.stops_max != null && s.stop_count + 1 > s.capacity.stops_max);

  return (
    <button
      type="button"
      onClick={onChoose}
      className={cn(
        "w-full text-left rounded-xl border p-3.5 transition-all",
        chosen
          ? "border-foreground bg-foreground/5 ring-2 ring-foreground/10"
          : "border-border bg-card hover:border-foreground/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">
              {s.route_name || "Rute"} <span className="text-muted-foreground font-normal">·</span>{" "}
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <User className="h-3 w-3" /> {s.employee_name}
              </span>
            </span>
            {isTop && (
              <Badge className="bg-accent text-accent-foreground hover:bg-accent">Bedste match</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {s.nearest_km != null && (
              <Badge variant="outline" className="gap-1">
                <MapPin className="h-3 w-3" /> {s.nearest_km} km til nærmeste stop
              </Badge>
            )}
            {s.has_skill ? (
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                <Wrench className="h-3 w-3" /> Matcher færdigheder
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-rose-200 bg-rose-50 text-rose-700">
                <Wrench className="h-3 w-3" /> Mangler færdighed
              </Badge>
            )}
            {s.same_zone && (
              <Badge variant="outline" className="gap-1 border-sky-200 bg-sky-50 text-sky-700">
                <MapPinned className="h-3 w-3" /> Samme zone
              </Badge>
            )}
            {overCapacity && (
              <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-3 w-3" /> Over kapacitet
              </Badge>
            )}
          </div>
        </div>
        <div className={cn("shrink-0 rounded-lg border px-2.5 py-1.5 text-center", scoreColor(s.score))}>
          <div className="text-lg font-bold leading-none tabular-nums">{Math.round(s.score)}</div>
          <div className="text-[10px] uppercase tracking-wider mt-0.5">score</div>
        </div>
      </div>

      {/* Kapacitets-bars */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <CapacityBar
          label="Timer"
          icon={<Clock className="h-3 w-3" />}
          value={fmtCap(hoursUsed, s.capacity.hours_max, " t")}
          pct={hoursPct}
        />
        <CapacityBar
          label="Stop"
          icon={<MapPin className="h-3 w-3" />}
          value={fmtCap(s.stop_count + 1, s.capacity.stops_max, "")}
          pct={stopsPct}
        />
        <CapacityBar
          label="Km"
          icon={<MapPinned className="h-3 w-3" />}
          value={fmtCap(s.km_used, s.capacity.km_max, " km")}
          pct={s.capacity.km_max ? Math.min(100, (s.km_used / s.capacity.km_max) * 100) : null}
        />
      </div>
    </button>
  );
};

const CapacityBar = ({
  label, icon, value, pct,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  pct: number | null;
}) => {
  const tone =
    pct == null ? "bg-muted-foreground/30"
      : pct >= 100 ? "bg-rose-500"
      : pct >= 80 ? "bg-amber-500"
      : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">{icon} {label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        {pct != null && (
          <div className={cn("h-full transition-all", tone)} style={{ width: `${Math.max(4, pct)}%` }} />
        )}
      </div>
    </div>
  );
};
