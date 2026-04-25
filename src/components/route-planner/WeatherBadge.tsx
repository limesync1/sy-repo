// WeatherBadge — kompakt vejr-ikon + temperatur til ruteplanlæggerens kalender.
// Vises i øverste højre hjørne af hver dag-celle. Tooltip viser detaljer og
// praktisk vurdering for vinduespolering og algebehandling.
import {
  Sun, Cloud, CloudSun, CloudRain, CloudDrizzle, CloudSnow,
  CloudLightning, CloudFog, Snowflake, Wind, Thermometer, Droplets,
  Sunrise, Sunset,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type WeatherDay } from "@/hooks/useWeather";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";

/** WMO weather code → Lucide-ikon + tekstbeskrivelse.
 *  Kilde: https://open-meteo.com/en/docs (WMO Weather interpretation codes) */
const codeToIconLabel = (
  code: number,
  tempMin: number,
): { Icon: typeof Sun; label: string; tone: "sun" | "cloud" | "rain" | "snow" | "storm" | "fog" } => {
  // Specialtilfælde — frost-temp men solrigt vejr → vis snefnug for at signalere risiko
  if (code <= 1 && tempMin <= 0) {
    return { Icon: Snowflake, label: "Klart, men frost", tone: "snow" };
  }
  if (code === 0) return { Icon: Sun, label: "Klart vejr", tone: "sun" };
  if (code === 1) return { Icon: Sun, label: "Mest klart", tone: "sun" };
  if (code === 2) return { Icon: CloudSun, label: "Delvist skyet", tone: "cloud" };
  if (code === 3) return { Icon: Cloud, label: "Overskyet", tone: "cloud" };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: "Tåge", tone: "fog" };
  if (code >= 51 && code <= 55) return { Icon: CloudDrizzle, label: "Støvregn", tone: "rain" };
  if (code >= 56 && code <= 57) return { Icon: CloudDrizzle, label: "Underafkølet støvregn", tone: "snow" };
  if (code >= 61 && code <= 65) return { Icon: CloudRain, label: "Regn", tone: "rain" };
  if (code >= 66 && code <= 67) return { Icon: CloudRain, label: "Underafkølet regn", tone: "snow" };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, label: "Sne", tone: "snow" };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, label: "Regnbyger", tone: "rain" };
  if (code >= 85 && code <= 86) return { Icon: CloudSnow, label: "Snebyger", tone: "snow" };
  if (code >= 95) return { Icon: CloudLightning, label: "Tordenbyger", tone: "storm" };
  return { Icon: Cloud, label: "Skyet", tone: "cloud" };
};

/** Farve-tokens i HSL — matcher resten af appen. */
const TONE_BG: Record<string, string> = {
  sun: "bg-amber-100 text-amber-700 ring-amber-200",
  cloud: "bg-slate-100 text-slate-600 ring-slate-200",
  rain: "bg-sky-100 text-sky-700 ring-sky-200",
  snow: "bg-blue-100 text-blue-700 ring-blue-200",
  storm: "bg-purple-100 text-purple-700 ring-purple-200",
  fog: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

type Props = {
  weather: WeatherDay;
  /** "compact" = kun ikon (måneds-visning), "full" = ikon + temp (uge) */
  size?: "compact" | "full";
  className?: string;
};

export const WeatherBadge = ({ weather, size = "compact", className }: Props) => {
  const { Icon, label, tone } = codeToIconLabel(weather.weatherCode, weather.tempMin);
  const tempMaxStr = `${Math.round(weather.tempMax)}°`;
  const tempMinStr = `${Math.round(weather.tempMin)}°`;
  const isFrost = weather.tempMin <= 0;

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md ring-1 px-1 py-0.5 cursor-help select-none",
            TONE_BG[tone],
            className,
          )}
          aria-label={`Vejr: ${label}, ${tempMaxStr}/${tempMinStr}`}
        >
          <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
          {size === "full" && (
            <span className="text-[10px] font-semibold tabular-nums leading-none">
              {tempMaxStr}
            </span>
          )}
          {isFrost && size === "compact" && (
            <Snowflake className="h-2.5 w-2.5 text-blue-600" strokeWidth={2.5} />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="p-0 max-w-[280px]">
        <WeatherTooltipContent weather={weather} label={label} />
      </TooltipContent>
    </Tooltip>
  );
};

const WeatherTooltipContent = ({
  weather, label,
}: {
  weather: WeatherDay;
  label: string;
}) => {
  const dateLabel = format(parseISO(weather.date), "EEEE d. MMMM", { locale: da });
  return (
    <div className="text-xs">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          {dateLabel}
        </p>
        <p className="font-semibold text-sm leading-tight mt-0.5">{label}</p>
      </div>

      {/* Målinger */}
      <div className="px-3 py-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Metric
          icon={Thermometer}
          label="Temperatur"
          value={`${Math.round(weather.tempMax)}° / ${Math.round(weather.tempMin)}°`}
          highlight={weather.tempMin <= 0}
        />
        <Metric
          icon={Droplets}
          label="Nedbør"
          value={
            weather.precipitationMm > 0
              ? `${weather.precipitationMm.toFixed(1)} mm`
              : "Ingen"
          }
          highlight={weather.precipitationMm >= 1}
        />
        <Metric
          icon={Wind}
          label="Vind"
          value={`${weather.windSpeedMax} m/s`}
          sublabel={
            weather.windGustMax > weather.windSpeedMax + 2
              ? `stød ${weather.windGustMax}`
              : undefined
          }
          highlight={weather.windGustMax >= 12}
        />
        <Metric
          icon={Droplets}
          label="Sandsynlighed"
          value={`${weather.precipitationProbability}%`}
          highlight={weather.precipitationProbability >= 60}
        />
      </div>

      {/* Sol op/ned hvis tilgængeligt */}
      {(weather.sunrise || weather.sunset) && (
        <div className="px-3 py-1.5 grid grid-cols-2 gap-x-3 border-t text-[10px] text-muted-foreground">
          {weather.sunrise && (
            <div className="flex items-center gap-1">
              <Sunrise className="h-3 w-3" />
              {format(parseISO(weather.sunrise), "HH:mm")}
            </div>
          )}
          {weather.sunset && (
            <div className="flex items-center gap-1">
              <Sunset className="h-3 w-3" />
              {format(parseISO(weather.sunset), "HH:mm")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Metric = ({
  icon: Icon, label, value, sublabel, highlight,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <Icon className="h-2.5 w-2.5" />
      {label}
    </div>
    <p
      className={cn(
        "text-xs font-semibold tabular-nums leading-tight",
        highlight && "text-red-600",
      )}
    >
      {value}
      {sublabel && (
        <span className="ml-1 text-[10px] font-normal text-muted-foreground">{sublabel}</span>
      )}
    </p>
  </div>
);