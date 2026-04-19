import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDayStops, useUpdateStopStatus, type RouteStop } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Navigation, CheckCircle2, Clock, LogOut, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const buildPin = (n: number, done = false) =>
  L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${done ? "hsl(142 70% 45%)" : "hsl(184 90% 42%)"};color:white;font-weight:600;font-size:13px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${n}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    setTimeout(() => map.invalidateSize(), 100);
  }, [points, map]);
  return null;
};

const EmployeeApp = () => {
  const { user, loading, signOut } = useAuth();
  const [date, setDate] = useState(todayStr());
  const { data: stops = [], isLoading } = useMyDayStops(date);
  const updateStatus = useUpdateStopStatus();
  const [openStopId, setOpenStopId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/log-ind" replace />;

  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const completed = sorted.filter((s) => s.status === "completed").length;
  const points: [number, number][] = sorted
    .filter((s) => s.latitude != null && s.longitude != null)
    .map((s) => [Number(s.latitude), Number(s.longitude)]);

  const handleNavigate = (s: RouteStop) => {
    const q = s.address || (s.latitude && s.longitude ? `${s.latitude},${s.longitude}` : s.customer_name || "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-secondary/40 pb-24">
      <header className="bg-foreground text-background sticky top-0 z-30 shadow">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="font-semibold">Min dag</h1>
            <p className="text-xs opacity-80">{format(parseISO(date), "EEEE d. MMMM", { locale: da })} · {completed}/{sorted.length} færdige</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-background hover:bg-background/10">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="container mx-auto px-4 pb-3 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))} className="text-background hover:bg-background/10">←</Button>
          <CalendarIcon className="h-4 w-4 opacity-80" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-foreground bg-background w-[150px]" />
          <Button size="sm" variant="ghost" onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))} className="text-background hover:bg-background/10">→</Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(todayStr())} className="text-background hover:bg-background/10 ml-auto">I dag</Button>
        </div>
      </header>

      {/* Map */}
      <div className="h-[260px] w-full bg-muted">
        {points.length > 0 ? (
          <MapContainer center={points[0]} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <FitBounds points={points} />
            {sorted.map((s, i) => {
              if (s.latitude == null || s.longitude == null) return null;
              return (
                <Marker key={s.id} position={[Number(s.latitude), Number(s.longitude)]} icon={buildPin(i + 1, s.status === "completed")}>
                  <Popup>
                    <strong>{s.customer_name}</strong>
                    {s.address && <><br />{s.address}</>}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Ingen koordinater tilgængelige for kortvisning
          </div>
        )}
      </div>

      {/* Stops list */}
      <main className="container mx-auto px-4 py-4 space-y-3">
        {isLoading && <p className="text-center text-muted-foreground">Indlæser ruter...</p>}
        {!isLoading && sorted.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Ingen stop på din rute i dag.</p>
          </Card>
        )}
        {sorted.map((s, i) => {
          const isOpen = openStopId === s.id;
          const done = s.status === "completed";
          return (
            <Card key={s.id} className={`p-4 ${done ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shrink-0 ${done ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"}`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{s.customer_name || "Stop"}</h3>
                    <Badge variant={done ? "secondary" : "outline"} className="text-[10px]">{s.status}</Badge>
                  </div>
                  {s.address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />{s.address}
                    </p>
                  )}
                  {s.service_summary && <p className="text-sm mt-1">{s.service_summary}</p>}
                  {s.planned_arrival && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />{format(parseISO(s.planned_arrival), "HH:mm")}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => handleNavigate(s)} className="gap-1">
                  <Navigation className="h-3.5 w-3.5" />Naviger
                </Button>
                {s.customer_phone && (
                  <Button size="sm" variant="outline" asChild className="gap-1">
                    <a href={`tel:${s.customer_phone}`}><Phone className="h-3.5 w-3.5" />Ring</a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setOpenStopId(isOpen ? null : s.id)}>
                  {isOpen ? "Skjul" : "Note"}
                </Button>
                {!done ? (
                  <Button size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "completed", notes: noteDraft[s.id] })} className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />Færdig
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: "pending" })}>
                    Fortryd
                  </Button>
                )}
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Tilføj note (synlig for virksomheden)…"
                    value={noteDraft[s.id] ?? s.notes ?? ""}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                    rows={3}
                  />
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: s.status, notes: noteDraft[s.id] ?? "" })}>
                    Gem note
                  </Button>
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
