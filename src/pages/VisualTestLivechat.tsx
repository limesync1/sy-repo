import { useEffect, useState } from "react";
import {
  MessageCircle, Send, Paperclip, CheckCheck, ChevronDown,
  Volume2, MoreVertical, X as XIcon,
} from "lucide-react";

/**
 * Visual regression fixture for livechat-widgetens synlige elementer.
 * Mounter en STATISK kopi af LiveChatWidget'ens layout (header med
 * hero-gradient, beskedboble for "mig" og "dem", afsluttet-tilstand,
 * foreslåede svar, input-bar med Paperclip/Send) i ét visningsvindue
 * så Playwright kan snapshotte både light og dark mode uden at skulle
 * mocke Supabase-data.
 *
 * Reglerne, vi vil regression-teste:
 *  - "mine" bobler (`bg-foreground text-background`) er læsbare i dark mode
 *  - Send-knappen har synlig kontrast i dark mode
 *  - Header-ikoner (Volume2, MoreVertical, ChevronDown) er synlige på
 *    den mørke hero-baggrund i begge temaer
 *  - "Samtalen er afsluttet"-kort har korrekt kontrast
 *  - Foreslåede svar-chips kan ses + hover
 *  - Inbox-list rækker (avatar + tekst) kontrast
 */
export default function VisualTestLivechat() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const mode = params.get("mode") ?? "light";
  const view = params.get("view") ?? "chat"; // "chat" | "closed" | "inbox"

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode === "dark" ? "dark" : "light");
    const style = document.createElement("style");
    style.id = "vt-livechat-no-motion";
    style.textContent = `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [mode]);

  // Trigge en re-render efter mount så portals (popover/dropdown) er klar
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => force((n) => n + 1), 50);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-background p-8 flex justify-center" data-testid="visual-test-root">
      <div
        data-testid="livechat-shell"
        className="relative flex h-[640px] w-[380px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        {/* ── Header (hero) ── */}
        <div
          data-testid="livechat-header"
          className="relative shrink-0 overflow-hidden px-4 py-4 text-white"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--hero-bg)) 0%, hsl(var(--hero-mid)) 100%)",
          }}
        >
          <div className="relative flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <span className="text-white text-base font-bold">S</span>
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-tight">Serviceydere Kundeservice</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Vi svarer typisk inden 5 minutter.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                data-testid="header-more"
                aria-label="Flere handlinger"
                className="rounded-md p-1.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              <button
                data-testid="header-volume"
                aria-label="Slå lyd fra"
                className="rounded-md p-1.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                data-testid="header-close"
                aria-label="Luk chat"
                className="rounded-md p-1.5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Beskeder ── */}
        {view === "chat" && (
          <div className="flex-1 overflow-y-auto bg-card p-3 space-y-3" data-testid="livechat-messages">
            {/* Modtaget */}
            <div className="flex items-end gap-2 justify-start">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-[11px] font-semibold text-foreground">
                SY
              </span>
              <div className="flex max-w-[78%] flex-col items-start">
                <div className="mb-1 px-1 text-[10px] font-semibold text-foreground/80">Serviceydere</div>
                <div
                  data-testid="bubble-them"
                  className="overflow-hidden rounded-2xl rounded-bl-md border border-border bg-card text-foreground text-[13.5px] leading-snug shadow-[0_2px_6px_-2px_hsl(var(--foreground)/0.08)]"
                >
                  <div className="whitespace-pre-wrap break-words px-3.5 py-2">
                    Hej! Hvad kan vi hjælpe med i dag?
                  </div>
                </div>
                <div className="mt-1 px-1 text-[10px] text-muted-foreground">14:02</div>
              </div>
            </div>
            {/* Mig */}
            <div className="flex items-end gap-2 justify-end">
              <div className="flex max-w-[78%] flex-col items-end">
                <div
                  data-testid="bubble-mine"
                  className="overflow-hidden rounded-2xl rounded-br-md bg-foreground text-background text-[13.5px] leading-snug shadow-[0_2px_6px_-2px_hsl(var(--foreground)/0.08)]"
                >
                  <div className="whitespace-pre-wrap break-words px-3.5 py-2">
                    Jeg vil gerne booke en rengøring til fredag.
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground flex-row-reverse">
                  <span>14:03</span>
                  <CheckCheck className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "closed" && (
          <div className="flex-1 bg-card">
            <div className="border-t border-border bg-gradient-to-b from-card to-secondary/30 p-5 text-center" data-testid="closed-card">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <CheckCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-semibold text-foreground">Samtalen er afsluttet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Tak fordi du skrev til os. Du kan altid starte en ny samtale.</p>
              <button
                data-testid="closed-newchat"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-[0_8px_22px_-12px_hsl(var(--foreground)/0.6)] transition-all hover:bg-foreground/90"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Start en ny samtale
              </button>
            </div>
          </div>
        )}

        {view === "inbox" && (
          <div className="flex-1 overflow-y-auto bg-card" data-testid="livechat-inbox">
            <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-3">
              <button
                aria-label="Tilbage"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-foreground">Mine samtaler</p>
            </div>
            {[
              { name: "Rent Hus ApS", last: "Tak — vi sender en pris i morgen.", time: "12:40", unread: 2 },
              { name: "Vinduespudser-Nord", last: "Hej! Har du tid i næste uge?", time: "i går", unread: 0 },
              { name: "Have & Service", last: "Perfekt, vi ses fredag.", time: "ma.", unread: 0 },
            ].map((row) => (
              <button
                key={row.name}
                className="flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-secondary/50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-semibold">
                  {row.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{row.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{row.last}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">{row.time}</span>
                  {row.unread > 0 && (
                    <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                      {row.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Foreslåede svar + input ── */}
        {view === "chat" && (
          <>
            <div className="border-t border-border bg-card px-3 py-2.5" data-testid="suggested-replies">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Foreslåede svar</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["Få et tilbud", "Åbningstider", "Tak"].map((r) => (
                  <button
                    key={r}
                    data-testid={`reply-${r}`}
                    className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-all hover:-translate-y-px hover:border-accent/40 hover:bg-card hover:text-accent"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm" data-testid="input-bar">
              <div className="flex items-end gap-2">
                <button
                  data-testid="attach-btn"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-secondary/40 hover:text-foreground"
                  aria-label="Vedhæft billede"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  rows={1}
                  placeholder="Skriv en besked…"
                  className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                />
                <button
                  data-testid="send-btn"
                  aria-label="Send"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-[0_6px_18px_-8px_hsl(var(--foreground)/0.6)] transition-all hover:bg-foreground/90 disabled:opacity-50 disabled:shadow-none"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <span className="text-[10px] text-muted-foreground">Enter sender · max 5 MB billede</span>
                <button className="text-[10px] text-muted-foreground transition-colors hover:text-destructive">
                  Slet samtale
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}