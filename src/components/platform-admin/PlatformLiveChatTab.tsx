import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageCircle, Send, Loader2, CheckCircle2, Search, Zap, User, Mail, Clock,
  Plus, Trash2, X, CheckCheck, Inbox, Archive, Paperclip, Image as ImageIcon,
  X as XIcon, Volume2, VolumeX, ArrowUpDown, Eye, Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import chatSounds from "@/components/livechat/chatSounds";

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

type CannedResponse = { id: string; title: string; body: string; category: string };

const CANNED_KEY = "serviceydere_admin_canned_v2";

const DEFAULT_CATEGORIES = ["Velkomst", "Pris", "Support", "Opfølgning", "Afslutning"];

const DEFAULT_CANNED: CannedResponse[] = [
  { id: "greeting", title: "Velkomst", category: "Velkomst", body: "Hej {name} 👋\n\nTusind tak for din henvendelse! Hvordan kan jeg hjælpe dig?" },
  { id: "pricing", title: "Priser", category: "Pris", body: "Hej {name},\n\nVores priser starter ved 199 kr./md. og afhænger af hvilke moduler I vælger. Du kan se en fuld oversigt på serviceydere.dk/priser eller jeg sender gerne et tilbud — hvor mange medarbejdere har I?" },
  { id: "callback", title: "Ring tilbage", category: "Support", body: "Hej {name},\n\nJeg vil meget gerne ringe dig op. Hvilket tidspunkt passer dig bedst i dag?" },
  { id: "thanks-close", title: "Tak & afslut", category: "Afslutning", body: "Tak for snakken {name}! Skriv endelig igen hvis du har flere spørgsmål. God dag 🌿" },
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
type SortMode = "recent" | "unread_first" | "oldest";

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
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [canned, setCanned] = useState<CannedResponse[]>(DEFAULT_CANNED);
  const [showCannedManager, setShowCannedManager] = useState(false);
  const [cannedFilter, setCannedFilter] = useState<string>("Alle");
  const [previewCanned, setPreviewCanned] = useState<CannedResponse | null>(null);
  const [editingCanned, setEditingCanned] = useState<CannedResponse | null>(null);
  const [newCannedTitle, setNewCannedTitle] = useState("");
  const [newCannedCategory, setNewCannedCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [newCannedBody, setNewCannedBody] = useState("");
  const [showInfo, setShowInfo] = useState(true);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(chatSounds.isMuted());
  const [allMessagesIndex, setAllMessagesIndex] = useState<Record<string, string>>({}); // conversation_id -> last message snippet
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const initialMessagesLoad = useRef(true);

  // Load canned with migration from v1
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CANNED_KEY);
      if (raw) {
        setCanned(JSON.parse(raw));
        return;
      }
      const legacy = localStorage.getItem("serviceydere_admin_canned_v1");
      if (legacy) {
        const parsed = JSON.parse(legacy) as Array<{ id: string; title: string; body: string }>;
        const migrated = parsed.map((c) => ({ ...c, category: "Support" }));
        setCanned(migrated);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(CANNED_KEY, JSON.stringify(canned)); } catch { /* ignore */ }
  }, [canned]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setAdminName(data.display_name);
    });
  }, [user]);

  // Conversation list with realtime + sound on new visitor message
  useEffect(() => {
    let isFirst = true;
    const load = () => {
      supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (!data) return;
          setConversations((prev) => {
            // Sound: detect new visitor unread bump
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
      .channel("admin-chat-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId]);

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
      .channel(`admin-chat-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
          if (!initialMessagesLoad.current) {
            if (next.is_system) chatSounds.system();
            else if (next.sender_type === "visitor") chatSounds.incoming();
          }
          if (next.sender_type === "visitor") {
            supabase.from("chat_conversations").update({ unread_admin_count: 0 }).eq("id", activeId).then(() => {});
          }
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: initialMessagesLoad.current ? "auto" : "smooth" });
  }, [messages, activeId]);
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
        const inMeta =
          c.visitor_name.toLowerCase().includes(q) ||
          c.visitor_email.toLowerCase().includes(q) ||
          (c.subject || "").toLowerCase().includes(q);
        const inMessages = (allMessagesIndex[c.id] || "").toLowerCase().includes(q);
        if (!inMeta && !inMessages) return false;
      }
      return true;
    });
    if (sortMode === "recent") {
      list = [...list].sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at));
    } else if (sortMode === "oldest") {
      list = [...list].sort((a, b) => +new Date(a.last_message_at) - +new Date(b.last_message_at));
    } else if (sortMode === "unread_first") {
      list = [...list].sort((a, b) => {
        if ((b.unread_admin_count > 0 ? 1 : 0) !== (a.unread_admin_count > 0 ? 1 : 0)) {
          return (b.unread_admin_count > 0 ? 1 : 0) - (a.unread_admin_count > 0 ? 1 : 0);
        }
        return +new Date(b.last_message_at) - +new Date(a.last_message_at);
      });
    }
    return list;
  }, [conversations, filter, search, sortMode, allMessagesIndex]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_admin_count || 0), 0);

  // Build searchable index across messages on demand when user types in search
  useEffect(() => {
    if (!search || search.length < 2) return;
    let cancelled = false;
    supabase
      .from("chat_messages")
      .select("conversation_id, content")
      .ilike("content", `%${search}%`)
      .limit(500)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const idx: Record<string, string> = {};
        for (const m of data as Array<{ conversation_id: string; content: string | null }>) {
          if (!m.content) continue;
          idx[m.conversation_id] = (idx[m.conversation_id] || "") + " " + m.content;
        }
        setAllMessagesIndex(idx);
      });
    return () => { cancelled = true; };
  }, [search]);

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

  const sendReply = useCallback(async (contentOverride?: string) => {
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
      chatSounds.outgoing();
      if (contentOverride === undefined) { setDraft(""); clearPendingImage(); }
    }
  }, [active, sending, draft, pendingImage, adminName]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const upsertCanned = () => {
    if (!newCannedTitle.trim() || !newCannedBody.trim()) return;
    if (editingCanned) {
      setCanned((prev) =>
        prev.map((c) =>
          c.id === editingCanned.id
            ? { ...c, title: newCannedTitle.trim(), body: newCannedBody.trim(), category: newCannedCategory }
            : c,
        ),
      );
    } else {
      setCanned((prev) => [...prev, {
        id: crypto.randomUUID(),
        title: newCannedTitle.trim(),
        body: newCannedBody.trim(),
        category: newCannedCategory,
      }]);
    }
    setNewCannedTitle(""); setNewCannedBody(""); setEditingCanned(null);
  };
  const startEditCanned = (c: CannedResponse) => {
    setEditingCanned(c);
    setNewCannedTitle(c.title);
    setNewCannedBody(c.body);
    setNewCannedCategory(c.category || DEFAULT_CATEGORIES[0]);
  };
  const cancelEditCanned = () => {
    setEditingCanned(null); setNewCannedTitle(""); setNewCannedBody("");
  };
  const deleteCanned = (id: string) => setCanned((prev) => prev.filter((c) => c.id !== id));

  const cannedCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    canned.forEach((c) => c.category && set.add(c.category));
    return ["Alle", ...Array.from(set)];
  }, [canned]);

  const cannedVisible = useMemo(
    () => canned.filter((c) => cannedFilter === "Alle" || c.category === cannedFilter),
    [canned, cannedFilter],
  );

  const previewBody = useMemo(() => {
    if (!previewCanned) return "";
    const firstName = active ? (active.visitor_name.split(" ")[0] || active.visitor_name) : "Kunde";
    return previewCanned.body.split("{name}").join(firstName);
  }, [previewCanned, active]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    chatSounds.setMuted(next);
    if (!next) chatSounds.tick();
  };

  // Keyboard shortcuts: j/k navigate, Esc close panels, / focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "Escape") {
        if (showCannedManager) { setShowCannedManager(false); return; }
        if (previewCanned) { setPreviewCanned(null); return; }
      }
      if (isTyping) return;

      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "j" || e.key === "k") {
        const list = filtered;
        if (list.length === 0) return;
        const idx = list.findIndex((c) => c.id === activeId);
        let next = idx;
        if (e.key === "j") next = idx < 0 ? 0 : Math.min(idx + 1, list.length - 1);
        if (e.key === "k") next = idx < 0 ? 0 : Math.max(idx - 1, 0);
        setActiveId(list[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, activeId, showCannedManager, previewCanned]);

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
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                title={muted ? "Slå lyd til" : "Slå lyd fra"}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[11px] text-muted-foreground">{filtered.length}/{conversations.length}</span>
            </div>
          </div>
          <div className="relative mt-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg navn, email, emne, besked… (tryk /)"
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
          <div className="mt-2 flex items-center gap-1.5">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sortér</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-foreground"
            >
              <option value="recent">Seneste aktivitet</option>
              <option value="unread_first">Ulæste først</option>
              <option value="oldest">Ældste først</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Ingen samtaler her.</p>
              <p className="text-[10px] text-muted-foreground/70">Tip: tryk <kbd className="rounded bg-secondary px-1">/</kbd> for at søge, <kbd className="rounded bg-secondary px-1">j/k</kbd> for navigation</p>
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
            <p className="max-w-xs text-xs text-muted-foreground">Klik på en samtale fra indbakken — eller brug <kbd className="rounded bg-secondary px-1">j/k</kbd> for at navigere.</p>
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

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-5 py-5 scroll-smooth">
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
                const prev = messages[i - 1];
                const showAvatar = !mine && (!prev || prev.sender_type !== m.sender_type || prev.is_system);
                let lastAdminIdx = -1;
                for (let j = messages.length - 1; j >= 0; j--) {
                  if (messages[j].sender_type === "admin" && !messages[j].is_system) { lastAdminIdx = j; break; }
                }
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
                      {canned.slice(0, 8).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => insertCanned(c)}
                          onMouseEnter={() => setPreviewCanned(c)}
                          onMouseLeave={() => setPreviewCanned(null)}
                          className="flex-shrink-0 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-foreground/40 hover:bg-card"
                          title={c.body}
                        >
                          {c.title}
                          {c.category && <span className="ml-1 text-muted-foreground">·{c.category}</span>}
                        </button>
                      ))}
                      <button onClick={() => setShowCannedManager(true)} className="flex-shrink-0 rounded-full border border-dashed border-border px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground" title="Administrér">
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
                    Enter sender · Shift+Enter for ny linje · {"{name}"} erstattes automatisk · / søg · j/k navigér
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

      {/* Canned response admin manager */}
      {showCannedManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowCannedManager(false)}>
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Hurtige svar — administrer</h3></div>
              <button onClick={() => setShowCannedManager(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_320px]">
              {/* List */}
              <div className="flex flex-col overflow-hidden">
                <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
                  {cannedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCannedFilter(cat)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        cannedFilter === cat ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Tag className="h-2.5 w-2.5" /> {cat}
                    </button>
                  ))}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {cannedVisible.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">Ingen svar i kategorien "{cannedFilter}".</p>
                  )}
                  {cannedVisible.map((c) => (
                    <div
                      key={c.id}
                      className={`group flex items-start gap-2 rounded-xl border p-3 transition-colors ${
                        previewCanned?.id === c.id ? "border-foreground bg-secondary" : "border-border bg-secondary/40 hover:bg-secondary/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setPreviewCanned(c)}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-foreground">{c.title}</p>
                          {c.category && (
                            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">{c.category}</span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] text-muted-foreground">{c.body}</p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setPreviewCanned(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground" title="Forhåndsvis">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => startEditCanned(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-card hover:text-foreground" title="Rediger">
                          ✎
                        </button>
                        <button onClick={() => deleteCanned(c.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Slet">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {editingCanned ? "Rediger svar" : "Tilføj nyt svar"} — brug {"{name}"} som pladsholder
                    </p>
                    {editingCanned && (
                      <button onClick={cancelEditCanned} className="text-[10px] text-muted-foreground hover:text-foreground">Annullér</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={newCannedTitle} onChange={(e) => setNewCannedTitle(e.target.value)} placeholder="Titel (fx 'Pris')" maxLength={60}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground" />
                    <select value={newCannedCategory} onChange={(e) => setNewCannedCategory(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground">
                      {DEFAULT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <textarea value={newCannedBody} onChange={(e) => setNewCannedBody(e.target.value)} placeholder="Tekst til svaret…" rows={3} maxLength={1000}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-foreground" />
                  <button onClick={upsertCanned} disabled={!newCannedTitle.trim() || !newCannedBody.trim()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" /> {editingCanned ? "Gem ændringer" : "Tilføj svar"}
                  </button>
                </div>
              </div>

              {/* Preview pane */}
              <div className="hidden flex-col border-l border-border bg-secondary/20 md:flex">
                <div className="border-b border-border px-4 py-2.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Eye className="h-3 w-3" /> Forhåndsvisning
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {!previewCanned ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Vælg et svar for at se hvordan det ser ud.</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Titel</p>
                        <p className="text-sm font-semibold text-foreground">{previewCanned.title}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kategori</p>
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">{previewCanned.category}</span>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sådan ser det ud</p>
                        <div className="overflow-hidden rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-[13px] text-background shadow-sm">
                          <div className="whitespace-pre-wrap break-words">{previewBody}</div>
                        </div>
                        {!active && (
                          <p className="mt-2 text-[10px] text-muted-foreground">Åbn en samtale for at se svaret med kundens navn.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformLiveChatTab;
