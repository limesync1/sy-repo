import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import type { WeatherDay } from "./useWeather";

type Point = { latitude: number | null; longitude: number | null; route_id: string };
type WeatherRoute = { id: string; route_date: string; base_route_id?: string | null; baseRouteId?: string | null };
export function averageWeather(days: WeatherDay[]): WeatherDay | null {
  if (!days.length) return null;
  const mean = (key: keyof WeatherDay) => Math.round(days.reduce((sum, d) => sum + Number(d[key]), 0) / days.length * 10) / 10;
  const counts = new Map<number, number>();
  days.forEach(d => counts.set(d.weatherCode, (counts.get(d.weatherCode) ?? 0) + 1));
  const code = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  return { ...days[0], weatherCode: code, tempMax: mean("tempMax"), tempMin: mean("tempMin"), precipitationMm: mean("precipitationMm"), precipitationProbability: Math.round(mean("precipitationProbability")), precipitationHours: mean("precipitationHours"), windSpeedMax: mean("windSpeedMax"), windGustMax: mean("windGustMax") };
}
export function useRouteWeather(routes: WeatherRoute[], stops: Point[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  const end = format(addDays(new Date(), 15), "yyyy-MM-dd");
  const cells = useMemo(() => {
    const result = new Map<string, { lat: number; lng: number }>();
    stops.forEach(s => {
      if (s.latitude == null || s.longitude == null || !Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) return;
      const lat = Math.round(s.latitude * 10) / 10, lng = Math.round(s.longitude * 10) / 10;
      result.set(`${lat}:${lng}`, { lat, lng });
    });
    return result;
  }, [stops]);
  const entries = [...cells];
  const queries = useQueries({ queries: entries.map(([key, point]) => ({
    queryKey: ["route-weather-cell", key, today], staleTime: 2 * 60 * 60 * 1000, retry: 1,
    queryFn: async ({ signal }: { signal: AbortSignal }): Promise<WeatherDay[]> => {
      const params = new URLSearchParams({ latitude: String(point.lat), longitude: String(point.lng), timezone: "Europe/Copenhagen", start_date: today, end_date: end, wind_speed_unit: "ms", daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset" });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]) });
      if (!res.ok) throw new Error("Vejret kunne ikke hentes");
      const { daily: d } = await res.json();
      if (!Array.isArray(d?.time)) throw new Error("Vejrudsigten mangler");
      return d.time.map((date: string, i: number) => {
        const values = [d.weather_code?.[i], d.temperature_2m_max?.[i], d.temperature_2m_min?.[i], d.precipitation_sum?.[i], d.precipitation_probability_max?.[i], d.precipitation_hours?.[i], d.wind_speed_10m_max?.[i], d.wind_gusts_10m_max?.[i]];
        if (values.some(v => v == null || !Number.isFinite(v))) throw new Error("Vejrudsigten er ufuldstændig");
        return { date, weatherCode: values[0], tempMax: values[1], tempMin: values[2], precipitationMm: values[3], precipitationProbability: values[4], precipitationHours: values[5], windSpeedMax: values[6], windGustMax: values[7], sunrise: d.sunrise?.[i] ?? null, sunset: d.sunset?.[i] ?? null };
      });
    },
  })) });
  const weatherByRoute = new Map<string, WeatherDay>();
  const byDate = new Map<string, WeatherDay[]>();
  for (const route of routes) {
    const date = route.route_date.slice(0, 10);
    const routeStops = stops.filter(s => s.route_id === route.id || s.route_id === (route.base_route_id ?? route.baseRouteId));
    const forecasts: WeatherDay[] = [];
    for (const s of routeStops) {
      if (s.latitude == null || s.longitude == null) continue;
      const key = `${Math.round(s.latitude * 10) / 10}:${Math.round(s.longitude * 10) / 10}`;
      const index = entries.findIndex(([cell]) => cell === key);
      const day = queries[index]?.data?.find(d => d.date === date);
      if (day) forecasts.push(day);
    }
    const average = averageWeather(forecasts);
    if (average) weatherByRoute.set(route.id, average);
    byDate.set(date, [...(byDate.get(date) ?? []), ...forecasts]);
  }
  const weatherByDate = new Map<string, WeatherDay>();
  byDate.forEach((days, date) => { const average = averageWeather(days); if (average) weatherByDate.set(date, average); });
  return { weatherByRoute, weatherByDate, isLoading: queries.some(q => q.isPending), isError: queries.some(q => q.isError), hasCoordinates: cells.size > 0, refetch: () => queries.forEach(q => void q.refetch()) };
}