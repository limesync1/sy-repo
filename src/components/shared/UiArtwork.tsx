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
  <span aria-hidden className={cn("inline-flex h-2.5 w-14 shrink-0 overflow-hidden", className)} {...props}>
    <img src={animatedLine.url} alt="" className="h-full w-full object-cover motion-reduce:animate-none" />
  </span>
);

export const SidebarArrowArtwork = ({ collapsed }: { collapsed: boolean }) => (
  <span className={cn("group/sidebar-arrow relative block h-full w-full transition-transform", collapsed && "rotate-180")}>
    <img src={sidebarArrow.url} alt="" className="absolute inset-0 h-full w-full scale-[1.35] object-cover transition-opacity group-hover/sidebar-arrow:opacity-0 group-focus-visible/sidebar-arrow:opacity-0" />
    <img src={sidebarArrowHover.url} alt="" className="absolute inset-0 h-full w-full scale-[1.35] object-cover opacity-0 transition-opacity group-hover/sidebar-arrow:opacity-100 group-focus-visible/sidebar-arrow:opacity-100" />
  </span>
);