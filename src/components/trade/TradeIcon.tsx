import materialList from "@/assets/trade-icons/materialeliste-lille.svg.asset.json";
import materialsOnJobs from "@/assets/trade-icons/materialer-paa-opgaver.svg.asset.json";
import wholesaler from "@/assets/trade-icons/grossistpriser.svg.asset.json";
import quality from "@/assets/trade-icons/kvalitetssikring-ks.svg.asset.json";
import checklists from "@/assets/trade-icons/tjeklister-lille.svg.asset.json";
import { cn } from "@/lib/utils";

const ICONS = { materialList, materialsOnJobs, wholesaler, quality, checklists } as const;
export type TradeIconName = keyof typeof ICONS;

/** Håndværk-modulernes egne ikoner (dekorative). */
export function TradeIcon({ name, className }: { name: TradeIconName; className?: string }) {
  return <img src={ICONS[name].url} alt="" aria-hidden draggable={false} className={cn("shrink-0 object-contain", className)} />;
}
