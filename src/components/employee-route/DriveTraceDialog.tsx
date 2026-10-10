import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveMapColor } from "@/components/employee-route/RouteMapLine";
import { haversineMeters } from "@/lib/geo-distance";
import type { DrivePoint } from "@/components/employee-route/useDriveRecorder";

export const DEVIATION_M = 15;

/** Sammenligner rå GPS og den viste bil punkt for punkt. */
export function analyzeTrace(points: DrivePoint[]) {
  const deviations: { t: number; raw: [number, number]; shown: [number, number]; distM: number }[] = [];
  let maxDist = 0;
  for (const p of points) {
    if (!p.shown) continue;
    const d = haversineMeters(p.raw[0], p.raw[1], p.shown[0], p.shown[1]);
    maxDist = Math.max(maxDist, d);
    // Kun afvigelser større end GPS'ens egen usikkerhed tæller.
    if (d > Math.max(DEVIATION_M, p.acc)) deviations.push({ t: p.t, raw: p.raw, shown: p.shown, distM: d });
  }
  const durationMin = points.length > 1 ? (points[points.length - 1].t - points[0].t) / 60000 : 0;
  return { count: points.length, deviations, maxDist, durationMin };
}

function Fit({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  useEffect(() => { if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [24, 24] }); }, [pts, map]);
  return null;
}

export function DriveTraceDialog({ routeId, open, onOpenChange }: { routeId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["drive-trace", routeId],
    enabled: open,
    queryFn: async () => {
      const { data: rows, error: e } = await supabase
        .from("route_drive_traces")
        .select("session_id, points, created_at")
        .eq("route_id", routeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (e) throw e;
      if (!rows?.length) return null;
      const session = rows[0].session_id;
      const pts = rows.filter((r) => r.session_id === session).reverse().flatMap((r) => (r.points as unknown as DrivePoint[]) ?? []);
      return { startedAt: rows[rows.length - 1]?.created_at, points: pts.sort((a, b) => a.t - b.t) };
    },
  });
  const analysis = useMemo(() => (data ? analyzeTrace(data.points) : null), [data]);
  const rawLine = useMemo(() => data?.points.map((p) => p.raw) ?? [], [data]);
  const shownLine = useMemo(() => data?.points.filter((p) => p.shown).map((p) => p.shown as [number, number]) ?? [], [data]);
  const muted = resolveMapColor("--muted-foreground", "hsl(215 16% 47%)");
  const info = resolveMapColor("--info", "hsl(217 91% 60%)");
  const bad = resolveMapColor("--destructive", "hsl(0 72% 51%)");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seneste optagede kørsel</DialogTitle>
          <DialogDescription>Grå linje er GPS'en. Blå linje er bilen på kortet. Røde prikker er steder, hvor de afviger mere end {DEVIATION_M} m.</DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Henter optagelsen …</p>}
        {error && <p className="text-sm text-destructive">Optagelsen kunne ikke hentes. Prøv igen om lidt.</p>}
        {!isLoading && !error && !data && <p className="text-sm text-muted-foreground">Der er ingen optagelse endnu. Slå «Optag kørsel» til under «Alle stop», og kør et stykke.</p>}
        {data && analysis && (
          <>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border bg-card p-2"><dt className="text-xs text-muted-foreground">Punkter</dt><dd className="text-lg font-semibold tabular-nums">{analysis.count}</dd></div>
              <div className="rounded-md border bg-card p-2"><dt className="text-xs text-muted-foreground">Afvigelser</dt><dd className="text-lg font-semibold tabular-nums">{analysis.deviations.length}</dd></div>
              <div className="rounded-md border bg-card p-2"><dt className="text-xs text-muted-foreground">Største</dt><dd className="text-lg font-semibold tabular-nums">{Math.round(analysis.maxDist)} m</dd></div>
            </dl>
            <div className="h-[50dvh] min-h-64 overflow-hidden rounded-md border">
              <MapContainer center={rawLine[0] ?? [56.1, 9.0]} zoom={13} className="h-full w-full" zoomControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                <Fit pts={rawLine} />
                {rawLine.length > 1 && <Polyline positions={rawLine} pathOptions={{ color: muted, weight: 3, opacity: 0.7 }} />}
                {shownLine.length > 1 && <Polyline positions={shownLine} pathOptions={{ color: info, weight: 4 }} />}
                {analysis.deviations.slice(0, 400).map((d) => (
                  <CircleMarker key={d.t} center={d.raw} radius={5} pathOptions={{ color: bad, fillColor: bad, fillOpacity: 0.8 }} />
                ))}
              </MapContainer>
            </div>
            <p className="text-xs text-muted-foreground">{Math.round(analysis.durationMin)} minutters kørsel. Optagelser slettes automatisk efter 14 dage.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
