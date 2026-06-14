// StickyActionBar — bundforankret handlingsbjælke til mobile sider.
//
// Bruges på fuldskærms-sider (ikke i sheets — der er der allerede en sticky
// footer indbygget) hvor primær-CTA'en ellers ville drukne langt nede:
//
//   <StickyActionBar>
//     <Button className="w-full" size="lg">Bestil nu</Button>
//   </StickyActionBar>
//
// Komponenten håndterer selv:
//   • z-index så den ligger over indholdet men under modals/sheets
//   • safe-area-padding så den ikke gemmer sig bag iOS hjemme-bjælke
//   • valgfri "elevated" backdrop-blur så indhold der scroller bagved
//     stadig anes svagt — giver dybde uden at distrahere
//
// HUSK: når denne bjælke vises, skal forælder-siden have ekstra bottom-padding
// så det sidste indhold ikke gemmer sig bag den. Standardværdi er ~5rem.
import * as React from "react";

import { cn } from "@/lib/utils";

export interface StickyActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Vis kun på mobil (default true). Sat til false for at vise på alle størrelser. */
  mobileOnly?: boolean;
}

export const StickyActionBar = React.forwardRef<HTMLDivElement, StickyActionBarProps>(
  ({ className, mobileOnly = true, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          mobileOnly && "sm:hidden",
          className,
        )}
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
StickyActionBar.displayName = "StickyActionBar";

export default StickyActionBar;