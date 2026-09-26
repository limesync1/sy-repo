import { formatDistanceToNow, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Bell, CheckCheck, ChevronRight, MapPin, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  route_id: string | null;
  route_stop_id: string | null;
  routes?: { name?: string | null; route_date?: string | null } | null;
  route_stops?: { customer_name?: string | null; address?: string | null; route_id?: string | null } | null;
};

type Props = {
  notifications: Notification[];
  onOpen: (notification: Notification) => void;
  onMarkAllRead: () => void;
  markingAll?: boolean;
  compact?: boolean;
};

export const EmployeeNotifications = ({ notifications, onOpen, onMarkAllRead, markingAll, compact }: Props) => {
  const unread = notifications.filter((item) => !item.read_at).length;
  return (
    <div className="flex min-h-0 flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Notifikationer</p>
          <p className="text-[11px] text-muted-foreground">{unread ? `${unread} ulæste beskeder` : "Alt er læst"}</p>
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" className="h-8 shrink-0 gap-1.5 px-2 text-xs" onClick={onMarkAllRead} disabled={markingAll}>
            <CheckCheck className="h-3.5 w-3.5" /> Alle læst
          </Button>
        )}
      </div>
      <div className={cn("min-h-0 overflow-y-auto overscroll-contain p-1.5", compact ? "max-h-[min(28rem,calc(100vh-7rem))]" : "max-h-[68dvh]") }>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-secondary text-muted-foreground"><Bell className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-medium text-foreground">Ingen beskeder endnu</p>
            <p className="mt-1 text-xs text-muted-foreground">Nye beskeder om ruter og aftaler vises her.</p>
          </div>
        ) : notifications.map((item) => {
          const routeId = item.route_id || item.route_stops?.route_id || null;
          const isStop = !!item.route_stops?.customer_name;
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className={cn(
                "mb-1 h-auto w-full justify-start gap-2.5 whitespace-normal rounded-[5px] border px-2.5 py-2.5 text-left",
                item.read_at ? "border-transparent bg-transparent" : "border-accent/25 bg-accent/5",
              )}
              onClick={() => onOpen(item)}
              disabled={!routeId}
            >
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px]", item.read_at ? "bg-secondary text-muted-foreground" : "bg-accent/12 text-accent")}>
                {isStop ? <MapPin className="h-4 w-4" /> : <RouteIcon className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                    {isStop ? `Aftale · ${item.route_stops?.customer_name}` : `Rute · ${item.routes?.name || "Planlagt rute"}`}
                  </span>
                  {!item.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" aria-label="Ulæst" />}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {item.routes?.route_date ? format(parseISO(item.routes.route_date), "d. MMM", { locale: da }) + " · " : ""}
                  {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true, locale: da })}
                </span>
                {item.route_stops?.address && <span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.route_stops.address}</span>}
                <span className="mt-1 block text-xs font-normal leading-relaxed text-foreground">{item.message}</span>
              </span>
              {routeId && <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export type { Notification as EmployeeRouteNotification };