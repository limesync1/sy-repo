import { CloudOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeatherBadge } from "@/components/route-planner/WeatherBadge";
import { useRouteWeather } from "@/hooks/useRouteWeather";
import type { RouteStop } from "@/hooks/useRoutes";

export function RouteWeatherStatus({ routeId, date, stops }: { routeId: string; date: string; stops: RouteStop[] }) {
  const forecast = useRouteWeather([{ id: routeId, route_date: date }], stops);
  const weather = forecast.weatherByRoute.get(routeId);
  if (weather) return <span className="inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Gennemsnitsvejr langs ruten"><WeatherBadge weather={weather} size="full" /><span>{weather.precipitationMm.toFixed(1)} mm · {weather.windSpeedMax.toFixed(1)} m/s</span>{forecast.isError && <Button variant="ghost" size="sm" className="h-auto min-h-8 px-1 text-xs" onClick={forecast.refetch}>Delvist vejr · prøv igen</Button>}</span>;
  if (forecast.isError) return <Button variant="ghost" size="sm" className="h-auto min-h-8 gap-1 px-1 text-xs text-muted-foreground" onClick={forecast.refetch}><CloudOff className="h-3.5 w-3.5" />Vejr · prøv igen</Button>;
  if (forecast.isLoading) return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Henter vejr</span>;
  return <span className="text-xs text-muted-foreground">{forecast.hasCoordinates ? "Vejr ikke tilgængeligt for datoen" : "Vejr kræver stopadresser"}</span>;
}