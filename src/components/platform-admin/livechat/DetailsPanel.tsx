import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { Mail, MessageCircle, Clock, User, Zap } from "lucide-react";
import type { Conversation, Message } from "./shared";
import { initials } from "./shared";

type Props = {
  active: Conversation;
  messages: Message[];
  onOpenCannedManager: () => void;
};

/** Højre info-panel — viser metadata + genvej til canned-administration. */
export default function DetailsPanel({ active, messages, onOpenCannedManager }: Props) {
  return (
    <div className="hidden flex-col overflow-hidden rounded-2xl border border-border bg-card lg:flex">
      <div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold text-foreground">Detaljer</h3></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-2 border-b border-border pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-base font-semibold text-background">{initials(active.visitor_name)}</div>
          <p className="text-sm font-semibold text-foreground">{active.visitor_name}</p>
          {active.user_id ? (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">Registreret bruger</span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Gæst</span>
          )}
          {active.status === "closed" && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Lukket</span>
          )}
        </div>
        <div className="space-y-2.5 text-xs">
          <div>
            <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><Mail className="h-3 w-3" /> Email</p>
            <a href={`mailto:${active.visitor_email}`} className="break-all text-foreground hover:text-accent">{active.visitor_email}</a>
          </div>
          {active.subject && (
            <div>
              <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><MessageCircle className="h-3 w-3" /> Emne</p>
              <p className="text-foreground">{active.subject}</p>
            </div>
          )}
          <div>
            <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><Clock className="h-3 w-3" /> Startet</p>
            <p className="text-foreground">{formatDistanceToNow(new Date(active.created_at), { locale: da, addSuffix: true })}</p>
          </div>
          <div>
            <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><User className="h-3 w-3" /> Beskeder</p>
            <p className="text-foreground">{messages.filter((m) => !m.is_system).length} i alt</p>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <button onClick={onOpenCannedManager}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-card">
            <Zap className="h-3 w-3" /> Administrér hurtige svar
          </button>
        </div>
      </div>
    </div>
  );
}