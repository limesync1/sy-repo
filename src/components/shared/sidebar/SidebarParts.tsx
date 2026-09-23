// Delte sidebar-byggesten brugt af AdminShell, EmployeeShell og PlatformAdmin.
// Mål: ét konsistent visuelt sprog på tværs af alle tre paneler — aktiv
// indikator-bar, tooltips når collapsed, ens fokus-ringe, ens spacing.
import { forwardRef, type ReactNode } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Konstanter — bruges også af shells til at sætte aside-bredden.     */
/* ------------------------------------------------------------------ */
export const SIDEBAR_WIDTH_EXPANDED = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

export const sidebarAsideWidth = (collapsed: boolean) =>
  collapsed ? `w-[${SIDEBAR_WIDTH_COLLAPSED}px]` : `w-[${SIDEBAR_WIDTH_EXPANDED}px]`;

/* ------------------------------------------------------------------ */
/* SidebarNavButton — én række i navigationen.                        */
/*                                                                    */
/* - Aktiv: venstre 3px indikator-bar + foreground tekst.             */
/* - Collapsed: kun ikon, tooltip viser label + evt. shortcut.        */
/* - Badge: lille pille (rød hvis warn=true) — bruges fx til          */
/*   ulæste livechats / antal pending.                                */
/* ------------------------------------------------------------------ */
type SidebarNavButtonProps = {
  icon: any;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  onTouchStart?: () => void;
  /** Vises som lille pille til højre (eller som dot når collapsed). */
  badge?: number | string | null;
  /** Når sat: badge bliver rød i stedet for neutral. */
  badgeWarn?: boolean;
  /** Genvejstast som vises lille til højre ved hover når expanded. */
  shortcut?: string;
};

export const SidebarNavButton = forwardRef<HTMLButtonElement, SidebarNavButtonProps>(
  function SidebarNavButton(
    { icon: Icon, label, active, collapsed, onClick, onMouseEnter, onFocus, onTouchStart, badge, badgeWarn, shortcut },
    ref,
  ) {
    const showBadge = badge !== null && badge !== undefined && badge !== 0 && badge !== "";

    const button = (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
        onTouchStart={onTouchStart}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        className={cn(
          "group relative flex w-full items-center overflow-hidden rounded-[4px] text-sm font-medium text-left transition-[background-color,color,padding] duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          collapsed ? "h-10 justify-center px-0" : "gap-2.5 px-3 py-2.5",
          active
            ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.22)]"
            : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
        )}
      >
        {/* Venstre aktiv-indikator — vises altid på aktiv (også collapsed). */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-opacity",
            active ? "opacity-100" : "opacity-0",
          )}
        />
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-accent")} aria-hidden="true" />
        {/* Labelen fades og glider ud i stedet for at forsvinde brat — det
            gør collapse/expand markant mere roligt at se på. */}
        <span
          className={cn(
            "min-w-0 truncate whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            collapsed ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[170px] flex-1 translate-x-0 opacity-100",
          )}
        >
          {label}
        </span>

        {!collapsed && showBadge && (
          <span
            className={cn(
              "ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
              badgeWarn
                ? "bg-destructive text-destructive-foreground"
                : "bg-foreground/10 text-foreground",
            )}
          >
            {badge}
          </span>
        )}
        {!collapsed && !showBadge && shortcut && (
          <kbd className="ml-auto hidden h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex">
            {shortcut}
          </kbd>
        )}
        {/* Collapsed: lille dot oven på ikon hvis badge. */}
        {collapsed && showBadge && (
          <span
            className={cn(
              "absolute top-1.5 right-2 h-2 w-2 rounded-full ring-2 ring-background",
              badgeWarn ? "bg-destructive" : "bg-foreground",
            )}
            aria-hidden="true"
          />
        )}
      </button>
    );

    if (!collapsed) return button;

    // Collapsed → tooltip viser label + evt. shortcut til højre for ikonet.
    return (
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
            <span>{label}</span>
            {shortcut && (
              <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-background/20 px-1 font-mono text-[10px] font-semibold">
                {shortcut}
              </kbd>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

/* ------------------------------------------------------------------ */
/* SidebarGroupLabel — lille majuskel-label over en sektion.          */
/* Skjules helt når collapsed (erstattes af en tynd skille-linje).    */
/* ------------------------------------------------------------------ */
export const SidebarGroupLabel = ({ children, collapsed }: { children: ReactNode; collapsed: boolean }) => {
  if (collapsed) {
    return <div className="my-2 mx-2 h-px bg-border/60" aria-hidden="true" />;
  }
  return (
    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  );
};

/* ------------------------------------------------------------------ */
/* SidebarCollapseToggle — chevron-knap i bunden (kun på lg+).        */
/* ------------------------------------------------------------------ */
export const SidebarCollapseToggle = ({
  collapsed, onToggle,
}: { collapsed: boolean; onToggle: () => void }) => {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Udvid sidebar" : "Kollaps sidebar"}
            aria-pressed={collapsed}
             className="hidden lg:inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[4px] border border-border bg-background text-xs font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {collapsed ? (
              <ChevronsRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <>
                <ChevronsLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kollaps</span>
                <kbd className="ml-1 inline-flex h-4 items-center rounded border border-border bg-secondary px-1 font-mono text-[9px] font-semibold">[</kbd>
              </>
            )}
          </button>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
            <span>Udvid sidebar</span>
            <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-background/20 px-1 font-mono text-[10px] font-semibold">[</kbd>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

/* ------------------------------------------------------------------ */
/* SidebarFooterItem — link/knap i bunden (Se forside, Log ud).       */
/* ------------------------------------------------------------------ */
export const SidebarFooterItem = ({
  icon: Icon, label, onClick, href, collapsed, danger,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  href?: string;
  collapsed: boolean;
  danger?: boolean;
}) => {
  const className = cn(
    "group relative flex w-full items-center overflow-hidden rounded-[4px] text-sm font-medium transition-[background-color,color,padding] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    collapsed ? "h-10 justify-center px-0" : "gap-2 px-3 py-2",
    danger
      // Log ud står altid i destruktiv-rød — også uden hover — så den
      // tydeligt skiller sig ud fra de neutrale navigations-knapper.
      ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
  );
  const inner = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span
        className={cn(
          "truncate whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          collapsed ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[170px] translate-x-0 opacity-100",
        )}
      >
        {label}
      </span>
    </>
  );

  const button = href ? (
    <a href={href} className={className} aria-label={collapsed ? label : undefined}>{inner}</a>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-label={collapsed ? label : undefined}>{inner}</button>
  );
  if (!collapsed) return button;
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/* ------------------------------------------------------------------ */
/* RoleSwitchFooterItem — fælles, fremhævet skift mellem panelroller. */
/* ------------------------------------------------------------------ */
export const RoleSwitchFooterItem = ({
  icon: Icon, label, onClick, collapsed,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  collapsed: boolean;
}) => {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={collapsed ? label : undefined}
      className={cn(
        "group relative flex w-full items-center overflow-hidden rounded-[4px] text-sm font-semibold text-foreground transition-[background-color,padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        "hover:bg-secondary active:bg-secondary/80",
        collapsed ? "h-10 justify-center px-0" : "gap-2 px-2 py-2",
      )}
    >
      <span className="role-switch-ring relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-[2px]">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-card">
          <Icon className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
        </span>
      </span>
      <span className={cn(
        "truncate whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        collapsed ? "max-w-0 -translate-x-1 opacity-0" : "max-w-[170px] translate-x-0 opacity-100",
      )}>
        {label}
      </span>
    </button>
  );

  if (!collapsed) return button;
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};