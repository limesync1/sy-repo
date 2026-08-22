import { useMemo, useState } from "react";
import { Copy, Check, Download, X } from "lucide-react";
import type { Conversation, Message } from "./shared";
import { buildTranscript, downloadTranscript } from "./exportConversation";

type Props = {
  active: Conversation;
  messages: Message[];
  onClose: () => void;
};

/**
 * Fuld chatlog i læsbar form — så kundeservice hurtigt kan se hele
 * AI-dialogen når en samtale er eskaleret til et menneske. Loggen kan
 * kopieres til udklipsholder (fx til en mail eller en sag) eller hentes
 * som .txt via den eksisterende eksport.
 */
export default function TranscriptDialog({ active, messages, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const escalation = useMemo(
    () => messages.find((m) => m.is_system && m.metadata?.kind === "escalation"),
    [messages],
  );
  const aiCount = useMemo(
    () => messages.filter((m) => m.metadata?.kind === "ai").length,
    [messages],
  );

  const text = useMemo(() => buildTranscript(active, messages), [active, messages]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsere uden clipboard-API (fx usikker kontekst).
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Chatlog"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Chatlog — {active.visitor_name}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {messages.filter((m) => !m.is_system).length} beskeder · {aiCount} AI-svar
              {escalation ? " · eskaleret til medarbejder" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Luk"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {escalation?.metadata?.reason && (
          <div className="border-b border-border bg-accent-soft/40 px-5 py-2 text-[11px] text-foreground">
            Årsag til eskalering: {escalation.metadata.reason}
          </div>
        )}

        <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words px-5 py-4 font-mono text-[11.5px] leading-relaxed text-foreground">
          {text}
        </pre>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/40 px-5 py-3">
          <button
            onClick={() => downloadTranscript(active, messages)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary"
          >
            <Download className="mr-1 inline h-3 w-3" /> Hent .txt
          </button>
          <button
            onClick={copy}
            className="rounded-lg bg-foreground px-3 py-1.5 text-[11px] font-semibold text-background hover:opacity-90"
          >
            {copied ? (
              <><Check className="mr-1 inline h-3 w-3" /> Kopieret</>
            ) : (
              <><Copy className="mr-1 inline h-3 w-3" /> Kopiér log</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
