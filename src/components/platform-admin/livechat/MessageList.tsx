import { forwardRef } from "react";
import { CheckCheck, Sparkles } from "lucide-react";
import type { Message } from "./shared";
import { formatTime, initials } from "./shared";

type Props = { messages: Message[]; onContentLoad?: () => void };

/**
 * Scrollende beskedliste — wraps messages og rendrer dem som boble-tråd.
 * `forwardRef` så orkestratoren kan styre auto-scroll og "user scrolled up".
 */
const MessageList = forwardRef<HTMLDivElement, Props>(function MessageList({ messages, onContentLoad }, ref) {
  let lastAdminIdx = -1;
  for (let j = messages.length - 1; j >= 0; j--) {
    if (messages[j].sender_type === "admin" && !messages[j].is_system) { lastAdminIdx = j; break; }
  }
  return (
    <div ref={ref} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-5 py-5 scroll-smooth">
      {messages.map((m, i) => {
        if (m.is_system) {
          return (
            <div key={m.id} className="flex justify-center animate-in fade-in duration-200">
              <span className="rounded-full bg-card px-3 py-1 text-[10px] text-muted-foreground shadow-sm">
                {m.content} · {formatTime(m.created_at)}
              </span>
            </div>
          );
        }
        const mine = m.sender_type === "admin";
        const isAi = m.metadata?.kind === "ai";
        const prev = messages[i - 1];
        const showAvatar = !mine && (!prev || prev.sender_type !== m.sender_type || prev.is_system);
        const isLastMine = mine && i === lastAdminIdx;
        return (
          <div key={m.id} className={`flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200 ${mine ? "justify-end" : "justify-start"}`}>
            {!mine && (
              <div className="w-7 flex-shrink-0">
                {showAvatar && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                    {initials(m.sender_name)}
                  </div>
                )}
              </div>
            )}
            <div className={`flex max-w-[70%] flex-col ${mine ? "items-end" : "items-start"}`}>
              {isAi && (
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-accent-foreground">
                  <Sparkles className="h-2.5 w-2.5" /> AI-svar
                </span>
              )}
              <div className={`overflow-hidden rounded-2xl text-[13.5px] leading-snug shadow-sm ${
                mine
                  ? isAi
                    ? "rounded-br-sm border border-accent/40 bg-accent-soft text-foreground"
                    : "rounded-br-sm bg-foreground text-background"
                  : "rounded-bl-sm border border-border bg-card text-foreground"
              }`}>

                {m.image_url && (
                  <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={m.image_url} alt="Vedhæftet billede" onLoad={onContentLoad} className="max-h-72 w-auto object-cover" />
                  </a>
                )}
                {m.content && <div className="whitespace-pre-wrap break-words px-3.5 py-2">{m.content}</div>}
              </div>
              <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground ${mine ? "flex-row-reverse" : ""}`}>
                <span>{formatTime(m.created_at)}</span>
                {isLastMine && <CheckCheck className="h-3 w-3" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
export default MessageList;