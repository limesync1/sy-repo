import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Send, Loader2, ChevronDown, CheckCheck, Paperclip, X as XIcon, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { z } from "zod";

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string | null;
  image_url?: string | null;
  is_system?: boolean;
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

// Use trailing slash so /virksomheder (search page) is NOT matched
const HIDDEN_PREFIXES = ["/admin", "/virksomhed/", "/medarbejder", "/godkend-bestilling"];
const HIDDEN_EXACT = ["/virksomhed"];

const QUICK_TOPICS = [
  { label: "Pris og pakker", subject: "Pris og pakker" },
  { label: "Hjælp med bestilling", subject: "Hjælp med bestilling" },
  { label: "Bliv virksomhed", subject: "Bliv virksomhed på Serviceydere" },
  { label: "Andet spørgsmål", subject: "" },
];

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "S";

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
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hidden = useMemo(
    () =>
      HIDDEN_EXACT.includes(pathname) ||
      HIDDEN_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p)),
    [pathname],
  );

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setName(data.display_name);
    });
  }, [user]);

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

  useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    supabase
      .from("chat_messages")
      .select("id, conversation_id, sender_type, sender_name, content, image_url, is_system, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setMessages(data as ChatMessage[]);
      });

    supabase.from("chat_conversations").update({ unread_visitor_count: 0 }).eq("id", conversation.id).then(() => {});

    const msgChannel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as ChatMessage;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    const convChannel = supabase
      .channel(`chat-conv-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_conversations", filter: `id=eq.${conversation.id}` },
        (payload) => {
          const next = payload.new as any;
          setConversation((prev) => (prev ? { ...prev, status: next.status } : prev));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(convChannel);
    };
  }, [conversation]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [draft]);

  const onPickImage = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Kun billeder kan vedhæftes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Billedet må højst være 5 MB");
      return;
    }
    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  const clearPendingImage = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null);
    setPendingImagePreview(null);
  };

  const uploadImage = async (file: File, conversationId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (upErr) {
      setUploadError("Kunne ikke uploade billedet");
      return null;
    }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const startConversation = async () => {
    setError(null);
    const parsed = startSchema.safeParse({ name, email, subject, message: firstMessage });
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
        .catch(() => {});
    } catch (e: any) {
      setError(e?.message || "Kunne ikke starte chatten. Prøv igen.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!conversation || sending) return;
    if (!draft.trim() && !pendingImage) return;
    if (conversation.status === "closed") return;

    setSending(true);
    let image_url: string | null = null;
    if (pendingImage) {
      image_url = await uploadImage(pendingImage, conversation.id);
      if (!image_url) {
        setSending(false);
        return;
      }
    }
    const content = draft.trim().slice(0, 2000) || null;
    const { error: mErr } = await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      sender_type: "visitor",
      sender_name: conversation.visitor_name,
      content,
      image_url,
    });
    setSending(false);
    if (!mErr) {
      setDraft("");
      clearPendingImage();
    }
  };

  const endChatSession = async () => {
    if (!conversation) return;
    // Insert system message + close conversation
    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      sender_type: "visitor",
      sender_name: conversation.visitor_name,
      content: `${conversation.visitor_name} afsluttede samtalen`,
      is_system: true,
    });
    await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", conversation.id);
    localStorage.removeItem(STORAGE_KEY);
    setConversation(null);
    setMessages([]);
    setFirstMessage("");
    setOpen(false);
  };

  if (hidden) return null;

  const cartFabVisible =
    cartCount > 0 &&
    !cartSheetOpen &&
    (pathname.startsWith("/v/") || pathname === "/demo" || pathname === "/tilbud");

  const fabPositionClass = cartFabVisible ? "right-[170px] sm:right-[190px]" : "right-5 sm:right-6";

  const unreadAdmin = messages.some((m) => m.sender_type === "admin") && !open;
  const closed = conversation?.status === "closed";

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Åbn livechat"
          className={`group fixed bottom-5 z-40 flex items-center gap-2.5 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background shadow-[0_18px_40px_-16px_hsl(var(--foreground)/0.45)] ring-1 ring-foreground/10 transition-all hover:bg-foreground/95 hover:shadow-[0_22px_50px_-16px_hsl(var(--foreground)/0.55)] active:scale-95 sm:bottom-6 ${fabPositionClass}`}
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-foreground"></span>
            </span>
          </span>
          <span>Chat med os</span>
          {unreadAdmin && (
            <span className="ml-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
              Nyt
            </span>
          )}
        </button>
      )}

      {open && (
        <div className={`fixed bottom-5 z-50 w-[calc(100vw-2.5rem)] max-w-[400px] sm:bottom-6 ${fabPositionClass}`}>
          <div className="flex h-[600px] max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_30px_80px_-20px_hsl(var(--foreground)/0.35)]">
            <div className="relative overflow-hidden bg-foreground px-5 pb-5 pt-4 text-background">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/10 ring-1 ring-background/20 backdrop-blur">
                      <MessageCircle className="h-4 w-4 text-background" />
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-foreground ${closed ? "bg-muted-foreground" : "bg-accent"}`}>
                      {!closed && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-background" />}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight">Serviceydere support</p>
                    <p className="mt-0.5 text-[11px] text-background/65">
                      {closed ? "Samtalen er afsluttet" : "Online · svar inden for få minutter"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Luk chat"
                  className="rounded-md p-1.5 text-background/70 transition-colors hover:bg-background/10 hover:text-background"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!conversation ? (
              <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-5">
                <div className="rounded-2xl border border-border bg-secondary/40 p-3.5">
                  <p className="text-[13px] leading-relaxed text-foreground">
                    👋 Hej! Vi sidder klar og hjælper med priser, bestilling og spørgsmål om platformen.
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vælg et emne</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TOPICS.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setSubject(t.subject)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          subject === t.subject
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:border-foreground/40"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Navn
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                      placeholder="Dit navn"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Email
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                      placeholder="dig@eksempel.dk"
                    />
                  </label>
                </div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Din besked
                  <textarea
                    value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} maxLength={2000} rows={4}
                    className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                    placeholder="Skriv din besked…"
                  />
                </label>
                {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
                <button
                  onClick={startConversation} disabled={starting}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition-all hover:bg-foreground/90 disabled:opacity-60"
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Start samtale
                </button>
                <p className="text-center text-[10px] text-muted-foreground">
                  Vi bruger kun din email til at svare på din henvendelse.
                </p>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-4 py-4">
                  <div className="mx-auto max-w-[85%] rounded-full bg-card px-3 py-1 text-center text-[10px] text-muted-foreground shadow-sm">
                    Samtale startet · {formatTime(messages[0]?.created_at || new Date().toISOString())}
                  </div>

                  {messages.map((m, i) => {
                    if (m.is_system) {
                      return (
                        <div key={m.id} className="flex justify-center">
                          <span className="rounded-full bg-card px-3 py-1 text-[10px] text-muted-foreground shadow-sm">
                            {m.content} · {formatTime(m.created_at)}
                          </span>
                        </div>
                      );
                    }
                    const mine = m.sender_type === "visitor";
                    const prev = messages[i - 1];
                    const showAvatar = !mine && (!prev || prev.sender_type !== m.sender_type || prev.is_system);
                    let lastVisitorIdx = -1;
                    for (let j = messages.length - 1; j >= 0; j--) {
                      if (messages[j].sender_type === "visitor" && !messages[j].is_system) { lastVisitorIdx = j; break; }
                    }
                    const isLastMine = mine && i === lastVisitorIdx;
                    return (
                      <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <div className="w-7 flex-shrink-0">
                            {showAvatar && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                                {initials(m.sender_name)}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                          <div
                            className={`overflow-hidden rounded-2xl text-[13.5px] leading-snug shadow-sm ${
                              mine
                                ? "rounded-br-sm bg-foreground text-background"
                                : "rounded-bl-sm border border-border bg-card text-foreground"
                            }`}
                          >
                            {m.image_url && (
                              <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={m.image_url} alt="Vedhæftet billede" className="max-h-64 w-auto object-cover" />
                              </a>
                            )}
                            {m.content && (
                              <div className="whitespace-pre-wrap break-words px-3.5 py-2">{m.content}</div>
                            )}
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

                {closed ? (
                  <div className="border-t border-border bg-card p-4 text-center">
                    <p className="text-xs text-muted-foreground">Samtalen er afsluttet.</p>
                    <button
                      onClick={() => { localStorage.removeItem(STORAGE_KEY); setConversation(null); setMessages([]); }}
                      className="mt-2 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      Start en ny samtale
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-border bg-card px-3 py-2.5">
                    {pendingImagePreview && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
                        <img src={pendingImagePreview} alt="Forhåndsvisning" className="h-12 w-12 rounded object-cover" />
                        <span className="flex-1 truncate text-[11px] text-muted-foreground">
                          <ImageIcon className="mr-1 inline h-3 w-3" />{pendingImage?.name}
                        </span>
                        <button onClick={clearPendingImage} className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground">
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {uploadError && <p className="mb-1.5 text-[11px] text-destructive">{uploadError}</p>}
                    <div className="flex items-end gap-2">
                      <input
                        ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                        aria-label="Vedhæft billede"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </button>
                      <textarea
                        ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        maxLength={2000} rows={1} placeholder="Skriv en besked…"
                        className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                      />
                      <button
                        onClick={sendMessage} disabled={sending || (!draft.trim() && !pendingImage)} aria-label="Send"
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="text-[10px] text-muted-foreground">Enter sender · max 5 MB billede</span>
                      <button onClick={endChatSession} className="text-[10px] text-muted-foreground transition-colors hover:text-foreground">
                        Afslut samtale
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChatWidget;
