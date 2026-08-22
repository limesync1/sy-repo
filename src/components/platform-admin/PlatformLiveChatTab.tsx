import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle } from "lucide-react";
import chatSounds from "@/components/livechat/chatSounds";
import CannedResponsesManager, { type CannedResponse } from "./livechat/CannedResponsesManager";
import { snoozeUntil, unsnooze, getActiveSnoozes, subscribeToSnoozes } from "./livechat/snooze";
import { downloadTranscript } from "./livechat/exportConversation";
import InboxList from "./livechat/InboxList";
import ChatHeader from "./livechat/ChatHeader";
import MessageList from "./livechat/MessageList";
import ChatComposer from "./livechat/ChatComposer";
import DetailsPanel from "./livechat/DetailsPanel";
import TranscriptDialog from "./livechat/TranscriptDialog";
import {
  type Conversation, type Message, type Filter, type SortMode,
  CANNED_KEY, DEFAULT_CATEGORIES,
} from "./livechat/shared";

const DEFAULT_CANNED: CannedResponse[] = [
  { id: "greeting", title: "Velkomst", category: "Velkomst", body: "Hej {name} 👋\n\nTusind tak for din henvendelse! Hvordan kan jeg hjælpe dig?" },
  { id: "find-services", title: "Find serviceyder", category: "Support", body: "Hej {name},\n\nDu kan finde udbydere via Find services, filtrere efter kategori og by og derefter se profil, priser hvor udbyderen har lagt dem ind, anmeldelser og åbningstider." },
  { id: "quote-flow", title: "Indhent 3 tilbud", category: "Support", body: "Hej {name},\n\nPå /tilbud vælger du lokation og kategori, beskriver opgaven og kan blive matchet med op til 3 relevante udbydere. Det er gratis og uforpligtende." },
  { id: "provider", title: "Bliv udbyder", category: "Pris", body: "Hej {name},\n\nSom udbyder får I profilside, services/priser, booking, kunde- og ordreoverblik, leads, ruteplanlægger, fakturering, anmeldelser, livechat og medarbejder-app. Priser afhænger af aftale og moduler, så vi tager gerne dialogen direkte." },
  { id: "callback", title: "Ring tilbage", category: "Support", body: "Hej {name},\n\nJeg vil meget gerne ringe dig op. Hvilket tidspunkt passer dig bedst i dag?" },
  { id: "thanks-close", title: "Tak & afslut", category: "Afslutning", body: "Tak for snakken {name}! Skriv endelig igen hvis du har flere spørgsmål. God dag 🌿" },
];

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
  const [showTranscript, setShowTranscript] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(chatSounds.isMuted());
  const [allMessagesIndex, setAllMessagesIndex] = useState<Record<string, string>>({}); // conversation_id -> last message snippet
  const [snoozes, setSnoozes] = useState<Record<string, string>>(() => getActiveSnoozes());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const initialMessagesLoad = useRef(true);
  const userScrolledUpRef = useRef(false);

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
              // (Tidligere AI-bot eskalering "needs_human" er fjernet — alle samtaler er nu live.)
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
    if (!el) return;
    if (initialMessagesLoad.current || !userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: initialMessagesLoad.current ? "auto" : "smooth" });
    }
  }, [messages, activeId]);

  // Reset scroll-tracking when switching conversations and watch user scroll.
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
      const isSnoozed = !!snoozes[c.id];
      if (filter === "snoozed") {
        if (!isSnoozed) return false;
      } else if (isSnoozed) {
        // skjul snoozed samtaler i alle andre views (medmindre ulæst)
        if (c.unread_admin_count <= 0) return false;
      }
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
  }, [conversations, filter, search, sortMode, allMessagesIndex, snoozes]);

  // Hold snooze-state synkroniseret + auto-refresh hvert minut så samtaler
  // dukker op igen automatisk når deres deadline udløber.
  useEffect(() => {
    const refresh = () => setSnoozes(getActiveSnoozes());
    const unsub = subscribeToSnoozes(refresh);
    const interval = setInterval(refresh, 60_000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_admin_count || 0), 0);
  const snoozedCount = useMemo(
    () => conversations.filter((c) => snoozes[c.id]).length,
    [conversations, snoozes],
  );

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

  const handleSnooze = (id: string, hours: number) => {
    snoozeUntil(id, hours);
    setSnoozes(getActiveSnoozes());
    chatSounds.tick();
    if (id === activeId) setActiveId(null);
  };
  const handleUnsnooze = (id: string) => {
    unsnooze(id);
    setSnoozes(getActiveSnoozes());
  };

  const handleExport = () => {
    if (!active) return;
    downloadTranscript(active, messages);
  };

  const handleAiSuggest = async () => {
    if (!active || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-chat-suggest-reply", {
        body: { conversation_id: active.id },
      });
      if (error) throw new Error(error.message || "Kunne ikke hente forslag");
      const suggestion = (data as { suggestion?: string; error?: string })?.suggestion;
      if (!suggestion) throw new Error((data as { error?: string })?.error || "Tomt svar fra AI");
      setDraft((prev) => (prev ? prev + "\n\n" + suggestion : suggestion));
      textareaRef.current?.focus();
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Ukendt fejl");
    } finally {
      setAiBusy(false);
    }
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
      <InboxList
        searchRef={searchRef}
        search={search} onSearch={setSearch}
        filter={filter} onFilter={setFilter}
        sortMode={sortMode} onSortMode={setSortMode}
        filtered={filtered} conversations={conversations}
        totalUnread={totalUnread} snoozedCount={snoozedCount} snoozes={snoozes}
        activeId={activeId} onSelect={setActiveId}
        muted={muted} onToggleMute={toggleMute}
      />

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
            <ChatHeader
              active={active}
              snoozed={!!snoozes[active.id]}
              showInfo={showInfo}
              onToggleInfo={() => setShowInfo((v) => !v)}
              onExport={handleExport}
              onShowTranscript={() => setShowTranscript(true)}
              onSnooze={(h) => handleSnooze(active.id, h)}
              onUnsnooze={() => handleUnsnooze(active.id)}
              onClose={() => closeConversation(active.id)}
              onReopen={() => reopenConversation(active.id)}
            />

            {visitorClosed && (
              <div className="border-b border-border bg-accent-soft/40 px-5 py-2 text-center text-[11px] font-medium text-foreground">
                ⚠ Kunden afsluttede selv samtalen
              </div>
            )}

            <MessageList ref={scrollRef} messages={messages} />

            {active.status === "closed" ? (
              <div className="border-t border-border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Samtalen er afsluttet. Genåbn for at svare igen.</p>
              </div>
            ) : (
              <ChatComposer
                visitorFirstName={active.visitor_name.split(" ")[0] || active.visitor_name}
                canned={canned}
                onInsertCanned={insertCanned}
                onPreviewCanned={setPreviewCanned}
                onOpenCannedManager={() => setShowCannedManager(true)}
                onAiSuggest={handleAiSuggest}
                aiBusy={aiBusy}
                aiError={aiError}
                draft={draft}
                setDraft={setDraft}
                textareaRef={textareaRef}
                fileInputRef={fileInputRef}
                pendingImage={pendingImage}
                pendingImagePreview={pendingImagePreview}
                onPickImage={onPickImage}
                onClearImage={clearPendingImage}
                uploadError={uploadError}
                sending={sending}
                onSend={() => sendReply()}
              />
            )}
          </>
        )}
      </div>

      {active && showInfo && (
        <DetailsPanel
          active={active}
          messages={messages}
          onOpenCannedManager={() => setShowCannedManager(true)}
        />
      )}

      {/* Canned response admin manager */}
      {showCannedManager && (
        <CannedResponsesManager
          canned={canned}
          cannedFilter={cannedFilter}
          setCannedFilter={setCannedFilter}
          previewCanned={previewCanned}
          setPreviewCanned={setPreviewCanned}
          editingCanned={editingCanned}
          newCannedTitle={newCannedTitle}
          setNewCannedTitle={setNewCannedTitle}
          newCannedCategory={newCannedCategory}
          setNewCannedCategory={setNewCannedCategory}
          newCannedBody={newCannedBody}
          setNewCannedBody={setNewCannedBody}
          onUpsert={upsertCanned}
          onStartEdit={startEditCanned}
          onCancelEdit={cancelEditCanned}
          onDelete={deleteCanned}
          onClose={() => setShowCannedManager(false)}
          activeVisitorFirstName={active ? (active.visitor_name.split(" ")[0] || active.visitor_name) : null}
        />
      )}
    </div>
  );
};

export default PlatformLiveChatTab;
