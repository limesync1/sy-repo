import noItems from "@/assets/content-icons/ingen-emner-generel.svg.asset.json";
import { cn } from "@/lib/utils";

/** Fælles ikon til tomme lister ("ingen emner"). */
export const NoItemsIcon = ({ className }: { className?: string }) => (
  <img src={noItems.url} alt="" aria-hidden="true" className={cn("mx-auto h-14 w-14 object-contain", className)} />
);

export default NoItemsIcon;
