import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageCircle, Send, Loader2, CheckCircle2, Search, Zap, User, Mail, Clock,
  Plus, Trash2, X, CheckCheck, Inbox, Archive, Paperclip, Image as ImageIcon, X as XIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

type Conversation = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_admin_count: number;
  user_id: string | null;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string | null;
  image_url?: string | null;
  is_system?: boolean;
  created_at: string;
};

type CannedResponse = { id: string; title: string; body: string };

const CANNED_KEY = "serviceydere_admin_canned_v1";

const DEFAULT_CANNED: CannedResponse[] = [
  { id: "greeting", title: "Velkomst", body: "Hej {name} 👋\n\nTusind tak for din henvendelse! Hvordan kan jeg hjælpe dig?" },
  { id: "pricing", title: "Priser", body: "Hej {name},\n\nVores priser starter ved 199 kr./md. og afhænger af hvilke moduler I vælger. Du kan se en fuld oversigt på serviceydere.dk/priser eller jeg sender gerne et tilbud — hvor mange medarbejdere har I?" },
  { id: "callback", title: "Ring tilbage", body: "Hej {name},\n\nJeg vil meget gerne ringe dig op. Hvilket tidspunkt passer dig bedst i dag?" },
  { id: "thanks-close", title: "Tak & afslut", body: "Tak for snakken {name}! Skriv endelig igen hvis du har flere spørgsmål. God dag 🌿" },
];

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

type Filter = "all" | "open" | "unread" | "closed";

const PlatformLiveChatTab = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [adminName, setAdminName] = useState("Support");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [canned, setCanned] = useState<CannedResponse[]>(DEFAULT_CANNED);
  const [showCannedManager, setShowCannedManager] = useState(false);
  const [newCannedTitle, setNewCannedTitle] = useState("");
  const [newCannedBody, setNewCannedBody] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CANNED_KEY);
      if (raw) setCanned(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(CANNED_KEY, JSON.stringify(canned));
  }, [canned]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setAdminName(data.display_name);
    });
  }, [user]);

  useEffect(() => {
    const load = () => {
      supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (data) setConversations(data as Conversation[]);
        });
    };
    load();
    const channel = supabase
      .channel("admin-chat-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setMessages(data as Message[]);
      });
    supabase.from("chat_conversations").update({ unread_admin_count: 0 }).eq("id", activeId).then(() => {});

    const channel = supabase
      .channel(`admin-chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, activeId]);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [draft]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === "open" && c.status !== "open") return false;
      if (filter === "closed" && c.status !== "closed") return false;
      if (filter === "unread" && c.unread_admin_count <= 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.visitor_name.toLowerCase().includes(q) && !c.visitor_email.toLowerCase().includes(q) && !(c.subject || "").toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [conversations, filter, search]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_admin_count || 0), 0);

  const onPickImage = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) { setUploadError("Kun billeder kan vedhæftes"); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("Billedet må højst være 5 MB"); return; }
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
    const path = `${conversationId}/admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) { setUploadError("Kunne ikke uploade billedet"); return null; }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendReply = async (contentOverride?: string) => {
    if (!active || sending) return;
    if (active.status === "closed") return;
    const text = (contentOverride ?? draft).trim().slice(0, 2000);
    if (!text && !pendingImage) return;

    setSending(true);
    let image_url: string | null = null;
    if (pendingImage && contentOverride === undefined) {
      image_url = await uploadImage(pendingImage, active.id);
      if (!image_url) { setSending(false); return; }
    }
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: active.id,
      sender_type: "admin",
      sender_name: adminName,
      content: text || null,
      image_url,
    });
    setSending(false);
    if (!error) {
      if (contentOverride === undefined) {
        setDraft("");
        clearPendingImage();
      }
    }
  };

  const insertCanned = (c: CannedResponse) => {
    if (!active) return;
    const firstName = active.visitor_name.split(" ")[0] || active.visitor_name;
    const body = c.body.split("{name}").join(firstName);
    setDraft((prev) => (prev ? prev + "\n\n" + body : body));
    textareaRef.current?.focus();
  };

  const closeConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    await supabase.from("chat_messages").insert({
      conversation_id: id, sender_type: "admin", sender_name: adminName,
      content: `${adminName} afsluttede samtalen`, is_system: true,
    });
    await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", id);
  };
  const reopenConversation = async (id: string) => {
    await supabase.from("chat_messages").insert({
      conversation_id: id, sender_type: "admin", sender_name: adminName,
      content: `${adminName} genåbnede samtalen`, is_system: true,
    });
    await supabase.from("chat_conversations").update({ status: "open" }).eq("id", id);
  };

  const addCanned = () => {
    if (!newCannedTitle.trim() || !newCannedBody.trim()) return;
    setCanned((prev) => [...prev, { id: crypto.randomUUID(), title: newCannedTitle.trim(), body: newCannedBody.trim() }]);
    setNewCannedTitle(""); setNewCannedBody("");
  };
  const deleteCanned = (id: string) => setCanned((prev) => prev.filter((c) => c.id !== id));

  const visitorClosed =
    !!active && active.status === "closed" &&
    messages.length > 0 &&
    messages[messages.length - 1].is_system &&
    messages[messages.length - 1].sender_type === "visitor";

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-3 lg:grid-cols-[340px_1fr_300px]">
      {/* Indbakke */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Indbakke</h2>
              {totalUnread > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                  {totalUnread}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">{filtered.length}/{conversations.length}</span>
          </div>
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg i samtaler…"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-foreground"
            />
          </div>
          <div className="mt-2 flex gap-1">
            {(["all", "unread", "open", "closed"] as Filter[]).map((f) => (
              <button
                key={f} onClick={() => setFilter(f)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  filter === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "Alle" : f === "unread" ? "Ulæst" : f === "open" ? "Åbne" : "Lukket"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Ingen samtaler her.</p>
            </div>
          )}
          {filtered.map((c) => {
            const isActive = c.id === activeId;
            const isUnread = c.unread_admin_count > 0;
            return (
              <button
                key={c.id} onClick={() => setActiveId(c.id)}
                className={`flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors ${
                  isActive ? "bg-secondary" : "hover:bg-secondary/60"
                }`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isUnread ? "bg-foreground text-background" : "bg-secondary text-foreground border border-border"
                }`}>
                  {initials(c.visitor_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[13px] ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                      {c.visitor_name}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { locale: da, addSuffix: false })}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{c.subject || c.visitor_email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {c.user_id && <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success">Logget ind</span>}
                    {c.status === "closed" && (
                      <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Lukket
                      </span>
                    )}
                    {isUnread && (
                      <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                        {c.unread_admin_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <MessageCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Vælg en samtale</p>
            <p className="max-w-xs text-xs text-muted-foreground">Klik på en samtale fra indbakken for at se beskeder og svare.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">
                  {initials(active.visitor_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{active.visitor_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{active.subject || "Ingen emne"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowInfo((v) => !v)}
                  className="hidden rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary lg:block"
                >
                  {showInfo ? "Skjul info" : "Vis info"}
                </button>
                {active.status !== "closed" ? (
                  <button onClick={() => closeConversation(active.id)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary">
                    <Archive className="mr-1 inline h-3 w-3" /> Afslut
                  </button>
                ) : (
                  <button onClick={() => reopenConversation(active.id)} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary">
                    Genåbn
                  </button>
                )}
              </div>
            </div>

            {visitorClosed && (
              <div className="border-b border-border bg-accent-soft/40 px-5 py-2 text-center text-[11px] font-medium text-foreground">
                ⚠ Kunden afsluttede selv samtalen
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-5 py-5">
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
                const mine = m.sender_type === "admin";
                const prev = messages[i - 1];
                const showAvatar = !mine && (!prev || prev.sender_type !== m.sender_type || prev.is_system);
                const isLastMine = mine && (() => { for (let j = messages.length - 1; j >= 0; j--) { if (messages[j].sender_type === "admin" i === messages.findLastIndex((x) => x.sender_type === "admin" && !x.is_system)i === messages.findLastIndex((x) => x.sender_type === "admin" && !x.is_system) !messages[j].is_system) return j === i; } return false; })();
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
                    <div className={`flex max-w-[70%] flex-col ${mine ? "items-end" : "items-start"}`}>
                      <div className={`overflow-hidden rounded-2xl text-[13.5px] leading-snug shadow-sm ${
                        mine ? "rounded-br-sm bg-foreground text-background" : "rounded-bl-sm border border-border bg-card text-foreground"
                      }`}>
                        {m.image_url && (
                          <a href={m.image_url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={m.image_url} alt="Vedhæftet billede" className="max-h-72 w-auto object-cover" />
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

            {active.status === "closed" ? (
              <div className="border-t border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Samtalen er afsluttet. Genåbn for at svare igen.</p>
              </div>
            ) : (
              <>
                {canned.length > 0 && (
                  <div className="border-t border-border bg-card px-3 py-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      <Zap className="h-3 w-3 flex-shrink-0 text-accent" />
                      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Hurtige svar</span>
                      {canned.map((c) => (
                        <button key={c.id} onClick={() => insertCanned(c)}
                          className="flex-shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-card">
                          {c.title}
                        </button>
                      ))}
                      <button onClick={() => setShowCannedManager(true)} className="flex-shrink-0 rounded-full border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <Plus className="inline h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-border bg-card px-3 py-2.5">
                  {pendingImagePreview && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
                      <img src={pendingImagePreview} alt="" className="h-12 w-12 rounded object-cover" />
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
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }} />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      aria-label="Vedhæft billede">
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>
                    <textarea
                      ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      maxLength={2000} rows={1} placeholder={`Svar ${active.visitor_name.split(" ")[0]}…`}
                      className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                    />
                    <button onClick={() => sendReply()} disabled={sending || (!draft.trim() && !pendingImage)}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 disabled:opacity-50">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
                    Enter sender · Shift+Enter for ny linje · {"{name}"} erstattes automatisk
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Info-panel */}
      {active && showInfo && (
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
              <button onClick={() => setShowCannedManager(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-card">
                <Zap className="h-3 w-3" /> Administrér hurtige svar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCannedManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Hurtige svar</h3></div>
              <button onClick={() => setShowCannedManager(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {canned.map((c) => (
                <div key={c.id} className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{c.title}</p>
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] text-muted-foreground">{c.body}</p>
                  </div>
                  <button onClick={() => deleteCanned(c.id)} className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-border bg-secondary/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tilføj nyt — brug {"{name}"} som pladsholder</p>
              <input value={newCannedTitle} onChange={(e) => setNewCannedTitle(e.target.value)} placeholder="Titel (fx 'Pris')" maxLength={60}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground" />
              <textarea value={newCannedBody} onChange={(e) => setNewCannedBody(e.target.value)} placeholder="Tekst til svaret…" rows={3} maxLength={1000}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground" />
              <button onClick={addCanned} disabled={!newCannedTitle.trim() || !newCannedBody.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Tilføj svar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformLiveChatTab;
