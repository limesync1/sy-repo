// useWeather — henter daglig vejrudsigt fra Open-Meteo (gratis, ingen API-key).
// Forecast op til 16 dage frem; historiske dage får ingen data (returnerer null).
//
// Bruges i ruteplanlæggerens kalender, så virksomheden kan se hvilket vejr
// der er på de dage hvor de har planlagt ruter — særligt vigtigt for
// vinduespudsere, algebehandling og andet udendørs arbejde.
//
// API: https://open-meteo.com/en/docs
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO, format } from "date-fns";

export type WeatherDay = {
  date: string;                  // yyyy-MM-dd
  weatherCode: number;           // WMO code
  tempMax: number;               // °C
  tempMin: number;               // °C
  precipitationMm: number;       // mm samlet
  precipitationProbability: number; // % (0-100, max på dagen)
  precipitationHours: number;    // antal timer med nedbør
  windSpeedMax: number;          // m/s (10m)
  windGustMax: number;           // m/s
  sunrise: string | null;        // ISO
  sunset: string | null;         // ISO
};

/** Open-Meteo dækker 16 dage frem; alt udover dropper vi. */
const MAX_FORECAST_DAYS = 16;

/** Konvertér Open-Meteo response (km/h) til m/s for dansk vejr-konvention. */
const kmhToMs = (v: number) => Math.round((v / 3.6) * 10) / 10;

type Args = {
  /** yyyy-MM-dd start (inkl.) */
  startDate: string;
  /** yyyy-MM-dd slut (inkl.) */
  endDate: string;
  latitude: number | null;
  longitude: number | null;
};

export const useWeatherForecast = ({ startDate, endDate, latitude, longitude }: Args) => {
  // Klipper datoer til intervallet vi reelt kan få forecast for
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDays = differenceInCalendarDays(parseISO(startDate), today);
  const endDays = differenceInCalendarDays(parseISO(endDate), today);

  // Hvis hele intervallet er i fortiden eller for langt frem, springer vi over
  const effectiveStart = startDays < 0 ? format(today, "yyyy-MM-dd") : startDate;
  const effectiveEndDays = Math.min(endDays, MAX_FORECAST_DAYS - 1);
  const effectiveEnd = effectiveEndDays < 0
    ? null
    : format(addDaysSafe(today, effectiveEndDays), "yyyy-MM-dd");

  const enabled =
    latitude != null &&
    longitude != null &&
    effectiveEnd != null &&
    effectiveStart <= effectiveEnd;

  return useQuery<WeatherDay[]>({
    queryKey: ["weather-forecast", latitude, longitude, effectiveStart, effectiveEnd],
    enabled,
    staleTime: 30 * 60 * 1000, // 30 min — vejret ændrer sig sjældent oftere
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        timezone: "Europe/Copenhagen",
        start_date: effectiveStart,
        end_date: effectiveEnd!,
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "precipitation_probability_max",
          "precipitation_hours",
          "wind_speed_10m_max",
          "wind_gusts_10m_max",
          "sunrise",
          "sunset",
        ].join(","),
        wind_speed_unit: "kmh",
      });
      const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Vejr-API fejl (${res.status})`);
      const json = await res.json();
      const d = json.daily ?? {};
      const dates: string[] = d.time ?? [];
      return dates.map((date, i): WeatherDay => ({
        date,
        weatherCode: Number(d.weather_code?.[i] ?? 0),
        tempMax: Number(d.temperature_2m_max?.[i] ?? 0),
        tempMin: Number(d.temperature_2m_min?.[i] ?? 0),
        precipitationMm: Number(d.precipitation_sum?.[i] ?? 0),
        precipitationProbability: Number(d.precipitation_probability_max?.[i] ?? 0),
        precipitationHours: Number(d.precipitation_hours?.[i] ?? 0),
        windSpeedMax: kmhToMs(Number(d.wind_speed_10m_max?.[i] ?? 0)),
        windGustMax: kmhToMs(Number(d.wind_gusts_10m_max?.[i] ?? 0)),
        sunrise: d.sunrise?.[i] ?? null,
        sunset: d.sunset?.[i] ?? null,
      }));
    },
  });
};

function addDaysSafe(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* ─── Fortolkning til praktiske faggrupper (vinduespudser, algebehandling) ─── */

export type WorkSuitability = {
  /** "good" | "warning" | "bad" — overordnet farveindikator */
  level: "good" | "warning" | "bad";
  /** Kort label vist i tooltip */
  label: string;
  /** Detaljeret begrundelse vist på linjeform */
  reasons: string[];
};

/** Vurdering for vinduespolering:
 *  - Ikke nedbør (> 1 mm = bad, > 0.2 mm = warning)
 *  - Ikke frostgrader (min ≤ 0 = bad pga. risiko for fastfrysning)
 *  - Ikke for kraftig vind (> 12 m/s = bad, > 8 m/s = warning) */
export const windowCleaningSuitability = (w: WeatherDay): WorkSuitability => {
  const reasons: string[] = [];
  let level: WorkSuitability["level"] = "good";

  if (w.precipitationMm >= 1) {
    level = "bad";
    reasons.push(`Nedbør ${w.precipitationMm.toFixed(1)} mm — vinduer bliver våde igen`);
  } else if (w.precipitationMm > 0.2 || w.precipitationProbability >= 60) {
    if (level === "good") level = "warning";
    reasons.push(`Risiko for nedbør (${w.precipitationProbability}%)`);
  }

  if (w.tempMin <= 0) {
    level = "bad";
    reasons.push(`Frost (min ${Math.round(w.tempMin)}°C) — vand kan fryse på ruder`);
  } else if (w.tempMin <= 3) {
    if (level === "good") level = "warning";
    reasons.push(`Lav temperatur (min ${Math.round(w.tempMin)}°C)`);
  }

  if (w.windGustMax >= 12) {
    level = "bad";
    reasons.push(`Stærke vindstød (${w.windGustMax} m/s) — usikkert at arbejde i højden`);
  } else if (w.windSpeedMax >= 8) {
    if (level === "good") level = "warning";
    reasons.push(`Friskt til hård vind (${w.windSpeedMax} m/s)`);
  }

  if (reasons.length === 0) {
    reasons.push("Tørt, mildt og roligt — god dag til vinduespolering");
  }

  const label =
    level === "good"
      ? "Egnet til vinduespolering"
      : level === "warning"
        ? "Vær opmærksom"
        : "Frarådet";

  return { level, label, reasons };
};

/** Vurdering for algebehandling (kræver tørt 4-6 timer + temp ≥ 8°C). */
export const algaeTreatmentSuitability = (w: WeatherDay): WorkSuitability => {
  const reasons: string[] = [];
  let level: WorkSuitability["level"] = "good";

  if (w.precipitationMm >= 0.5 || w.precipitationProbability >= 50) {
    level = "bad";
    reasons.push(`For våd dag (${w.precipitationMm.toFixed(1)} mm, ${w.precipitationProbability}% chance) — middel skylles af`);
  } else if (w.precipitationProbability >= 30) {
    level = "warning";
    reasons.push(`Lille risiko for nedbør (${w.precipitationProbability}%)`);
  }

  if (w.tempMax < 5) {
    level = "bad";
    reasons.push(`For koldt (${Math.round(w.tempMax)}°C) — middel virker dårligt`);
  } else if (w.tempMax < 8) {
    if (level === "good") level = "warning";
    reasons.push(`Køligt (${Math.round(w.tempMax)}°C) — virker langsommere`);
  }

  if (w.tempMin <= 0) {
    level = "bad";
    reasons.push(`Nattefrost — kan ødelægge behandlingen`);
  }

  if (reasons.length === 0) {
    reasons.push("Tørt og lunt — god dag til algebehandling");
  }

  const label =
    level === "good"
      ? "Egnet til algebehandling"
      : level === "warning"
        ? "Vær opmærksom"
        : "Frarådet";

  return { level, label, reasons };
};