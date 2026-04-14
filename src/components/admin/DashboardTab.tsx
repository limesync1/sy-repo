import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, DollarSign, Star, Briefcase, Clock, TrendingUp } from "lucide-react";
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
    { label: "Omsætning", value: `${revenue.toLocaleString("da-DK")} kr`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Ordrer", value: ordersCount, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Services", value: servicesCount, icon: Briefcase, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Bedømmelse", value: reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const statusLabels: Record<string, string> = {
    pending: "Afventer", confirmed: "Bekræftet", in_progress: "I gang",
    completed: "Afsluttet", cancelled: "Annulleret",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Velkommen tilbage 👋</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Her er et overblik over {business.name}.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-xl shadow-sm border-[#e1e3e5]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`rounded-lg p-1.5 ${stat.bg}`}>
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-1.5 text-2xl font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending alert */}
      {pendingOrders > 0 && (
        <Card className="rounded-xl border-amber-200 bg-amber-50/60 shadow-sm">
          <CardContent className="flex items-center gap-3 p-3.5">
            <div className="rounded-lg bg-amber-100 p-2">
              <Clock className="h-4 w-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{pendingOrders} afventende {pendingOrders === 1 ? "ordre" : "ordrer"}</p>
              <p className="text-sm text-muted-foreground">Gå til Ordrer for at behandle dem.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <div>
        <h3 className="mb-3 text-[14px] font-semibold text-foreground">Seneste ordrer</h3>
        {recentOrders.length > 0 ? (
          <Card className="rounded-xl shadow-sm border-[#e1e3e5] overflow-hidden">
            <div className="divide-y divide-[#e1e3e5]">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 ml-4">
                    <Badge className={`${statusColors[order.status] || ""} text-xs font-normal px-2 py-0.5`}>{statusLabels[order.status] || order.status}</Badge>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap w-16 text-right">{order.total_amount} kr</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="rounded-xl border-dashed border-[#e1e3e5]">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div className="mb-3 rounded-xl bg-muted p-2.5">
                <TrendingUp className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">Ingen ordrer endnu</p>
              <p className="mt-0.5 text-sm text-muted-foreground">Ordrer vil vises her når de kommer ind.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
