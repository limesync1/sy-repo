import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  HelpCircle, Lock, Sparkles, History, Repeat, CheckCircle2, AlertTriangle, Inbox, CalendarArrowDown,
} from "lucide-react";

/**
 * Lille hjælpe-legend i topbaren. Forklarer hvad farver, badges og ikoner
 * i kalenderen betyder — så brugeren ikke skal gætte sig frem til hvad
 * "Låst", "Original", "Udført" eller pulserende prikker dækker over.
 */
export function LegendPopover() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.92] transition-[background-color,color,transform] duration-150"
              aria-label="Forklaring til kalenderen"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Forklaring</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-72 p-0 overflow-hidden">
        <div className="px-3.5 py-3 border-b bg-gradient-to-b from-secondary/60 to-secondary/20">
          <h4 className="text-sm font-bold text-foreground leading-none">Forklaring</h4>
          <p className="text-[11px] text-muted-foreground mt-1">Hvad ikoner, badges og farver betyder</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="p-3 space-y-3 text-xs">
            <Section title="Rute-status">
              <Row swatch={<Dot className="bg-amber-500 animate-pulse" />} label="I gang" desc="Mindst ét stop er udført" />
              <Row swatch={<BadgeChip className="bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300"><CheckCircle2 className="h-2.5 w-2.5" /></BadgeChip>} label="Udført" desc="Alle stop er færdige" />
            </Section>
            <Divider />
            <Section title="Gentagende ruter">
              <Row swatch={<BadgeChip className="bg-foreground text-background ring-foreground/20"><Repeat className="h-2.5 w-2.5" /></BadgeChip>} label="Original" desc="Kilden til serien — rediger her for at ændre alle" />
              <Row swatch={<BadgeChip className="bg-foreground/[0.06] text-muted-foreground ring-foreground/10"><Lock className="h-2.5 w-2.5" /></BadgeChip>} label="Låst" desc="Fremtidig — låses op på dagen" />
              <Row swatch={<BadgeChip className="bg-foreground/[0.06] text-muted-foreground ring-foreground/10"><Sparkles className="h-2.5 w-2.5" /></BadgeChip>} label="I dag" desc="Aktiv projektion — kan udføres nu" />
              <Row swatch={<BadgeChip className="bg-foreground/[0.06] text-muted-foreground ring-foreground/10"><History className="h-2.5 w-2.5" /></BadgeChip>} label="Historisk" desc="Passeret — kun til indsigt" />
              <Row swatch={<BadgeChip className="bg-blue-500/15 text-blue-700 ring-blue-500/30 dark:text-blue-300"><CalendarArrowDown className="h-2.5 w-2.5" /></BadgeChip>} label="Flyttet" desc="Rute flyttet fra en anden dag" />
            </Section>
            <Divider />
            <Section title="Advarsler & dage">
              <Row swatch={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} label="Skill-mismatch" desc="Medarbejder mangler en færdighed" />
              <Row swatch={<Dot className="bg-destructive" />} label="Konflikt" desc="Overbooket eller tidsoverlap" />
              <Row swatch={<BarBg />} label="Kapacitets-bjælke" desc="Arbejdstid vs. 8-timers dag" />
              <Row swatch={<Inbox className="h-3.5 w-3.5 text-muted-foreground" />} label="Aftaler uden rute" desc="Skal placeres på kalenderen" />
            </Section>
          </div>
          <div className="px-3 py-2 border-t bg-secondary/30 text-[10.5px] text-muted-foreground flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded bg-background border text-[10px] font-mono">?</kbd>
            <span>åbner tastatur-genveje</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-muted-foreground mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/60 -mx-3" />;
}

function Row({ swatch, label, desc }: { swatch: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="shrink-0 w-7 h-5 flex items-center justify-center">{swatch}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground leading-tight">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{desc}</div>
      </div>
    </div>
  );
}

function Dot({ className }: { className?: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${className ?? ""}`} aria-hidden />;
}

function BadgeChip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-[3px] px-1 h-4 ring-1 ring-inset ${className ?? ""}`}>
      {children}
    </span>
  );
}

function BarBg() {
  return (
    <span className="inline-block h-1.5 w-7 rounded-full bg-foreground/15 overflow-hidden" aria-hidden>
      <span className="block h-full w-2/3 bg-amber-500" />
    </span>
  );
}
