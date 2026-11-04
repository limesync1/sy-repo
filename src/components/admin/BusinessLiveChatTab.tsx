import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { NoItemsIcon } from "@/components/shared/NoItemsIcon";
// BusinessLiveChatTab — virksomhedens egen indbakke for samtaler startet
// fra deres offentlige side. Bruger samme designsprog som platform-admin
// versionen, men er filtreret på business_id og uden canned responses.
import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Send, Loader2, Search, User, Mail, Inbox, Archive,
  Paperclip, Image as ImageIcon, X as XIcon, Volume2, VolumeX, CheckCheck,
  Clock, Zap, Calendar as CalendarIcon, BookText, Plus, Trash2, Pencil, UserPlus,
  Eye, X, ArrowLeft, ArrowDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { format as formatDate } from "date-fns";
import chatSounds from "@/components/livechat/chatSounds";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LiveChatStats from "@/components/livechat/LiveChatStats";
import { useConversationMessages } from "@/hooks/useConversationMessages";

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
  first_admin_reply_at?: string | null;
  closed_at?: string | null;
  assigned_employee_id?: string | null;
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

type Template = { id: string; title: string; content: string; sort_order: number };
type EmployeeOption = { id: string; name: string };

/** SLA-mål: 5 min — gul, 15 min — rød. */
const SLA_TARGET_MIN = 5;
const SLA_BREACH_MIN = 15;

const slaState = (c: Conversation): { label: string; tone: "ok" | "warn" | "breach" | "done" | "closed" } => {
  if (c.status === "closed") return { label: "Lukket", tone: "closed" };
  if (c.first_admin_reply_at) {
    const ms = +new Date(c.first_admin_reply_at) - +new Date(c.created_at);
    const min = Math.max(0, Math.round(ms / 60000));
    return { label: `Svaret på ${min} min`, tone: "done" };
  }
  const min = Math.floor((Date.now() - +new Date(c.created_at)) / 60000);
  if (min >= SLA_BREACH_MIN) return { label: `${min} min uden svar`, tone: "breach" };
  if (min >= SLA_TARGET_MIN) return { label: `${min} min uden svar`, tone: "warn" };
  return { label: `${min} min siden start`, tone: "ok" };
};

/**
 * Isoleret SLA-pill + relativ tid — har sin egen 30s tick så vi ikke
 * re-renderer hele 870-linjers chat-komponenten hvert halve minut.
 */
const ConversationMeta = memo(function ConversationMeta({ conversation }: { conversation: Conversation }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const sla = slaState(conversation);
  const slaClass =
    sla.tone === "breach" ? "bg-destructive/10 text-destructive" :
    sla.tone === "warn"   ? "bg-warning/15 text-foreground" :
    sla.tone === "done"   ? "bg-success/10 text-success" :
    sla.tone === "closed" ? "bg-muted text-muted-foreground" :
                            "bg-secondary text-muted-foreground";
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${slaClass}`} title="Svartid">
        <Clock className="h-2.5 w-2.5" />{sla.label}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(conversation.last_message_at), { locale: da, addSuffix: true })}
      </span>
    </div>
  );
});

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
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = activeId ? drafts[activeId] || "" : "";
  const setDraft = (next: string | ((old: string) => string)) => {
    if (!activeId) return;
    setDrafts(prev => ({ ...prev, [activeId]: typeof next === "function" ? next(prev[activeId] || "") : next }));
  };
  const [sending, setSending] = useState(false);
  // Navnet på afsender — vi bruger ALTID virksomhedens navn, både når
  // ejeren og en medarbejder svarer, så kunden ser ét konsistent afsendernavn.
  const [adminName, setAdminName] = useState(businessName);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(chatSounds.isMuted());
  const [dateFilter, setDateFilter] = useState<string>(""); // YYYY-MM-DD
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [tplDraft, setTplDraft] = useState<{ id?: string; title: string; content: string }>({ title: "", content: "" });
  const [previewTpl, setPreviewTpl] = useState<Template | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMessagesLoad = useRef(true);
  const userScrolledUpRef = useRef(false);
  // Vises som flydende "Hop til seneste"-knap når brugeren har scrollet
  // op i samtalen — matcher state'en på userScrolledUpRef.
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  // Tæller af nye beskeder modtaget mens brugeren har scrollet væk fra
  // bunden, så de kan se hvor mange de er bag.
  const [unseenCount, setUnseenCount] = useState(0);
  // Når brugeren skifter samtale skal vi PÅ NÆSTE render af messages
  // tvinge scroll til bunden — uanset om det er den første eller en
  // efterfølgende load. Sættes i activeId-effekten, ryddes når vi har
  // scrollet for den pågældende samtale.
  const forceBottomOnNextRenderRef = useRef(false);

  // Hold afsendernavnet i sync med virksomhedens navn (i tilfælde af at det
  // ændres mens fanen er åben). Vi henter IKKE længere brugerens eget navn.
  useEffect(() => {
    setAdminName(businessName);
  }, [businessName]);

  // Load skabeloner og medarbejdere med livechat-adgang
  useEffect(() => {
    supabase.from("chat_templates")
      .select("id, title, content, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => { if (data) setTemplates(data as Template[]); });
    supabase.from("employees")
      .select("id, name, livechat_enabled")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setEmployees((data as any[]).filter((e) => e.livechat_enabled).map((e) => ({ id: e.id, name: e.name })));
      });
  }, [businessId]);

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

  const onIncoming = useCallback((next: Message) => {
    if (initialMessagesLoad.current) return;
    if (next.is_system) chatSounds.system();
    else if (next.sender_type === "visitor") chatSounds.incoming();
  }, []);
  const { messages, loading: messagesLoading, error: messagesError, retry: retryMessages } = useConversationMessages(activeId, onIncoming);

  // Reset only view state when changing conversations; drafts stay conversation-scoped.
  useEffect(() => {
    initialMessagesLoad.current = true;
    forceBottomOnNextRenderRef.current = true;
    userScrolledUpRef.current = false;
    setPendingImage(null);
    setPendingImagePreview(previous => { if (previous) URL.revokeObjectURL(previous); return null; });
    setUploadError(null);
  }, [activeId]);

  useEffect(() => { initialMessagesLoad.current = messagesLoading; }, [messagesLoading]);

  useEffect(() => {
    if (messagesLoading) return;
    const el = scrollRef.current;
    if (!el) return;
    // Forcér start-i-bunden første gang en samtale åbnes — også når der
    // allerede er gamle beskeder i state fra en anden samtale.
    if (forceBottomOnNextRenderRef.current) {
      // To rAF: vent på at billeder/layout har målt sig, så scrollHeight er korrekt.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const e2 = scrollRef.current;
          if (e2) e2.scrollTo({ top: e2.scrollHeight, behavior: "auto" });
          forceBottomOnNextRenderRef.current = false;
        });
      });
      return;
    }
    if (!userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, activeId, messagesLoading]);

  useEffect(() => {
    userScrolledUpRef.current = false;
    setShowJumpToBottom(false);
    setUnseenCount(0);
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const isUp = distanceFromBottom > 80;
      userScrolledUpRef.current = isUp;
      setShowJumpToBottom(isUp);
      if (!isUp) setUnseenCount(0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeId]);

  // Når brugeren er scrollet op og en ny besked kommer ind, øg
  // unseen-tæller (initial-load tæller ikke med).
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    const last = messages[messages.length - 1];
    const lastId = last?.id || null;
    if (initialMessagesLoad.current) {
      lastMessageIdRef.current = lastId;
      return;
    }
    if (lastId && lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      if (userScrolledUpRef.current) {
        setUnseenCount((c) => c + 1);
      }
    }
  }, [messages]);

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    userScrolledUpRef.current = false;
    setShowJumpToBottom(false);
    setUnseenCount(0);
  }, []);

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
        const q = search.trim().toLowerCase();
        if (!c.visitor_name.toLowerCase().includes(q) &&
            !c.visitor_email.toLowerCase().includes(q) &&
            !(c.subject || "").toLowerCase().includes(q)) return false;
      }
      if (dateFilter) {
        const day = new Date(c.last_message_at).toISOString().slice(0, 10);
        if (day !== dateFilter) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at));
  }, [conversations, filter, search, dateFilter]);

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
    if (!error) {
      chatSounds.outgoing();
      setDrafts(previous => ({ ...previous, [active.id]: "" }));
      if (activeIdRef.current === active.id) clearPendingImage();
    }
    else toast.error("Beskeden blev ikke sendt. Prøv igen — dit svar er bevaret.");
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

  // ── Skabelon-handlers ──
  const insertTemplate = (tpl: Template) => {
    const firstName = active?.visitor_name?.split(" ")[0] || "";
    const filled = tpl.content.split("{name}").join(firstName);
    setDraft((d) => (d ? `${d}\n${filled}` : filled));
    textareaRef.current?.focus();
  };
  const saveTemplate = async () => {
    const title = tplDraft.title.trim();
    const content = tplDraft.content.trim();
    if (!title || !content) { toast.error("Titel og tekst er påkrævet"); return; }
    if (tplDraft.id) {
      const { error } = await supabase.from("chat_templates")
        .update({ title, content }).eq("id", tplDraft.id);
      if (error) { toast.error("Kunne ikke gemme"); return; }
      setTemplates((prev) => prev.map((t) => (t.id === tplDraft.id ? { ...t, title, content } : t)));
    } else {
      const sort_order = templates.length;
      const { data, error } = await supabase.from("chat_templates")
        .insert({ business_id: businessId, title, content, sort_order })
        .select("id, title, content, sort_order").single();
      if (error || !data) { toast.error("Kunne ikke oprette"); return; }
      setTemplates((prev) => [...prev, data as Template]);
    }
    setTplDraft({ title: "", content: "" });
    toast.success("Skabelon gemt");
  };
  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("chat_templates").delete().eq("id", id);
    if (error) { toast.error("Kunne ikke slette"); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Tildeling ──
  const assignTo = async (employeeId: string | null) => {
    if (!active) return;
    const { error } = await supabase.from("chat_conversations")
      .update({ assigned_employee_id: employeeId }).eq("id", active.id);
    if (error) { toast.error("Kunne ikke tildele"); return; }
    const empName = employeeId ? employees.find((e) => e.id === employeeId)?.name || "medarbejder" : null;
    await supabase.from("chat_messages").insert({
      conversation_id: active.id, sender_type: "admin", sender_name: adminName,
      content: empName ? `Tildelt til ${empName}` : "Tildeling fjernet", is_system: true,
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Livechat"
        description={`Samtaler startet fra din virksomhedsside${totalUnread > 0 ? ` · ${totalUnread} ulæst${totalUnread === 1 ? "" : "e"}` : ""}.`}
      />

      <LiveChatStats conversations={conversations} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Conversation list */}
        <div className={`service-panel-card overflow-hidden rounded-[5px] border border-border bg-card shadow-sm ${active ? "hidden xl:block" : ""}`}>
          <div className="border-b border-border p-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Søg i samtaler" autoComplete="off"
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg navn, e-mail, emne…"
                className="h-11 w-full rounded-md pl-8"
              />
            </div>
            <div className="flex gap-1 text-xs">
              {(["all", "open", "unread", "closed"] as Filter[]).map((f) => (
                <Button variant="ghost"
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                     className={`h-11 min-w-0 flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${
                    filter === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Alle" : f === "open" ? "Åbne" : f === "unread" ? "Ulæst" : "Lukkede"}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost"
                    type="button"
                    className={cn(
                       "flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-left transition-colors hover:border-foreground/40 focus:border-foreground focus:outline-none",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate">
                      {dateFilter
                        ? formatDate(new Date(dateFilter + "T00:00:00"), "d. MMM yyyy", { locale: da })
                        : "Vælg dag"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[calc(100vw-1.5rem)] p-0" align="start" collisionPadding={12}>
                  <Calendar
                    mode="single"
                    locale={da}
                    selected={dateFilter ? new Date(dateFilter + "T00:00:00") : undefined}
                    onSelect={(d) => setDateFilter(d ? formatDate(d, "yyyy-MM-dd") : "")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dateFilter && (
                <Button variant="ghost"
                  onClick={() => setDateFilter("")}
                  size="icon" className="h-11 w-11 shrink-0 text-muted-foreground"
                  aria-label="Ryd dato"
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button variant="ghost"
              onClick={() => setTemplatesOpen(true)}
             className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <BookText className="h-3 w-3" /> Svar-skabeloner ({templates.length})
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                <NoItemsIcon className="mb-2 h-12 w-12" />
                Ingen samtaler endnu.
              </div>
            ) : (
              filtered.map((c) => {
                return (
                <Button variant="ghost"
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex h-auto min-h-11 w-full items-start gap-2.5 whitespace-normal border-b border-border px-3 py-2.5 text-left transition-colors ${
                    activeId === c.id ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {initials(c.visitor_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{c.visitor_name}</span>
                      {c.unread_admin_count > 0 && (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">{c.unread_admin_count}</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.subject || c.visitor_email}</p>
                    <ConversationMeta conversation={c} />
                  </div>
                </Button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation pane */}
        <div className={`service-panel-card flex h-[calc(100dvh-8rem)] min-h-[20rem] min-w-0 flex-col overflow-hidden rounded-[5px] border border-border bg-card shadow-sm xl:h-[60vh] ${!active ? "hidden xl:flex" : ""}`}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Vælg en samtale fra listen.
            </div>
          ) : (
            <>
              <div className="flex shrink-0 flex-col items-stretch gap-2 border-b border-border bg-secondary/30 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setActiveId(null)}
                    size="icon" className="xl:hidden h-11 w-11 shrink-0 text-muted-foreground"
                    aria-label="Tilbage til samtaler"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    {initials(active.visitor_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="break-words [overflow-wrap:anywhere] text-sm font-semibold text-foreground flex flex-wrap items-center gap-2">
                      <User className="h-3.5 w-3.5" /> {active.visitor_name}
                      {active.status === "closed" && (
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">Lukket</span>
                      )}
                    </p>
                    <p className="break-words [overflow-wrap:anywhere] text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${active.visitor_email}`} className="hover:underline">{active.visitor_email}</a>
                      {active.subject && <span className="ml-1 truncate">· {active.subject}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-1 sm:ml-auto">
                  {employees.length > 0 && (
                    <select
                      value={active.assigned_employee_id || ""}
                      onChange={(e) => assignTo(e.target.value || null)}
                      title="Tildel til medarbejder" aria-label="Tildel til medarbejder"
                      className="h-11 min-w-0 max-w-full flex-1 rounded-md border border-border bg-background px-1.5 py-1 text-sm text-muted-foreground hover:text-foreground focus:border-foreground outline-none"
                    >
                      <option value="">Ikke tildelt</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  )}
                  <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={muted ? "Slå lyd til" : "Slå lyd fra"} aria-pressed={!muted} title={muted ? "Slå lyd til" : "Slå lyd fra"}
                    className="h-11 w-11 shrink-0 rounded-md text-muted-foreground">
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  {active.status === "closed" ? (
                    <Button variant="ghost" onClick={() => reopenConversation(active.id)}
                      className="h-11 rounded-md bg-foreground px-2.5 py-1 text-sm font-medium text-background hover:bg-foreground/90">
                      Genåbn
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => closeConversation(active.id)}
                      className="h-11 rounded-md border border-border px-2.5 py-1 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex items-center gap-1">
                      <Archive className="h-3 w-3" /> Afslut
                    </Button>
                  )}
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
              <div ref={scrollRef} className="absolute inset-0 space-y-2.5 overflow-y-auto bg-secondary/20 px-4 py-4">
                {messagesLoading && <div role="status" aria-label="Henter beskeder" className="p-4"><ListCardSkeleton rows={4} withHeader={false} /></div>}
                {messagesError && <div role="alert" className="space-y-2 text-center text-sm text-destructive"><p>Beskederne kunne ikke hentes.</p><Button variant="outline" onClick={retryMessages}>Prøv igen</Button></div>}
                {messages.map((m, i) => {
                  if (m.is_system) {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
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
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                              {initials(m.sender_name)}
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`flex min-w-0 max-w-[85%] flex-col sm:max-w-[75%] ${mine ? "items-end" : "items-start"}`}>
                        <div className={`overflow-hidden rounded-2xl text-sm leading-relaxed shadow-sm ${
                          mine ? "rounded-br-sm bg-foreground text-background" : "rounded-bl-sm border border-border bg-card text-foreground"
                        }`}>
                          {m.image_url && (
                            <a href={m.image_url} target="_blank" rel="noopener noreferrer">
                              <img src={m.image_url} alt="Vedhæftet" className="max-h-64 w-auto object-cover" />
                            </a>
                          )}
                          {m.content && <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-3.5 py-2">{m.content}</div>}
                        </div>
                        <div className={`mt-1 flex items-center gap-1 px-1 text-xs text-muted-foreground ${mine ? "flex-row-reverse" : ""}`}>
                          <span>{formatTime(m.created_at)}</span>
                          {mine && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {showJumpToBottom && (
                <Button variant="ghost"
                  type="button"
                  onClick={jumpToBottom}
                  className="absolute bottom-3 left-1/2 h-auto min-h-11 max-w-[calc(100%-1rem)] whitespace-normal -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background shadow-lg ring-2 ring-background/40 transition-all hover:bg-foreground/90 active:scale-95"
                  aria-label="Hop til seneste beskeder"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  {unseenCount > 0
                    ? `${unseenCount} ${unseenCount === 1 ? "ny besked" : "nye beskeder"}`
                    : "Hop til seneste"}
                </Button>
              )}
              </div>

              {active.status === "closed" ? (
                <div className="border-t border-border bg-card p-3 text-center text-xs text-muted-foreground">
                  Samtalen er lukket. Genåbn for at svare.
                </div>
              ) : (
                <div className="shrink-0 border-t border-border bg-card p-3">
                  {templates.length > 0 && (
                    <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                      <Zap className="h-3 w-3 flex-shrink-0 text-accent" />
                      <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Hurtige svar
                      </span>
                      {templates.slice(0, 8).map((t) => (
                        <Button variant="ghost"
                          key={t.id}
                          onClick={() => insertTemplate(t)}
                          title={t.content}
                          className="h-11 max-w-52 flex-shrink-0 truncate rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-card"
                        >
                          {t.title}
                        </Button>
                      ))}
                      <Button variant="ghost"
                        onClick={() => setTemplatesOpen(true)}
                        className="h-11 max-w-52 flex-shrink-0 truncate rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        title="Administrér skabeloner"
                      >
                        <Plus className="inline h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {pendingImagePreview && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2">
                      <img src={pendingImagePreview} alt="" className="h-12 w-12 rounded object-cover" />
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        <ImageIcon className="mr-1 inline h-3 w-3" />{pendingImage?.name}
                      </span>
                      <Button variant="ghost" onClick={clearPendingImage} aria-label="Fjern vedhæftet billede" size="icon" className="h-11 w-11 text-muted-foreground">
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {uploadError && <p className="mb-1.5 text-xs text-destructive">{uploadError}</p>}
                  <div className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }} />
                    <Button variant="ghost" onClick={() => fileInputRef.current?.click()}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      aria-label="Vedhæft billede">
                      <Paperclip className="h-3.5 w-3.5" />
                    </Button>
                    <textarea
                      ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      aria-label="Svar til kunden" maxLength={2000} rows={1} placeholder="Skriv et svar…"
                      className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                    <Button variant="ghost" onClick={() => sendReply()} disabled={sending || (!draft.trim() && !pendingImage)} aria-label="Send"
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50">
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Skabelon-manager — moderne dialog med liste + redigér + preview */}
      <Dialog open={templatesOpen} onOpenChange={(v) => { setTemplatesOpen(v); if (!v) { setPreviewTpl(null); setTplDraft({ title: "", content: "" }); } }}>
        <DialogContent className="planner-overlay max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="planner-overlay-header border-b border-border px-4 py-4 pr-14">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-accent" /> Svar-skabeloner
            </DialogTitle>
          </DialogHeader>
          <div className="planner-overlay-body grid min-h-0 grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto [overflow-wrap:anywhere] md:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
            {/* Liste + formular */}
            <div className="flex min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
              <div className="space-y-2 p-4">
                {templates.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Ingen skabeloner endnu. Tilføj dit første hurtige svar nedenfor.
                  </p>
                )}
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`group flex items-start gap-2 rounded-xl border p-3 transition-colors ${
                      previewTpl?.id === t.id ? "border-foreground bg-secondary" : "border-border bg-secondary/40 hover:bg-secondary/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1 cursor-pointer [overflow-wrap:anywhere]" onClick={() => setPreviewTpl(t)}>
                      <p className="text-xs font-semibold text-foreground">{t.title}</p>
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{t.content}</p>
                    </div>
                    <div className="flex flex-shrink-0 flex-col gap-1 transition-opacity">
                      <Button variant="ghost" onClick={() => setPreviewTpl(t)} className="h-11 w-11 shrink-0 rounded-md text-muted-foreground" title="Forhåndsvis">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" onClick={() => setTplDraft({ id: t.id, title: t.title, content: t.content })} className="h-11 w-11 shrink-0 rounded-md text-muted-foreground" title="Rediger">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" onClick={() => deleteTemplate(t.id)} className="h-11 w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Slet">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t border-border bg-secondary/30 p-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {tplDraft.id ? "Rediger skabelon" : "Tilføj ny skabelon"} — brug {"{name}"} som pladsholder
                  </p>
                  {tplDraft.id && (
                    <Button variant="ghost" onClick={() => setTplDraft({ title: "", content: "" })} className="min-h-11 text-sm text-muted-foreground hover:text-foreground">
                      Annullér
                    </Button>
                  )}
                </div>
                <input
                  value={tplDraft.title}
                  onChange={(e) => setTplDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Titel (fx 'Pris')"
                  maxLength={60}
                  aria-label="Skabelonens titel" className="h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                />
                <textarea
                  value={tplDraft.content}
                  onChange={(e) => setTplDraft((d) => ({ ...d, content: e.target.value }))}
                  placeholder="Hej {name}, tak for din henvendelse…"
                  rows={3}
                  maxLength={1000}
                  aria-label="Skabelonens tekst" className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                />
                <Button variant="ghost"
                  onClick={saveTemplate}
                  disabled={!tplDraft.title.trim() || !tplDraft.content.trim()}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" /> {tplDraft.id ? "Gem ændringer" : "Tilføj skabelon"}
                </Button>
              </div>
            </div>
            {/* Preview */}
            <div className={`min-w-0 flex-col bg-secondary/20 ${previewTpl ? "flex" : "hidden md:flex"}`}>
              <div className="border-b border-border px-4 py-2.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Eye className="h-3 w-3" /> Forhåndsvisning
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {!previewTpl ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Vælg en skabelon for at se hvordan den ser ud.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Titel</p>
                      <p className="text-sm font-semibold text-foreground">{previewTpl.title}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sådan ser det ud</p>
                      <div className="overflow-hidden rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-sm text-background shadow-sm">
                        <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {previewTpl.content.split("{name}").join(active?.visitor_name?.split(" ")[0] || "[fornavn]")}
                        </div>
                      </div>
                      {!active && (
                        <p className="mt-2 text-xs text-muted-foreground">Åbn en samtale for at se svaret med kundens navn.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessLiveChatTab;