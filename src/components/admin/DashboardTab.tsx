import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, DollarSign, Star, Briefcase, TrendingUp, Clock } from "lucide-react";
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
    { label: "Omsætning", value: `${revenue.toLocaleString("da-DK")} kr`, icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: "Ordrer", value: ordersCount, icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
    { label: "Services", value: servicesCount, icon: Briefcase, color: "text-purple-600 bg-purple-50" },
    { label: "Bedømmelse", value: reviewsCount > 0 ? `${averageRating.toFixed(1)} ★` : "–", icon: Star, color: "text-amber-600 bg-amber-50" },
  ];

  const statusLabels: Record<string, string> = {
    pending: "Afventer",
    confirmed: "Bekræftet",
    in_progress: "I gang",
    completed: "Afsluttet",
    cancelled: "Annulleret",
  };
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Velkommen, {business.name}</h2>
        <p className="text-muted-foreground">Her er et overblik over din virksomhed.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending alert */}
      {pendingOrders > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-foreground">{pendingOrders} afventende {pendingOrders === 1 ? "ordre" : "ordrer"}</p>
              <p className="text-sm text-muted-foreground">Gå til Ordrer-fanen for at behandle dem.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Seneste ordrer</h3>
        {recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.slice(0, 5).map((order) => (
              <Card key={order.id} className="border-border/60">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[order.status] || ""}>{statusLabels[order.status] || order.status}</Badge>
                    <span className="text-sm font-bold text-foreground whitespace-nowrap">{order.total_amount} kr</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-muted-foreground">Ingen ordrer endnu.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardTab;
