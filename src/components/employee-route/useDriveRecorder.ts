import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RawFix } from "@/components/employee-route/positionEngine";
import type { MotionSource } from "@/components/employee-route/motionTrack";

/** Ét optaget punkt: rå GPS og bilens viste position på samme tidspunkt. */
export type DrivePoint = {
  t: number;
  raw: [number, number];
  acc: number;
  speed: number | null;
  shown: [number, number] | null;
  onRoute: boolean | null;
};

const FLUSH_MS = 30_000;
const MAX_BATCH = 600;

/**
 * Valgfri optagelse af en kørsel, så afvigelser mellem GPS og kort kan ses bagefter.
 * Punkter samles lokalt og sendes i bundter hvert 30. sekund, når siden skjules
 * og når optagelsen stoppes. Optagelser slettes automatisk efter 14 dage.
 */
export function useDriveRecorder(routeId: string | undefined, enabled: boolean, raw: RawFix | null, track: MotionSource) {
  const bufferRef = useRef<DrivePoint[]>([]);
  const sessionRef = useRef<string | null>(null);

  const flush = useRef(async () => {
    const points = bufferRef.current.splice(0, MAX_BATCH);
    if (!points.length || !routeId || !sessionRef.current) return;
    const { error } = await supabase.rpc("append_drive_trace", { _route_id: routeId, _session_id: sessionRef.current, _points: points as never });
    if (error) {
      console.warn("[optagelse] kunne ikke gemmes", error.message);
      bufferRef.current.unshift(...points.slice(-MAX_BATCH));
    }
  });

  useEffect(() => {
    if (!enabled || !routeId) return;
    sessionRef.current = crypto.randomUUID();
    const timer = window.setInterval(() => { void flush.current(); }, FLUSH_MS);
    const onHide = () => { if (document.visibilityState === "hidden") void flush.current(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      void flush.current();
    };
  }, [enabled, routeId]);

  useEffect(() => {
    if (!enabled || !raw) return;
    const shown = track.value;
    bufferRef.current.push({
      t: raw.t,
      raw: [raw.lat, raw.lng],
      acc: Math.round(raw.accuracy * 10) / 10,
      speed: raw.speed,
      shown: shown ? shown.pos : null,
      onRoute: (shown as { onRoute?: boolean } | null)?.onRoute ?? null,
    });
    if (bufferRef.current.length >= MAX_BATCH) void flush.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, raw?.t]);
}
