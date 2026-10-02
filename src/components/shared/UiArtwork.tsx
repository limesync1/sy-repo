import type { HTMLAttributes, ImgHTMLAttributes } from "react";
import animatedArrow from "@/assets/ui/Pil_animeret.svg.asset.json";
import recentSearch from "@/assets/ui/Senest_soegt.svg.asset.json";
import searchIcon from "@/assets/ui/Soeg.svg.asset.json";
import animatedLine from "@/assets/ui/Streg_animeret.webp.asset.json";
import sidebarArrow from "@/assets/ui/Pil_venstre.png.asset.json";
import sidebarArrowHover from "@/assets/ui/Pil_venstre_hover.png.asset.json";
import { cn } from "@/lib/utils";

type ArtworkName = "search" | "recentSearch" | "categoryArrow";

const ARTWORK: Record<ArtworkName, string> = {
  search: searchIcon.url,
  recentSearch: recentSearch.url,
  categoryArrow: animatedArrow.url,
};

export const UiArtwork = ({ name, className, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement> & { name: ArtworkName }) => (
  <img src={ARTWORK[name]} alt={alt} className={cn("shrink-0 object-contain", className)} {...props} />
);

export const SectionLabelMark = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span aria-hidden className={cn("inline-flex h-2 w-12 shrink-0 items-center", className)} {...props}>
    <img src={animatedLine.url} alt="" className="h-auto w-full object-contain motion-reduce:animate-none" />
  </span>
);

// Sort dobbeltpil i stedet for det orange artwork. Hover "skubber" pilen i
// sidemenuens retning og den anden pil lyser op; klik-animation sidder på
// selve knappen (SidebarEdgeHandle).
export const SidebarArrowArtwork = ({ collapsed }: { collapsed: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "relative block h-full w-full text-foreground",
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
      className="h-full w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/sidebar-arrow:-translate-x-[1.5px] group-focus-visible/sidebar-arrow:-translate-x-[1.5px] motion-reduce:transition-none"
    >
      <path d="M11.5 7 6.5 12l5 5" />
      <path
        d="M17.5 7l-5 5 5 5"
        className="opacity-45 transition-opacity duration-200 group-hover/sidebar-arrow:opacity-100 group-focus-visible/sidebar-arrow:opacity-100 motion-reduce:transition-none"
      />
    </svg>
  </span>
);