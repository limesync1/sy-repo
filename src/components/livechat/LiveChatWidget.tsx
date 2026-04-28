import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { z } from "zod";

/**
 * Livechat — flydende widget i nederste højre hjørne.
 * - Skjult i admin/medarbejder/virksomhedspanel/route-planner.
 * - Forskubber sig automatisk hvis CartFab/CartSheet er aktiv (kurv = ikke tom på virksomhedsside).
 * - Gæster udfylder navn + email + valgfrit emne. Logget-ind får navn/email forudfyldt.
 * - Sessionen huskes via localStorage så samtalen overlever refresh.
 */

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  session_token: string;
  visitor_name: string;
  visitor_email: string;
  subject: string | null;
  status: string;
};

const STORAGE_KEY = "serviceydere_chat_session_v1";

const startSchema = z.object({
  name: z.string().trim().min(1, "Indtast dit navn").max(80),
  email: z.string().trim().email("Ugyldig email").max(160),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Skriv en besked").max(2000),
});

const HIDDEN_PREFIXES = [
  "/admin",
  "/virksomhed",
  "/medarbejder",
  "/godkend-bestilling",
];

const LiveChatWidget = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { count: cartCount, sheetOpen: cartSheetOpen } = useCart();

  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);

  // Form for guests
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = useMemo(
    () => HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)),
    [pathname],
  );

  // Pre-fill from logged-in user's profile
  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setName(data.display_name);
      });
  }, [user]);

  // Restore session
  useEffect(() => {
    if (hidden) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const { token } = JSON.parse(raw) as { token: string };
      if (!token) return;
      supabase
        .from("chat_conversations")
        .select("id, session_token, visitor_name, visitor_email, subject, status")
        .eq("session_token", token)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setConversation(data as Conversation);
          else localStorage.removeItem(STORAGE_KEY);
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [hidden]);

  // Load messages + subscribe to realtime when conversation exists
  useEffect(() => {
    if (!conversation) return;

    let cancelled = false;
    supabase
      .from("chat_messages")
      .select("id, conversation_id, sender_type, sender_name, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setMessages(data as ChatMessage[]);
      });

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as ChatMessage;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  // Auto-scroll
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const startConversation = async () => {
    setError(null);
    const parsed = startSchema.safeParse({
      name,
      email,
      subject,
      message: firstMessage,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      setError(first || "Tjek felterne");
      return;
    }
    setStarting(true);
    try {
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const { data: conv, error: cErr } = await supabase
        .from("chat_conversations")
        .insert({
          session_token: token,
          user_id: user?.id ?? null,
          visitor_name: parsed.data.name,
          visitor_email: parsed.data.email,
          subject: parsed.data.subject || null,
        })
        .select("id, session_token, visitor_name, visitor_email, subject, status")
        .single();
      if (cErr || !conv) throw cErr || new Error("Kunne ikke oprette samtale");

      const { error: mErr } = await supabase.from("chat_messages").insert({
        conversation_id: conv.id,
        sender_type: "visitor",
        sender_name: parsed.data.name,
        content: parsed.data.message,
      });
      if (mErr) throw mErr;

      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token }));
      setConversation(conv as Conversation);
      setFirstMessage("");
      setSubject("");

      // Notify admin via email (fire-and-forget)
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "new-chat-message",
            recipientEmail: "kontakt@serviceydere.dk",
            idempotencyKey: `chat-start-${conv.id}`,
            templateData: {
              visitorName: parsed.data.name,
              visitorEmail: parsed.data.email,
              subject: parsed.data.subject || "",
              message: parsed.data.message,
              isLoggedIn: !!user,
            },
          },
        })
        .catch(() => {/* non-blocking */});
    } catch (e: any) {
      setError(e?.message || "Kunne ikke starte chatten. Prøv igen.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || !draft.trim() || sending) return;
    const content = draft.trim().slice(0, 2000);
    setSending(true);
    const { error: mErr } = await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      sender_type: "visitor",
      sender_name: conversation.visitor_name,
      content,
    });
    setSending(false);
    if (!mErr) setDraft("");
  };

  const endChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConversation(null);
    setMessages([]);
    setFirstMessage("");
    setOpen(false);
  };

  if (hidden) return null;

  // Smart placement: if CartFab is visible (cart has items, sheet closed, on allowed page),
  // shift our button to the LEFT side to avoid overlap.
  const cartFabVisible =
    cartCount > 0 &&
    !cartSheetOpen &&
    (pathname.startsWith("/v/") || pathname === "/demo" || pathname === "/tilbud");

  const fabPositionClass = cartFabVisible
    ? "right-[170px] sm:right-[190px]"
    : "right-5 sm:right-6";

  return (
    <>
      {/* Launcher button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Åbn livechat"
          className={`fixed bottom-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-[0_18px_40px_-16px_hsl(var(--accent)/0.55)] transition-all hover:bg-accent/90 hover:shadow-[0_22px_50px_-16px_hsl(var(--accent)/0.6)] active:scale-95 sm:bottom-6 ${fabPositionClass}`}
        >
          <MessageCircle className="h-4 w-4" />
          <span>Chat med os</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className={`fixed bottom-5 z-50 w-[calc(100vw-2.5rem)] max-w-[380px] sm:bottom-6 ${fabPositionClass}`}>
          <div className="flex h-[560px] max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 bg-foreground px-4 py-3 text-background">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">Serviceydere support</p>
                  <p className="text-[11px] text-background/60 leading-tight">
                    Vi svarer typisk inden for få minutter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Luk chat"
                className="rounded-md p-1 text-background/70 hover:bg-background/10 hover:text-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            {!conversation ? (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <p className="text-sm text-muted-foreground">
                  Hej! Skriv kort hvad det handler om, så hjælper vi dig hurtigst muligt.
                </p>
                <label className="text-xs font-medium text-foreground">
                  Navn
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="Dit navn"
                  />
                </label>
                <label className="text-xs font-medium text-foreground">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={160}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="dig@eksempel.dk"
                  />
                </label>
                <label className="text-xs font-medium text-foreground">
                  Hvad handler det om? <span className="font-normal text-muted-foreground">(valgfrit)</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={120}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="F.eks. priser, support, tilbud"
                  />
                </label>
                <label className="text-xs font-medium text-foreground">
                  Din besked
                  <textarea
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="Skriv din besked…"
                  />
                </label>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  onClick={startConversation}
                  disabled={starting}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Start chat
                </button>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-secondary/40 p-4">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground">Ingen beskeder endnu.</p>
                  )}
                  {messages.map((m) => {
                    const mine = m.sender_type === "visitor";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                            mine
                              ? "rounded-br-sm bg-foreground text-background"
                              : "rounded-bl-sm bg-card text-foreground border border-border"
                          }`}
                        >
                          {!mine && (
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                              {m.sender_name}
                            </p>
                          )}
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border bg-card p-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      maxLength={2000}
                      rows={1}
                      placeholder="Skriv en besked…"
                      className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      aria-label="Send"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    onClick={endChat}
                    className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Afslut samtale
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChatWidget;