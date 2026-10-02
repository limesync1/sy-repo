// Delte sidebar-byggesten brugt af AdminShell, EmployeeShell og PlatformAdmin.
// Mål: ét lyst, roligt visuelt sprog på tværs af alle paneler — ÉN aktiv-markør
// (blød pille), tooltips når collapsed, ens fokus-ringe og ens spacing.
//
// Bemærk: ingen komponenter her opretter deres egen TooltipProvider — PanelShell
// (eller appens rod) leverer én. Det sparer en provider pr. menupunkt.
import { Fragment, forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SidebarArrowArtwork } from "@/components/shared/UiArtwork";

/* ------------------------------------------------------------------ */
/* Konstanter                                                         */
/* ------------------------------------------------------------------ */
export const SIDEBAR_WIDTH_EXPANDED = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 68;

/** @deprecated Brug CSS-variablen --sidebar-w (sat af PanelShell). Beholdt så
 *  eksisterende imports ikke knækker. Klasserne er nu statiske, så Tailwind
 *  faktisk genererer dem (den gamle template-string gjorde ikke). */
export const sidebarAsideWidth = (collapsed: boolean) =>
  collapsed ? "w-[68px]" : "w-[248px]";

export const initialsOf = (name: string, fallback = "V") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || fallback;

/* ------------------------------------------------------------------ */
/* Intern: tooltip der kun er aktiv når sidebaren er collapsed.       */
/* ------------------------------------------------------------------ */
const CollapsedTip = ({
  collapsed, label, shortcut, children,
}: { collapsed: boolean; label: string; shortcut?: string; children: ReactNode }) => {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="flex items-center gap-2">
        <span>{label}</span>
        {shortcut && (
          <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-background/20 px-1 font-mono text-[10px] font-semibold">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

const FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 focus-visible:ring-offset-card";
const LABEL_TRANSITION =
  "transition-[max-width,opacity] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

/* ------------------------------------------------------------------ */
/* SidebarNavButton — én række i navigationen.                        */
/*                                                                    */
/* - Aktiv: blød pille + accent-ikon (ÉN markør, ikke tre).           */
/* - Collapsed: kun ikon, tooltip viser label + evt. shortcut.        */
/* - Badge: lille pille (rød hvis warn) eller dot når collapsed.      */
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
  badge?: number | string | null;
  badgeWarn?: boolean;
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
          "group relative flex w-full items-center rounded-lg text-[13.5px] font-medium text-left",
          "transition-[background-color,color] duration-150 motion-reduce:transition-none",
          FOCUS_RING,
          collapsed ? "h-10 justify-center px-0" : "h-9 gap-2.5 px-2.5",
          active
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground active:bg-secondary",
        )}
      >
        <Icon
          className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-accent" : "text-muted-foreground group-hover:text-foreground")}
          aria-hidden="true"
        />
        <span
          className={cn(
            "min-w-0 truncate whitespace-nowrap",
            LABEL_TRANSITION,
            collapsed ? "max-w-0 opacity-0" : "max-w-[170px] flex-1 opacity-100",
          )}
        >
          {label}
        </span>

        {!collapsed && showBadge && (
          <span
            className={cn(
              "ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
              badgeWarn ? "bg-destructive text-destructive-foreground" : "bg-foreground/[0.07] text-foreground",
            )}
          >
            {badge}
          </span>
        )}
        {!collapsed && !showBadge && shortcut && (
          <kbd className="ml-auto hidden h-5 items-center rounded border border-border bg-card px-1.5 font-mono text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex">
            {shortcut}
          </kbd>
        )}
        {collapsed && showBadge && (
          <span
            className={cn(
              "absolute right-2 top-1.5 h-2 w-2 rounded-full ring-2 ring-card",
              badgeWarn ? "bg-destructive" : "bg-foreground",
            )}
            aria-hidden="true"
          />
        )}
      </button>
    );

    return <CollapsedTip collapsed={collapsed} label={label} shortcut={shortcut}>{button}</CollapsedTip>;
  },
);

/* ------------------------------------------------------------------ */
/* SidebarGroupLabel — lille label over en sektion.                   */
/* Uden tekst (eller collapsed) bliver det en tynd skillelinje.       */
/* ------------------------------------------------------------------ */
export const SidebarGroupLabel = ({
  children, collapsed, first,
}: { children?: ReactNode; collapsed: boolean; first?: boolean }) => {
  if (collapsed || !children) {
    return <div className="mx-2 my-2 h-px bg-border/60" aria-hidden="true" />;
  }
  return (
    <p className={cn("px-2.5 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70", first ? "pt-1" : "pt-4")}>
      {children}
    </p>
  );
};

/* ------------------------------------------------------------------ */
/* SidebarCollapsibleRow — rolig ind/ud-animation når en feature      */
/* toggles i Indstillinger. Kun højde + opacity (ingen scale/blur).   */
/* ------------------------------------------------------------------ */
export const SidebarCollapsibleRow = ({ visible, children }: { visible: boolean; children: ReactNode }) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const [open, setOpen] = useState(visible);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShouldRender(visible);
      setOpen(visible);
      return;
    }
    if (visible) {
      setShouldRender(true);
      let id2 = 0;
      const id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => setOpen(true));
      });
      return () => {
        cancelAnimationFrame(id1);
        if (id2) cancelAnimationFrame(id2);
      };
    }
    setOpen(false);
    const t = window.setTimeout(() => setShouldRender(false), 220);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className={cn("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>{children}</div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SidebarWorkspaceRow — flad virksomheds-/arbejdspladsrække øverst.  */
/* ------------------------------------------------------------------ */
export const SidebarWorkspaceRow = ({
  name, subtitle, logoUrl, collapsed, onClick, trailing, ariaLabel,
}: {
  name: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  collapsed: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  ariaLabel?: string;
}) => {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-sm font-bold text-foreground ring-1 ring-border/60">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" width={36} height={36} loading="lazy" decoding="async" />
        ) : (
          initialsOf(name).charAt(0)
        )}
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold leading-tight text-foreground">{name}</span>
          {subtitle ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
        </span>
      )}
      {!collapsed && trailing}
    </>
  );

  const cls = cn(
    "flex w-full items-center rounded-lg text-left",
    collapsed ? "h-11 justify-center" : "gap-2.5 p-1.5",
  );

  const node = onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? name}
      className={cn(cls, "transition-colors hover:bg-secondary/70 active:bg-secondary motion-reduce:transition-none", FOCUS_RING)}
    >
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );

  return <CollapsedTip collapsed={collapsed} label={name}>{node}</CollapsedTip>;
};

/* ------------------------------------------------------------------ */
/* SidebarProgressCard — "Kom godt i gang" som lille fremdriftskort.  */
/* ------------------------------------------------------------------ */
const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;

export const SidebarProgressCard = forwardRef<HTMLButtonElement, {
  icon: any;
  label: string;
  done: number;
  total: number;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  onTouchStart?: () => void;
}>(function SidebarProgressCard(
  { icon: Icon, label, done, total, active, collapsed, onClick, onMouseEnter, onFocus, onTouchStart },
  ref,
) {
  const pct = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  const hint = total > 0 ? `${done} af ${total} trin klaret` : "Sæt din virksomhed op";

  const ring = (size: string, iconSize: string) => (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", size)}>
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={RING_R} fill="none" strokeWidth="3" className="stroke-border" />
        <circle
          cx="18" cy="18" r={RING_R} fill="none" strokeWidth="3" strokeLinecap="round"
          className="stroke-accent transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - pct)}
        />
      </svg>
      <Icon className={cn("text-accent", iconSize)} aria-hidden="true" />
    </span>
  );

  const button = (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      onTouchStart={onTouchStart}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? `${label}. ${hint}` : undefined}
      className={cn(
        "flex w-full items-center text-left transition-colors motion-reduce:transition-none",
        FOCUS_RING,
        collapsed
          ? "h-10 justify-center rounded-lg hover:bg-secondary/60"
          : "gap-3 rounded-xl border p-2.5",
        !collapsed && (active
          ? "border-accent/30 bg-secondary"
          : "border-border/60 bg-secondary/40 hover:bg-secondary/70"),
        collapsed && active && "bg-secondary",
      )}
    >
      {collapsed ? ring("h-7 w-7", "h-3 w-3") : ring("h-9 w-9", "h-4 w-4")}
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-foreground">{label}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{hint}</span>
        </span>
      )}
    </button>
  );

  return <CollapsedTip collapsed={collapsed} label={`${label} · ${hint}`}>{button}</CollapsedTip>;
});

/* ------------------------------------------------------------------ */
/* SidebarEdgeHandle — lille rund collapse-knap på sidebarens kant.   */
/* Kræver at forælderen har `group/sidebar relative`.                 */
/* ------------------------------------------------------------------ */
export const SidebarEdgeHandle = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
  <Tooltip delayDuration={200}>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Vis sidemenu" : "Skjul sidemenu"}
        aria-pressed={collapsed}
        className={cn(
          "group/sidebar-arrow absolute -right-4 top-[42px] z-10 hidden h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card shadow-sm lg:flex",
          "opacity-0 transition-[opacity,color,background-color] duration-150 motion-reduce:transition-none",
          "group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 [@media(hover:none)]:opacity-100",
          "hover:bg-secondary hover:text-foreground",
          FOCUS_RING,
        )}
      >
        <SidebarArrowArtwork collapsed={collapsed} />
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2 whitespace-nowrap">
      <span>{collapsed ? "Vis sidemenu" : "Skjul sidemenu"}</span>
    </TooltipContent>
  </Tooltip>
);

/** @deprecated Erstattet af SidebarEdgeHandle. Beholdt for PlatformAdmin indtil den migreres. */
export const SidebarCollapseToggle = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => (
  <Tooltip delayDuration={200}>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Vis sidemenu" : "Skjul sidemenu"}
        aria-pressed={collapsed}
        className={cn(
          "group/sidebar-arrow hidden h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:inline-flex",
          FOCUS_RING,
        )}
      >
        <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full"><SidebarArrowArtwork collapsed={collapsed} /></span>
        {!collapsed && <span>Skjul sidemenu</span>}
      </button>
    </TooltipTrigger>
    <TooltipContent side={collapsed ? "right" : "top"} sideOffset={8} className="whitespace-nowrap">
      {collapsed ? "Vis sidemenu" : "Skjul sidemenu"}
    </TooltipContent>
  </Tooltip>
);

/* ------------------------------------------------------------------ */
/* SidebarFooterItem — link/knap i bunden.                            */
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
    "group relative flex w-full items-center rounded-lg text-[13.5px] font-medium",
    "transition-[background-color,color] duration-150 motion-reduce:transition-none",
    FOCUS_RING,
    collapsed ? "h-10 justify-center px-0" : "h-9 gap-2.5 px-2.5",
    danger
      ? "text-destructive hover:bg-destructive/10"
      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
  );
  const inner = (
    <>
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className={cn("truncate whitespace-nowrap", LABEL_TRANSITION, collapsed ? "max-w-0 opacity-0" : "max-w-[170px] opacity-100")}>
        {label}
      </span>
    </>
  );

  const node = href ? (
    <a href={href} className={className} aria-label={collapsed ? label : undefined}>{inner}</a>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-label={collapsed ? label : undefined}>{inner}</button>
  );
  return <CollapsedTip collapsed={collapsed} label={label}>{node}</CollapsedTip>;
};

/* ------------------------------------------------------------------ */
/* RoleSwitchFooterItem — fremhævet skift mellem panelroller.         */
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
        "group relative flex w-full items-center rounded-lg text-[13.5px] font-semibold text-foreground",
        "transition-colors motion-reduce:transition-none hover:bg-secondary/70 active:bg-secondary",
        FOCUS_RING,
        collapsed ? "h-10 justify-center px-0" : "h-10 gap-2.5 px-1.5",
      )}
    >
      <span className="role-switch-ring relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full p-[2px]">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-card">
          <Icon className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
        </span>
      </span>
      <span className={cn("truncate whitespace-nowrap", LABEL_TRANSITION, collapsed ? "max-w-0 opacity-0" : "max-w-[170px] opacity-100")}>
        {label}
      </span>
    </button>
  );
  return <CollapsedTip collapsed={collapsed} label={label}>{button}</CollapsedTip>;
};

/* ------------------------------------------------------------------ */
/* SidebarProfileMenu — profilrække i bunden med dropdown.            */
/* ------------------------------------------------------------------ */
export type ProfileMenuItem = {
  key: string;
  icon: any;
  label: string;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  separatorBefore?: boolean;
};

export const SidebarProfileMenu = ({
  name, subtitle, avatarUrl, avatarColor, collapsed, items, fallback = "M",
}: {
  name: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string;
  collapsed: boolean;
  items: ProfileMenuItem[];
  fallback?: string;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={`Profilmenu: ${name}`}
        className={cn(
          "flex w-full items-center rounded-lg text-left transition-colors motion-reduce:transition-none hover:bg-secondary/70 data-[state=open]:bg-secondary",
          FOCUS_RING,
          collapsed ? "h-11 justify-center" : "gap-2.5 p-1.5",
        )}
      >
        <Avatar className="h-8 w-8 shrink-0 rounded-full ring-1 ring-border" style={avatarColor ? { background: avatarColor } : undefined}>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="rounded-full object-cover" /> : null}
          <AvatarFallback
            className="rounded-full bg-secondary text-xs font-bold text-foreground"
            style={avatarColor ? { background: avatarColor, color: "hsl(var(--background))" } : undefined}
          >
            {initialsOf(name, fallback)}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight text-foreground">{name}</span>
              {subtitle ? <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span> : null}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} sideOffset={8} className="w-60">
      <DropdownMenuLabel className="flex flex-col">
        <span className="truncate font-semibold">{name}</span>
        {subtitle ? <span className="truncate text-xs font-normal text-muted-foreground">{subtitle}</span> : null}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {items.map((item) => {
        const Icon = item.icon;
        const cls = item.danger ? "text-destructive focus:text-destructive" : undefined;
        const content = (
          <>
            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
            {item.label}
          </>
        );
        return (
          <Fragment key={item.key}>
            {item.separatorBefore && <DropdownMenuSeparator />}
            {item.href ? (
              <DropdownMenuItem asChild className={cls}>
                <a href={item.href}>{content}</a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={item.onSelect} className={cls}>{content}</DropdownMenuItem>
            )}
          </Fragment>
        );
      })}
    </DropdownMenuContent>
  </DropdownMenu>
);
