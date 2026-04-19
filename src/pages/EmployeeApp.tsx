import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDayRoutes, useMyDayStops, type RouteStop } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarIcon, LogOut, Play, Printer, MapPin, Clock, CheckCircle2,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { da } from "date-fns/locale";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const EmployeeApp = () => {
  const { user, loading, signOut } = useAuth();
  const [date, setDate] = useState(todayStr());
  const { data: routes = [], isLoading: routesLoading } = useMyDayRoutes(date);
  const { data: stops = [], isLoading: stopsLoading } = useMyDayStops(date);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Indlæser...
      </div>
    );
  }
  if (!user) return <Navigate to="/log-ind" replace />;

  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const s of stops) {
    const arr = stopsByRoute.get(s.route_id) || [];
    arr.push(s);
    stopsByRoute.set(s.route_id, arr);
  }

  const totalStops = stops.length;
  const completedStops = stops.filter((s) => s.status === "completed").length;

  return (
    <div className="min-h-screen bg-secondary/40 pb-12">
      <header className="bg-foreground text-background sticky top-0 z-30 shadow">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg">Min dag</h1>
            <p className="text-xs opacity-80 truncate">
              {format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da })}
              {totalStops > 0 && ` · ${completedStops}/${totalStops} færdige`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-background hover:bg-background/10"
            aria-label="Log ud"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="container mx-auto px-4 pb-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}
            className="text-background hover:bg-background/10"
          >
            ←
          </Button>
          <CalendarIcon className="h-4 w-4 opacity-80" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-foreground bg-background w-[160px]"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}
            className="text-background hover:bg-background/10"
          >
            →
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDate(todayStr())}
            className="text-background hover:bg-background/10 ml-auto"
          >
            I dag
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-2xl">
        {(routesLoading || stopsLoading) && (
          <p className="text-center text-muted-foreground">Indlæser ruter...</p>
        )}

        {!routesLoading && !stopsLoading && routes.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium mb-1">Ingen ruter på denne dag</p>
            <p className="text-sm">Du har ingen tildelte stop endnu.</p>
          </Card>
        )}

        {routes.map((r) => {
          const myStops = (stopsByRoute.get(r.id) || []).sort((a, b) => a.sequence - b.sequence);
          const done = myStops.filter((s) => s.status === "completed").length;
          const total = myStops.length;
          const allDone = total > 0 && done === total;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Card key={r.id} className="overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg truncate">
                      {r.name || `Rute ${format(parseISO(r.route_date), "d. MMM", { locale: da })}`}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {r.planned_start_time?.slice(0, 5) || "08:00"}
                      </span>
                      {r.start_address && (
                        <span className="flex items-center gap-1 truncate max-w-[260px]">
                          <MapPin className="h-3.5 w-3.5" />
                          {r.start_address}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={allDone ? "secondary" : "outline"} className="shrink-0">
                    {done}/{total}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-muted rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="p-4 grid grid-cols-2 gap-2">
                <Button
                  asChild
                  size="lg"
                  className="gap-2 h-12"
                  disabled={total === 0}
                >
                  <Link to={`/medarbejder/rute/${r.id}`}>
                    <Play className="h-4 w-4" />
                    {allDone ? "Genåbn rute" : done > 0 ? "Fortsæt rute" : "Start rute"}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 h-12">
                  <Link to={`/medarbejder/rute/${r.id}/print`}>
                    <Printer className="h-4 w-4" />
                    Udskriv liste
                  </Link>
                </Button>
              </div>

              {total > 0 && (
                <div className="px-5 pb-4 -mt-1">
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {myStops.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        {s.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <span className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
                        )}
                        <span className="truncate">{s.customer_name || "Stop"}</span>
                      </li>
                    ))}
                    {myStops.length > 3 && (
                      <li className="pl-5">+{myStops.length - 3} flere stop</li>
                    )}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </main>
    </div>
  );
};

export default EmployeeApp;
