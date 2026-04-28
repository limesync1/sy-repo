// BusinessLiveChatTab — virksomhedens egen indbakke for samtaler startet
// fra deres offentlige side. Bruger samme designsprog som platform-admin
// versionen, men er filtreret på business_id og uden canned responses.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Send, Loader2, Search, User, Mail, Inbox, Archive,
  Paperclip, Image as ImageIcon, X as XIcon, Volume2, VolumeX, CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import chatSounds from "@/components/livechat/chatSounds";
import { PageHeader } from "@/components/admin/shared/AdminUI";

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

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";

type Filter = "all" | "open" | "unread" | "closed";

const BusinessLiveChatTab = ({ businessId, businessName }: { businessId: string; businessName: string }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [adminName, setAdminName] = useState(businessName);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(chatSounds.isMuted());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMessagesLoad = useRef(true);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setAdminName(data.display_name);
    });
  }, [user]);

  // Conversation list — filtreret på business_id
  useEffect(() => {
    let isFirst = true;
    const load = () => {
      supabase
        .from("chat_conversations")
        .select("*")
        .eq("business_id", businessId)
        .order("last_message_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (!data) return;
          setConversations((prev) => {
            if (!isFirst) {
              for (const c of data as Conversation[]) {
                const old = prev.find((p) => p.id === c.id);
                if (!old || c.unread_admin_count > old.unread_admin_count) {
                  if (c.id !== activeId) chatSounds.incoming();
                  break;
                }
              }
            }
            isFirst = false;
            return data as Conversation[];
          });
        });
    };
    load();
    const channel = supabase
      .channel(`biz-admin-chat-${businessId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations", filter: `business_id=eq.${businessId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, activeId]);

  // Active conversation messages
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    initialMessagesLoad.current = true;
    supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setMessages(data as Message[]);
        initialMessagesLoad.current = false;
      });
    supabase.from("chat_conversations").update({ unread_admin_count: 0 }).eq("id", activeId).then(() => {});

    const channel = supabase
      .channel(`biz-admin-chat-msg-${activeId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
          if (!initialMessagesLoad.current) {
            if (next.is_system) chatSounds.system();
            else if (next.sender_type === "visitor") chatSounds.incoming();
          }
          if (next.sender_type === "visitor") {
            supabase.from("chat_conversations").update({ unread_admin_count: 0 }).eq("id", activeId).then(() => {});
          }
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (initialMessagesLoad.current || !userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: initialMessagesLoad.current ? "auto" : "smooth" });
    }
  }, [messages, activeId]);

  useEffect(() => {
    userScrolledUpRef.current = false;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [draft]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId]);

  const filtered = useMemo(() => {
    let list = conversations.filter((c) => {
      if (filter === "open" && c.status !== "open") return false;
      if (filter === "closed" && c.status !== "closed") return false;
      if (filter === "unread" && c.unread_admin_count <= 0) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.visitor_name.toLowerCase().includes(q) &&
            !c.visitor_email.toLowerCase().includes(q) &&
            !(c.subject || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at));
  }, [conversations, filter, search]);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_admin_count || 0), 0);

  const onPickImage = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) { setUploadError("Kun billeder kan vedhæftes"); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("Billedet må højst være 5 MB"); return; }
    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };
  const clearPendingImage = () => {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview);
    setPendingImage(null); setPendingImagePreview(null);
  };
  const uploadImage = async (file: File, conversationId: string): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${conversationId}/biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) { setUploadError("Kunne ikke uploade billedet"); return null; }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendReply = useCallback(async () => {
    if (!active || sending) return;
    if (active.status === "closed") return;
    const text = draft.trim().slice(0, 2000);
    if (!text && !pendingImage) return;
    setSending(true);
    let image_url: string | null = null;
    if (pendingImage) {
      image_url = await uploadImage(pendingImage, active.id);
      if (!image_url) { setSending(false); return; }
    }
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: active.id, sender_type: "admin", sender_name: adminName,
      content: text || null, image_url,
    });
    setSending(false);
    if (!error) { chatSounds.outgoing(); setDraft(""); clearPendingImage(); }
  }, [active, sending, draft, pendingImage, adminName]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeConversation = async (id: string) => {
    await supabase.from("chat_messages").insert({
      conversation_id: id, sender_type: "admin", sender_name: adminName,
      content: `${adminName} afsluttede samtalen`, is_system: true,
    });
    await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", id);
    chatSounds.system();
  };
  const reopenConversation = async (id: string) => {
    await supabase.from("chat_messages").insert({
      conversation_id: id, sender_type: "admin", sender_name: adminName,
      content: `${adminName} genåbnede samtalen`, is_system: true,
    });
    await supabase.from("chat_conversations").update({ status: "open" }).eq("id", id);
    chatSounds.tick();
  };

  const toggleMute = () => {
    const next = !muted; setMuted(next); chatSounds.setMuted(next);
    if (!next) chatSounds.tick();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live chat"
        description={`Samtaler startet fra din virksomhedsside${totalUnread > 0 ? ` · ${totalUnread} ulæst${totalUnread === 1 ? "" : "e"}` : ""}.`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Conversation list */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border p-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg navn, email, emne…"
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div className="flex gap-1 text-[11px]">
              {(["all", "open", "unread", "closed"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${
                    filter === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Alle" : f === "open" ? "Åbne" : f === "unread" ? "Ulæst" : "Lukkede"}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <Inbox className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Ingen samtaler endnu.
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors ${
                    activeId === c.id ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                    {initials(c.visitor_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{c.visitor_name}</span>
                      {c.unread_admin_count > 0 && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">{c.unread_admin_count}</span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{c.subject || c.visitor_email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.last_message_at), { locale: da, addSuffix: true })}
                      {c.status === "closed" && <span className="ml-1.5 text-muted-foreground">· Lukket</span>}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation pane */}
        <div className="flex h-[60vh] flex-col rounded-xl border border-border bg-card overflow-hidden">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Vælg en samtale fra listen.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {initials(active.visitor_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
                      <User className="h-3.5 w-3.5" /> {active.visitor_name}
                      {active.status === "closed" && (
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Lukket</span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${active.visitor_email}`} className="hover:underline">{active.visitor_email}</a>
                      {active.subject && <span className="ml-1 truncate">· {active.subject}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={toggleMute} title={muted ? "Slå lyd til" : "Slå lyd fra"}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground">
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  {active.status === "closed" ? (
                    <button onClick={() => reopenConversation(active.id)}
                      className="rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background hover:bg-foreground/90">
                      Genåbn
                    </button>
                  ) : (
                    <button onClick={() => closeConversation(active.id)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex items-center gap-1">
                      <Archive className="h-3 w-3" /> Afslut
                    </button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-secondary/20 px-4 py-4">
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
                      <div className={`flex max-w-[75%] flex-col ${mine ? "items-end" : "items-start"}`}>
                        <div className={`overflow-hidden rounded-2xl text-[13.5px] leading-snug shadow-sm ${
                          mine ? "rounded-br-sm bg-foreground text-background" : "rounded-bl-sm border border-border bg-card text-foreground"
                        }`}>
                          {m.image_url && (
                            <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                              <img src={m.image_url} alt="Vedhæftet" className="max-h-64 w-auto object-cover" />
                            </a>
                          )}
                          {m.content && <div className="whitespace-pre-wrap break-words px-3.5 py-2">{m.content}</div>}
                        </div>
                        <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground ${mine ? "flex-row-reverse" : ""}`}>
                          <span>{formatTime(m.created_at)}</span>
                          {mine && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {active.status === "closed" ? (
                <div className="border-t border-border bg-card p-3 text-center text-xs text-muted-foreground">
                  Samtalen er lukket. Genåbn for at svare.
                </div>
              ) : (
                <div className="border-t border-border bg-card p-3">
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
                      maxLength={2000} rows={1} placeholder="Skriv et svar…"
                      className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                    <button onClick={() => sendReply()} disabled={sending || (!draft.trim() && !pendingImage)} aria-label="Send"
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Enter sender · Shift+Enter for ny linje · max 5 MB billede</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessLiveChatTab;