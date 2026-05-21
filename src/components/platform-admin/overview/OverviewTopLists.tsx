import { Star, Tag, MapPin, Building2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { BarList } from "./Cards";
import { fmtKr, type OverviewSnapshot } from "./shared";

interface Props {
  snapshot: Pick<OverviewSnapshot, "top_categories" | "top_cities" | "top_businesses" | "top_customers">;
  rangeLabel: string;
}

/** Top-lister samlet i én tab-baseret komponent (kategorier, byer, virksomheder, kunder). */
export const OverviewTopLists = ({ snapshot, rangeLabel }: Props) => {
  const topBusinesses = snapshot.top_businesses.map((b) => ({
    business: { id: b.id, name: b.name },
    revenue: Number(b.revenue) || 0,
  }));
  const topCustomers = snapshot.top_customers.map((c) => ({ name: c.name, spend: Number(c.spend) || 0 }));

  return (
    <SectionCard title="Top-lister" icon={<Star />} description={`Sammenlignet over ${rangeLabel.toLowerCase()}`}>
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
          <TabsTrigger value="categories" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Kategorier</TabsTrigger>
          <TabsTrigger value="cities" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Byer</TabsTrigger>
          <TabsTrigger value="businesses" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Virksomheder</TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Kunder</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <BarList items={snapshot.top_categories.map((c) => ({ label: c.label, value: Number(c.value) }))} tone="accent" empty="Ingen data endnu" />
        </TabsContent>
        <TabsContent value="cities" className="mt-4">
          <BarList items={snapshot.top_cities.map((c) => ({ label: c.label, value: Number(c.value) }))} tone="foreground" empty="Ingen data endnu" />
        </TabsContent>
        <TabsContent value="businesses" className="mt-4">
          {topBusinesses.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ingen omsætning i perioden</p>
          ) : (
            <ul className="space-y-1.5">
              {topBusinesses.map(({ business, revenue }) => (
                <li key={business?.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="truncate text-foreground">{business?.name || "—"}</span>
                  <span className="tabular-nums font-medium text-foreground">{fmtKr(revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          {topCustomers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ingen kunder i perioden</p>
          ) : (
            <ul className="space-y-1.5">
              {topCustomers.map((c) => (
                <li key={c.name} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="truncate text-foreground">{c.name}</span>
                  <span className="tabular-nums font-medium text-foreground">{fmtKr(c.spend)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </SectionCard>
  );
};