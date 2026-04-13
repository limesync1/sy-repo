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
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Velkommen tilbage 👋</h2>
        <p className="mt-1 text-muted-foreground">Her er et overblik over {business.name}.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending alert */}
      {pendingOrders > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{pendingOrders} afventende {pendingOrders === 1 ? "ordre" : "ordrer"}</p>
              <p className="text-sm text-muted-foreground">Gå til Ordrer for at behandle dem.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Seneste ordrer</h3>
          {recentOrders.length > 5 && (
            <span className="text-sm text-accent cursor-pointer hover:underline">Se alle</span>
          )}
        </div>
        {recentOrders.length > 0 ? (
          <Card>
            <div className="divide-y divide-border">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge className={`${statusColors[order.status] || ""} font-normal`}>{statusLabels[order.status] || order.status}</Badge>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap w-20 text-right">{order.total_amount} kr</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-3 rounded-xl bg-muted p-3">
                <TrendingUp className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">Ingen ordrer endnu</p>
              <p className="mt-1 text-sm text-muted-foreground">Ordrer vil vises her når de kommer ind.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
