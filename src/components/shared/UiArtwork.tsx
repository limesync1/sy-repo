import { forwardRef, type HTMLAttributes, type ImgHTMLAttributes } from "react";
import animatedArrow from "@/assets/ui/Pil_animeret.svg.asset.json";
import recentSearch from "@/assets/content-icons/senest-soegt.svg.asset.json";
import searchIcon from "@/assets/content-icons/soeg.svg.asset.json";
import animatedLine from "@/assets/ui/section-line.webp.asset.json";
import dayLocked from "@/assets/ui/laast-start-dagen.png.asset.json";
import addAppointmentToRoute from "@/assets/ui/tilfoej-aftale-til-rute.svg.asset.json";
import appointmentInfo from "@/assets/ui/mere-info-om-aftalen.svg.asset.json";
import { cn } from "@/lib/utils";

type ArtworkName = "search" | "recentSearch" | "categoryArrow" | "dayLocked" | "addAppointmentToRoute" | "appointmentInfo";

const ARTWORK: Record<ArtworkName, string> = {
  search: searchIcon.url,
  recentSearch: recentSearch.url,
  categoryArrow: animatedArrow.url,
  dayLocked: dayLocked.url,
  addAppointmentToRoute: addAppointmentToRoute.url,
  appointmentInfo: appointmentInfo.url,
};

export const UiArtwork = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement> & { name: ArtworkName }>(
  ({ name, className, alt = "", ...props }, ref) => (
    <img ref={ref} src={ARTWORK[name]} alt={alt} className={cn("shrink-0 object-contain", className)} {...props} />
  ),
);
UiArtwork.displayName = "UiArtwork";

export const SectionLabelMark = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span aria-hidden className={cn("inline-flex h-2 w-8 shrink-0 items-center", className)} {...props}>
    <span className="h-[2px] w-full rounded-full bg-gradient-to-r from-[hsl(190_100%_45%)] to-[hsl(197_71%_35%)]" />
  </span>
);

// Sort dobbeltpil i stedet for det orange artwork. Hover "skubber" pilen i
// sidemenuens retning og den anden pil lyser op; klik-animation sidder på
// selve knappen (SidebarEdgeHandle).
export const SidebarArrowArtwork = ({ collapsed }: { collapsed: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "relative flex h-full w-full items-center justify-center text-foreground",
      "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
      collapsed && "rotate-180",
    )}
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[58%] w-[58%] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/sidebar-arrow:-translate-x-[1.5px] group-focus-visible/sidebar-arrow:-translate-x-[1.5px] motion-reduce:transition-none"
    >
      <path d="M11.5 7 6.5 12l5 5" />
      <path
        d="M17.5 7l-5 5 5 5"
        className="opacity-45 transition-opacity duration-200 group-hover/sidebar-arrow:opacity-100 group-focus-visible/sidebar-arrow:opacity-100 motion-reduce:transition-none"
      />
    </svg>
  </span>
);