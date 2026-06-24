// BusinessLiveChatWidget — gratis livechat på en specifik virksomhedsside.
// Genbruger samme visuelle sprog som platform-widgeten (LiveChatWidget),
// men er bundet til ét business_id, så samtaler havner direkte hos
// virksomhedsejeren i deres egen "Livechat"-fane.
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  MessageCircle, Send, Loader2, ChevronDown, CheckCheck, Paperclip, X as XIcon,
  Image as ImageIcon, Volume2, VolumeX, Sparkles, MoreVertical, MessagesSquare, ArrowLeft, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import chatSounds from "./chatSounds";
import ChatInboxList from "./ChatInboxList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  upsertChat,
  removeChat,
  listChats,
  subscribeToRegistry,
  businessKey,
  type RegisteredChat,
} from "./chatRegistry";

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

type Props = {
  businessId: string;
  businessName: string;
  /** Visningsnavn vist i header (fallback: businessName). */
  brandName?: string;
  /** Virksomhedens logo — vises i FAB-knappens venstre cirkel. */
  logoUrl?: string | null;
  /** Hvis sat: forsinker en evt. CartFab så vi ikke overlapper. */
  cartFabVisible?: boolean;
};

const startSchema = z.object({
  name: z.string().trim().min(1, "Indtast dit navn").max(80),
  email: z.string().trim().email("Ugyldig email").max(160),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Skriv en besked").max(2000),
});

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const BusinessLiveChatWidget = ({ businessId, businessName, brandName, logoUrl, cartFabVisible = false }: Props) => {
  const { user } = useAuth();
  // Egen storage-key pr. virksomhed så hver virksomhedsside har sin egen
  // session — så besøgende kan have parallelle samtaler hos forskellige
  // virksomheder uden at de blandes sammen.
  const STORAGE_KEY = `serviceydere_biz_chat_${businessId}_v1`;
  const OPEN_KEY = `serviceydere_biz_chat_open_${businessId}`;

  const [open, setOpenState] = useState<boolean>(() => {
    try { return sessionStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
  });
  const setOpen = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v;
      try { sessionStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }, [OPEN_KEY]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(chatSounds.isMuted());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Visning af "Mine samtaler" overlay (skifter mellem flere samtaler).
  const [showInbox, setShowInbox] = useState(false);
  // Lille dropdown-menu for handlinger på den åbne samtale.
  const [showMenu, setShowMenu] = useState(false);
  const [chats, setChats] = useState<RegisteredChat[]>(() => listChats());
  useEffect(() => subscribeToRegistry(() => setChats(listChats())), []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const initialLoadRef = useRef(true);
  const userScrolledUpRef = useRef(false);

  // Forudfyld navn/email hvis brugeren er logget ind.
  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.display_name) setName(data.display_name);
    });
  }, [user]);

  // Genfind eksisterende samtale fra localStorage.
  useEffect(() => {
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
          if (data) {
            setConversation(data as Conversation);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            removeChat(businessKey(businessId));
          }
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [STORAGE_KEY, businessId]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("serviceydere_open_chat_key") !== businessKey(businessId)) return;
      sessionStorage.removeItem("serviceydere_open_chat_key");
      setOpen(true);
      setShowInbox(false);
    } catch {}
  }, [businessId, setOpen]);

  // Sørg for at denne virksomheds-chat er registreret så længe vi har en
  // aktiv samtale — så den dukker op i "Mine samtaler"-listen overalt.
  useEffect(() => {
    if (!conversation) return;
    upsertChat({
      key: businessKey(businessId),
      scope: "business",
      businessId,
      label: brandName || businessName,
      logoUrl: logoUrl || null,
      href: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [conversation, businessId, brandName, businessName, logoUrl]);

  // Subscribe til beskeder og samtale-status.
  useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    initialLoadRef.current = true;
    supabase
      .from("chat_messages")
      .select("id, conversation_id, sender_type, sender_name, content, image_url, is_system, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) {
          setMessages(data as ChatMessage[]);
          lastMsgIdRef.current = (data[data.length - 1] as ChatMessage)?.id || null;
        }
        initialLoadRef.current = false;
      });

    supabase.from("chat_conversations").update({ unread_visitor_count: 0 }).eq("id", conversation.id).then(() => {});

    const msgChannel = supabase
      .channel(`biz-chat-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const next = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
          if (lastMsgIdRef.current !== next.id) {
            lastMsgIdRef.current = next.id;
            if (!initialLoadRef.current && next.sender_type === "admin" && !next.is_system) {
              chatSounds.incoming();
            } else if (next.is_system) {
              chatSounds.system();
            }
          }
          if (open && next.sender_type === "admin") {
            supabase.from("chat_conversations").update({ unread_visitor_count: 0 }).eq("id", conversation.id).then(() => {});
          }
        },
      )
      .subscribe();

    const convChannel = supabase
      .channel(`biz-chat-conv-${conversation.id}`)
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
  }, [conversation, open]);

  // Auto-scroll til bunden — undtagen hvis brugeren har scrollet op.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    if (initialLoadRef.current || !userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: initialLoadRef.current ? "auto" : "smooth" });
    }
  }, [messages, open]);

  // Når popup'en genåbnes, scroll altid ned til seneste besked.
  useEffect(() => {
    if (!open) return;
    userScrolledUpRef.current = false;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [open, conversation?.id, showInbox]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open, conversation]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [draft]);

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
    const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (upErr) { setUploadError("Kunne ikke uploade billedet"); return null; }
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
          business_id: businessId,
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
      upsertChat({
        key: businessKey(businessId),
        scope: "business",
        businessId,
        label: brandName || businessName,
        logoUrl: logoUrl || null,
        href: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setFirstMessage("");
      setSubject("");
      chatSounds.outgoing();

      // Send notifikation til virksomhedens email — hent den server-side via
      // edge function for at undgå at vise emailen i klienten.
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "new-chat-message",
            // Recipient sættes server-side: vi sender business_id med så
            // edge function kan slå virksomhedens email op. Som fallback
            // sender vi direkte hvis funktionen ikke kender business_id.
            recipientEmail: "kontakt@serviceydere.dk",
            idempotencyKey: `biz-chat-start-${conv.id}`,
            templateData: {
              visitorName: parsed.data.name,
              visitorEmail: parsed.data.email,
              subject: parsed.data.subject || "",
              message: parsed.data.message,
              isLoggedIn: !!user,
              adminUrl: `${window.location.origin}/virksomhed?tab=livechat`,
            },
            businessId,
          },
        })
        .catch(() => {});
    } catch (e: any) {
      setError(e?.message || "Kunne ikke starte chatten. Prøv igen.");
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!conversation || sending) return;
    const text = draft.trim();
    if (!text && !pendingImage) return;
    if (conversation.status === "closed") return;

    setSending(true);
    let image_url: string | null = null;
    if (pendingImage) {
      image_url = await uploadImage(pendingImage, conversation.id);
      if (!image_url) { setSending(false); return; }
    }
    const content = text.slice(0, 2000) || null;
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
      chatSounds.outgoing();
    }
  }, [conversation, sending, draft, pendingImage]); // eslint-disable-line react-hooks/exhaustive-deps

  const endChatSession = async () => {
    if (!conversation) return;
    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      sender_type: "visitor",
      sender_name: conversation.visitor_name,
      content: `${conversation.visitor_name} afsluttede samtalen`,
      is_system: true,
    });
    await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", conversation.id);
    chatSounds.system();
    setConversation((prev) => (prev ? { ...prev, status: "closed" } : prev));
  };

  const deleteCurrentConversation = async () => {
    if (!conversation) return;
    if (!confirm("Vil du slette samtalen fra dine samtaler?")) return;
    if (conversation.status !== "closed") {
      await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        sender_type: "visitor",
        sender_name: conversation.visitor_name,
        content: `${conversation.visitor_name} slettede samtalen fra sin oversigt`,
        is_system: true,
      });
      await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", conversation.id);
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    removeChat(businessKey(businessId));
    setConversation(null);
    setMessages([]);
    setDraft("");
    clearPendingImage();
    chatSounds.system();
  };

  const startNewConversation = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    removeChat(businessKey(businessId));
    setConversation(null);
    setMessages([]);
    setDraft("");
    clearPendingImage();
    setError(null);
    setSubject("");
    setFirstMessage("");
    setShowMenu(false);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    chatSounds.setMuted(next);
    if (!next) chatSounds.tick();
  };

  const handleOpen = () => {
    setOpen(true);
    chatSounds.open();
    if (conversation) {
      supabase.from("chat_conversations").update({ unread_visitor_count: 0 }).eq("id", conversation.id).then(() => {});
    }
  };

  const selectChat = (chat: RegisteredChat) => {
    const activeKey = businessKey(businessId);
    if (chat.key === activeKey) { setShowInbox(false); return; }
    try { sessionStorage.setItem("serviceydere_open_chat_key", chat.key); } catch {}
    if (chat.scope === "business" && chat.href) window.location.href = chat.href;
    else if (chat.scope === "platform") window.location.href = "/";
  };

  const deleteChat = (chat: RegisteredChat) => {
    if (!confirm("Vil du slette samtalen fra dine samtaler?")) return;
    const activeKey = businessKey(businessId);
    if (chat.key === activeKey) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      if (conversation) {
        supabase.from("chat_conversations").update({ status: "closed" }).eq("id", conversation.id).then(() => {});
      }
      setConversation(null);
      setMessages([]);
    } else if (chat.scope === "business" && chat.businessId) {
      try { localStorage.removeItem(`serviceydere_biz_chat_${chat.businessId}_v1`); } catch {}
    } else if (chat.scope === "platform") {
      try { localStorage.removeItem("serviceydere_chat_session_v1"); } catch {}
    }
    removeChat(chat.key);
    setChats(listChats());
  };

  const closed = conversation?.status === "closed";
  const headerName = brandName || businessName;

  // Layout: Bestillings-FAB'en er rykket mod venstre på desktop, så livechat
  // altid kan sidde yderst til højre. På mobil løfter vi livechat ovenover
  // bestillingen så de ikke overlapper i siden.
  const fabBottomClass = cartFabVisible
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";
  const fabPositionClass =
    "right-[calc(env(safe-area-inset-right,0px)+1.25rem)] sm:right-[calc(env(safe-area-inset-right,0px)+1.5rem)]";
  const panelBottomClass = fabBottomClass;
  const panelPositionClass = fabPositionClass;

  // Publicér FAB'ens faktiske bredde som en CSS-variabel, så fx CartFab kan
  // sidde lige til venstre for livechat-knappen uden at overlappe — uanset
  // hvor langt virksomhedsnavnet er.
  useEffect(() => {
    const el = fabRef.current;
    const root = document.documentElement;
    if (!el || open) {
      root.style.setProperty("--livechat-fab-width", "0px");
      return;
    }
    const update = () => {
      const w = el.getBoundingClientRect().width;
      root.style.setProperty("--livechat-fab-width", `${Math.ceil(w)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      root.style.setProperty("--livechat-fab-width", "0px");
    };
  }, [open, headerName]);

  return (
    <>
      {!open && (
        <button
          ref={fabRef}
          type="button"
          onClick={handleOpen}
          aria-label={`Åbn livechat med ${headerName}`}
          className={`fixed z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-[0_18px_40px_-16px_hsl(var(--foreground)/0.55)] transition-all hover:bg-foreground/90 hover:shadow-[0_22px_50px_-16px_hsl(var(--foreground)/0.6)] active:scale-95 ${fabBottomClass} ${fabPositionClass}`}
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-background/15">
            <MessageCircle className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success ring-2 ring-foreground"></span>
            </span>
          </span>
          <span className="truncate max-w-[8rem] sm:max-w-[14rem]">
            <span className="hidden sm:inline">Chat med </span>{headerName}
          </span>
        </button>
      )}

      {open && (
        <div className={`fixed z-50 w-[calc(100vw-1.5rem)] max-w-[360px] sm:w-[calc(100vw-3rem)] md:w-[360px] animate-in fade-in slide-in-from-bottom-4 duration-200 ${panelBottomClass} ${panelPositionClass}`}>
          <div className="relative flex h-[min(520px,calc(100dvh-8rem))] sm:h-[min(540px,calc(100vh-3.5rem))] flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_30px_80px_-20px_hsl(var(--foreground)/0.35)]">
            {/* Header */}
            <div className="relative overflow-hidden bg-foreground px-4 pb-4 pt-3.5 text-background">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/15">
                      <MessageCircle className="h-5 w-5 text-background" />
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 z-10 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-foreground ${closed ? "bg-muted-foreground" : "bg-success"}`}>
                      {!closed && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-background" />}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight truncate">{headerName}</p>
                    <p className="mt-0.5 text-[11px] text-background/65">
                      {closed ? "Samtalen er afsluttet" : "Skriv direkte til os"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {chats.length > 0 && (
                    <button
                      onClick={() => setShowInbox(true)}
                      aria-label="Vis mine samtaler"
                      title="Mine samtaler"
                      className="relative rounded-md p-1.5 text-background/70 transition-colors hover:bg-background/10 hover:text-background"
                    >
                      <MessagesSquare className="h-4 w-4" />
                      {chats.length > 1 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                          {chats.length}
                        </span>
                      )}
                    </button>
                  )}
                  {conversation && (
                    <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Flere handlinger"
                          title="Handlinger"
                          className="rounded-md p-1.5 text-background/70 transition-colors hover:bg-background/10 hover:text-background"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={8} className="z-[80] w-60 rounded-xl border border-border bg-card p-1 text-foreground shadow-xl">
                        {!closed && (
                          <DropdownMenuItem
                            onSelect={endChatSession}
                            className="cursor-pointer gap-2 rounded-md text-[13px] text-foreground focus:bg-secondary focus:text-foreground"
                          >
                            <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            Afslut denne samtale
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={startNewConversation}
                          className="cursor-pointer gap-2 rounded-md text-[13px] text-foreground focus:bg-secondary focus:text-foreground"
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          Start ny samtale
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={deleteCurrentConversation}
                          className="cursor-pointer gap-2 rounded-md text-[13px] text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Slet samtale
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <button
                    onClick={toggleMute}
                    aria-label={muted ? "Slå lyd til" : "Slå lyd fra"}
                    title={muted ? "Slå lyd til" : "Slå lyd fra"}
                    className="rounded-md p-1.5 text-background/70 transition-colors hover:bg-background/10 hover:text-background"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Luk chat"
                    className="rounded-md p-1.5 text-background/70 transition-colors hover:bg-background/10 hover:text-background"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {showInbox && (
              <div className="absolute inset-0 z-30 flex flex-col bg-card">
                <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-3 py-3">
                  <button
                    onClick={() => setShowInbox(false)}
                    aria-label="Tilbage til samtale"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <p className="text-[13px] font-semibold text-foreground">Mine samtaler</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <ChatInboxList chats={chats} activeKey={businessKey(businessId)} onSelect={selectChat} onDelete={deleteChat} />
                </div>
              </div>
            )}

            {!conversation ? (
              <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-5">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-secondary/20 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stil et spørgsmål</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground">
                    👋 Skriv direkte til {headerName}. Vi svarer som regel inden for kort tid.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Navn
                    <input
                      type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
                      placeholder="Dit navn"
                    />
                  </label>
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Email
                    <input
                      type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
                      placeholder="dig@eksempel.dk"
                    />
                  </label>
                </div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Emne (valgfrit)
                  <input
                    type="text" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
                    placeholder="fx Pris på vinduespudsning"
                  />
                </label>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Din besked
                  <textarea
                    value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} maxLength={2000} rows={4}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); startConversation(); } }}
                    className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
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
                  Din email bruges kun til at svare på din henvendelse.
                </p>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-4 py-4 scroll-smooth">
                  <div className="mx-auto max-w-[85%] rounded-full bg-card px-3 py-1 text-center text-[10px] text-muted-foreground shadow-sm">
                    Samtale startet · {formatTime(messages[0]?.created_at || new Date().toISOString())}
                  </div>

                  {messages.length === 1 && messages[0].sender_type === "visitor" && (
                    <div className="mx-auto max-w-[85%] rounded-2xl border border-dashed border-border bg-card/60 p-3 text-center">
                      <Loader2 className="mx-auto mb-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">Venter på svar fra {headerName}…</p>
                    </div>
                  )}

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
                    const mine = m.sender_type === "visitor";
                    const prev = messages[i - 1];
                    const showAvatar = !mine && (!prev || prev.sender_type !== m.sender_type || prev.is_system);
                    let lastVisitorIdx = -1;
                    for (let j = messages.length - 1; j >= 0; j--) {
                      if (messages[j].sender_type === "visitor" && !messages[j].is_system) { lastVisitorIdx = j; break; }
                    }
                    const isLastMine = mine && i === lastVisitorIdx;
                    return (
                      <div key={m.id} className={`flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <div className="w-7 flex-shrink-0">
                            {showAvatar && (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background">
                                <MessageCircle className="h-3.5 w-3.5" />
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
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      Samtalen er afsluttet
                    </div>
                    <p className="text-[11px] text-muted-foreground">Du kan altid starte en ny henvendelse herunder.</p>
                    <button
                      onClick={startNewConversation}
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-all hover:bg-foreground/90"
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
                        className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
                      />
                      <button
                        onClick={() => sendMessage()} disabled={sending || (!draft.trim() && !pendingImage)} aria-label="Send"
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between px-1">
                      <span className="text-[10px] text-muted-foreground">Enter sender · max 5 MB billede</span>
                      <button onClick={deleteCurrentConversation} className="text-[10px] text-muted-foreground transition-colors hover:text-destructive">
                        Slet samtale
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

export default BusinessLiveChatWidget;