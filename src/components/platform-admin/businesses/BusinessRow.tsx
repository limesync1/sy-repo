import { Link } from "react-router-dom";
import {
  BadgeCheck, MapPin, Mail, Activity, LogIn as LoginIcon, CreditCard,
  AlertTriangle, Clock, CheckCircle2, XCircle, Settings2, UploadCloud, LogIn, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtKr, fmtRelDate, type BusinessRow as Row } from "./types";

interface Props {
  b: Row;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onVerifyToggle: (b: Row) => void;
  onAdminister: (id: string) => void;
  onImport: (b: { id: string; name: string }) => void;
  onImpersonate: (b: { id: string; name: string }) => void;
}

/** Én række i virksomheds-listen: logo, status, plan-badge, handlinger. */
export const BusinessListRow = ({
  b, selected, onToggle, onVerifyToggle, onAdminister, onImport, onImpersonate,
}: Props) => {
  const hasCard = !!b.stripe_payment_method_last4;
  const daysLeft = b.days_left ?? null;
  const isExpired = !hasCard && daysLeft !== null && daysLeft <= 0;
  const isWarning = !hasCard && daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
      <Checkbox checked={selected} onCheckedChange={(c) => onToggle(b.id, !!c)} />
      <div className="relative shrink-0">
        {b.logo_url ? (
          <img
            src={b.logo_url} alt="" width={40} height={40} loading="lazy" decoding="async"
            className="h-10 w-10 rounded object-contain bg-secondary p-0.5"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
            {b.name.charAt(0)}
          </div>
        )}
        {b.is_verified && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-background shadow-sm">
            <BadgeCheck className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
          {b.public_id && (
            <button
              type="button"
              title="Kopiér virksomheds-ID"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(b.public_id!).catch(() => {});
              }}
              className="font-mono text-[10px] uppercase tracking-wider rounded-md bg-secondary px-1.5 py-0.5 text-muted-foreground ring-1 ring-inset ring-border hover:bg-secondary/70"
            >
              {b.public_id}
            </button>
          )}
          {!b.is_active && (
            <span className="inline-flex items-center rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive ring-1 ring-inset ring-destructive/20">
              Inaktiv
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          {b.category && <span>{b.category}</span>}
          {b.city && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{b.city}</span>}
          {(b.owner_email || b.email) && <span className="flex items-center gap-0.5"><Mail className="h-3 w-3" />{b.owner_email || b.email}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Oprettet {new Date(b.created_at).toLocaleDateString("da-DK")} ·{` ${Number(b.orders_count || 0)} ordrer · ${fmtKr(Number(b.total_revenue || 0))}`}
          {Number(b.pending_count || 0) > 0 && <span className="text-amber-700"> · {Number(b.pending_count)} afventer</span>}
        </p>
        <p className="text-[11px] text-muted-foreground/80 flex items-center gap-3 mt-0.5">
          <span className="inline-flex items-center gap-1" title="Sidste login (ejer)">
            <LoginIcon className="h-3 w-3" /> {b.owner_last_login ? fmtRelDate(b.owner_last_login) : "aldrig"}
          </span>
          <span className="inline-flex items-center gap-1" title="Sidste ordre">
            <Activity className="h-3 w-3" /> {b.last_order_at ? fmtRelDate(b.last_order_at) : "ingen"}
          </span>
        </p>
        {(b.plan_status || hasCard || daysLeft !== null) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            {hasCard ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <CreditCard className="h-3 w-3" />
                {b.stripe_payment_method_brand || "Kort"} •••• {b.stripe_payment_method_last4}
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive ring-1 ring-inset ring-destructive/20">
                <AlertTriangle className="h-3 w-3" /> Prøve udløbet · intet kort
              </span>
            ) : isWarning ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                <Clock className="h-3 w-3" /> {daysLeft} dage prøve tilbage · intet kort
              </span>
            ) : daysLeft !== null ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 font-medium text-muted-foreground ring-1 ring-inset ring-border">
                <Clock className="h-3 w-3" /> {daysLeft} dage prøve tilbage
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 font-medium text-muted-foreground ring-1 ring-inset ring-border">
              {fmtKr(Number(b.monthly_price_dkk) || 0)}/md
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onVerifyToggle(b)}>
          {b.is_verified ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{b.is_verified ? "Fjern verif." : "Verificér"}</span>
        </Button>
        <Button size="sm" variant="default" className="gap-1.5"
          onClick={() => onAdminister(b.id)}
          title="Åbn fuldt kontrolpanel: prøveperiode, plan, ejer, slet">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Administrér</span>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5"
          onClick={() => onImport({ id: b.id, name: b.name })}
          title="Importér data for denne virksomhed">
          <UploadCloud className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Importér data</span>
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5"
          onClick={() => onImpersonate({ id: b.id, name: b.name })}
          title="Log ind på denne virksomheds panel">
          <LogIn className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Log ind som</span>
        </Button>
        <Button asChild size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label="Åbn virksomhedens side">
          <Link to={`/b/${b.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </div>
  );
};