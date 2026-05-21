import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ChartSkeleton, ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { useAdminFilters } from "./lib/AdminFiltersContext";
import { exportCsv } from "./lib/csv";
import { useOverviewSnapshot, useOperationalPulse } from "./overview/shared";
import { OverviewPulse } from "./overview/OverviewPulse";
import { OverviewKpis } from "./overview/OverviewKpis";
import { OverviewGrowthChart } from "./overview/OverviewGrowthChart";
import { OverviewTopLists } from "./overview/OverviewTopLists";

interface OverviewProps { onNavigate?: (tab: string) => void }

/**
 * Platform-overblik — orkestrerer 4 sub-sektioner (puls/handlinger, KPI, vækst-graf, top-lister).
 * Al tung formattering og UI-detalje er udskilt i `./overview/*` for at holde denne fil under 80 linjer.
 */
const PlatformOverviewTab = ({ onNavigate }: OverviewProps) => {
  const { from, to, rangeLabel } = useAdminFilters();
  const { data, isLoading } = useOverviewSnapshot(from, to);
  const { data: pulse } = useOperationalPulse();

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <StatGridSkeleton count={4} />
        <div className="grid gap-3 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ListCardSkeleton rows={5} />
      </div>
    );
  }

  const handleExport = () => {
    exportCsv(
      `platform-oversigt-${rangeLabel.replace(/\s/g, "-")}`,
      data.series,
      ["date", "orders", "users", "businesses", "gmv"],
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform-overblik"
        description={<>Periode: <span className="font-medium text-foreground">{from.toLocaleDateString("da-DK")} – {to.toLocaleDateString("da-DK")}</span></>}
        action={
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Eksportér
          </Button>
        }
      />
      <OverviewPulse pulse={pulse} onNavigate={onNavigate} />
      <OverviewKpis snapshot={data} />
      <OverviewGrowthChart series={data.series} rangeLabel={rangeLabel} />
      <OverviewTopLists snapshot={data} rangeLabel={rangeLabel} />
    </div>
  );
};

export default PlatformOverviewTab;