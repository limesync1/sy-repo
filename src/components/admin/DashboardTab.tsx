import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake, DollarSign, Star, Briefcase, Clock, TrendingUp } from "lucide-react";
import type { Business } from "@/hooks/useDatabase";

interface Props {
  business: Business;
  ordersCount: number;
  revenue: number;
  servicesCount: number;
  averageRating: number;
  reviewsCount: number;
  pendingOrders: number;
  recentOrders: any[];
}

const DashboardTab = ({ business, ordersCount, revenue, servicesCount, averageRating, reviewsCount, pendingOrders, recentOrders }: Props) => {
  const stats = [
    { label: "Omsætning", value: `${revenue.toLocaleString("da-DK")} kr`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
    { label: "Aftaler", value: ordersCount, icon: Handshake, color: "text-blue-600", bg: "bg-blue-500/10", ring: "ring-blue-500/20" },
    { label: "Services", value: servicesCount, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-500/10", ring: "ring-violet-500/20" },
    { label: "Bedømmelse", value: reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–", icon: Star, color: "text-amber-600", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  ];

  const statusLabels: Record<string, string> = {
    pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang",
    completed: "Afsluttet", cancelled: "Annulleret",
  };
  const responseLabels: Record<string, string> = {
    accepted: "Godkendt", rejected: "Afvist", adjusted: "Tilpasset",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    confirmed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    in_progress: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Velkommen tilbage 👋</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Her er et overblik over {business.name}.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-xl border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`rounded-lg p-1.5 ${stat.bg} ring-1 ${stat.ring}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending alert */}
      {pendingOrders > 0 && (
        <Card className="rounded-xl border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{pendingOrders} afventende {pendingOrders === 1 ? "aftale" : "aftaler"}</p>
              <p className="text-sm text-muted-foreground">Gå til Aftaler for at behandle dem.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Seneste aftaler</h3>
        {recentOrders.length > 0 ? (
          <Card className="rounded-xl border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 ml-4">
                    <Badge className={`${statusColors[order.status] || ""} text-xs font-medium border px-2 py-0.5`}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                    {order.business_response && (
                      <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">
                        {responseLabels[order.business_response] || order.business_response}
                      </Badge>
                    )}
                    <span className="text-sm font-bold text-foreground whitespace-nowrap w-16 text-right tabular-nums">{order.total_amount} kr</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="rounded-xl border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <TrendingUp className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground">Ingen aftaler endnu</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Aftaler vil vises her når de kommer ind.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
