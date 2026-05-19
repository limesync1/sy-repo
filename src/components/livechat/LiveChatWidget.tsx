import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  MessageCircle, Send, Loader2, ChevronDown, CheckCheck, Paperclip, X as XIcon,
  ImageIcon, Volume2, VolumeX, MoreVertical, MessagesSquare, ArrowLeft, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { z } from "zod";
import chatSounds from "./chatSounds";
import ChatInboxList from "./ChatInboxList";
import BusinessRecommendationCard from "./BusinessRecommendationCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  upsertChat,
  removeChat,
  listChats,
  subscribeToRegistry,
  platformKey,
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
  metadata?: Record<string, any> | null;
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

// Serviceydere-support må gerne vises i virksomhedspanelet (/virksomhed
// og /virksomhed/...), så virksomhedsejere kan kontakte os direkte derfra.
// Den skjules stadig på medarbejder-app, godkend-bestilling og platform-admin
// samt på virksomhedernes egne offentlige sider (/v/:slug), hvor virksomhedens
// egen livechat tager over.
const HIDDEN_PREFIXES = ["/admin", "/medarbejder", "/godkend-bestilling", "/v/"];
const HIDDEN_EXACT: string[] = [];
// På virksomhedspanelet skal selve widget'en stadig fungere (åbnes via "Support"-knap
// i topbjælken), men den flydende kundeservice-knap skjules så den ikke overlapper
// andre knapper i fx ruteplanlæggeren eller på "Aftaler"-siden.
const HIDE_TRIGGER_PREFIXES = ["/virksomhed"];

// Topic-based dynamic recommended replies. Keys are matched against the
// visitor's recent message content (case-insensitive keyword match).
// Vi viser KUN forslag hvis vi har et tydeligt emne-match — generiske
// fallback-forslag fjerner vi bevidst, så vi aldrig foreslår noget der
// ikke giver mening i konteksten.
const TOPIC_REPLIES: { keywords: string[]; replies: string[] }[] = [
  {
    keywords: ["pris", "koste", "gratis", "tilbud", "pakke", "abonnement", "betaling"],
    replies: [
      "Koster det noget at bruge platformen som kunde?",
      "Hvordan får jeg op til 3 tilbud?",
      "Hvad indeholder udbyderplatformen?",
    ],
  },
  {
    keywords: ["bestil", "ordre", "booking", "book", "kurv", "profil", "anmeldelser"],
    replies: [
      "Hvordan finder jeg en udbyder nær mig?",
      "Kan jeg sammenligne priser og anmeldelser?",
      "Kan jeg booke direkte hos en udbyder?",
    ],
  },
  {
    keywords: ["virksomhed", "firma", "tilmeld", "opret", "cvr", "udbyder", "partner", "leads"],
    replies: [
      "Hvordan opretter jeg min virksomhed?",
      "Hvilke funktioner får jeg som udbyder?",
      "Hvordan modtager jeg leads?",
    ],
  },
  {
    keywords: ["rengør", "vinduespuds", "havemand", "have", "flytte", "håndværk", "maler", "vvs", "elektriker", "tømrer", "sikkerhed", "kategori"],
    replies: [
      "Hvilke kategorier kan jeg søge i?",
      "Hvordan finder jeg den rette udbyder?",
      "Kan jeg filtrere efter by?",
    ],
  },
];

const UNSAFE_SUGGESTION_TERMS = [
  "menneske", "rigtig person", "medarbejder", "ring", "telefon", "frustreret",
  "klage", "refund", "refusion", "faktura", "juridisk", "ved ikke", "ikke sikker",
  "henter en rigtig", "vender tilbage", "som hurtigst muligt",
];

const getDynamicReplies = (msgs: { sender_type: string; content?: string | null; is_system?: boolean }[]): string[] => {
  // Kig på de seneste beskeder fra både besøgende og support — så forslagene
  // matcher det aktuelle emne, ikke kun hvad brugeren selv har skrevet.
  const recent = msgs
    .filter((m) => !m.is_system && m.content)
    .slice(-4)
    .map((m) => (m.content || "").toLowerCase())
    .join(" ");
  if (!recent) return [];
  if (UNSAFE_SUGGESTION_TERMS.some((term) => recent.includes(term))) return [];

  const matched = new Map<string, number>();
  for (const topic of TOPIC_REPLIES) {
    const hits = topic.keywords.reduce((n, k) => (recent.includes(k) ? n + 1 : n), 0);
    if (hits > 0) {
      for (const r of topic.replies) matched.set(r, (matched.get(r) || 0) + hits);
    }
  }
  // Ingen klar emne-match → vis ingen forslag i stedet for at gætte.
  if (matched.size === 0) return [];
  return Array.from(matched.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([r]) => r);
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const LiveChatWidget = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { count: cartCount, sheetOpen: cartSheetOpen } = useCart();

  const [open, setOpenState] = useState<boolean>(() => {
    try { return sessionStorage.getItem("serviceydere_chat_open") === "1"; } catch { return false; }
  });
  const setOpen = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v;
      try { sessionStorage.setItem("serviceydere_chat_open", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);
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
  const [showInbox, setShowInbox] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [chats, setChats] = useState<RegisteredChat[]>(() => listChats());
  useEffect(() => subscribeToRegistry(() => setChats(listChats())), []);
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: "current" } | { kind: "chat"; chat: RegisteredChat }>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);
  const userScrolledUpRef = useRef(false);

  const hidden = useMemo(
    () =>
      HIDDEN_EXACT.includes(pathname) ||
      HIDDEN_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p)),
    [pathname],
  );
  const hideTrigger = useMemo(
    () => HIDE_TRIGGER_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p)),
    [pathname],
  );

  // Tillad eksterne knapper (fx "Support" i virksomhedspanelets header) at åbne
  // platform-chatten via et window-event, selv når den flydende knap er skjult.
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("serviceydere:open-platform-chat", handler);
    return () => window.removeEventListener("serviceydere:open-platform-chat", handler);
  }, [setOpen]);

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
          else { localStorage.removeItem(STORAGE_KEY); removeChat(platformKey()); }
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [hidden]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("serviceydere_open_chat_key") !== platformKey()) return;
      sessionStorage.removeItem("serviceydere_open_chat_key");
      setOpen(true);
      setShowInbox(false);
    } catch {}
  }, [setOpen]);

  // Registrer platform-samtalen så den dukker op i "Mine samtaler".
  useEffect(() => {
    if (!conversation) return;
    upsertChat({
      key: platformKey(),
      scope: "platform",
      label: "Serviceydere Kundeservice",
    });
  }, [conversation]);

  useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    initialLoadRef.current = true;
    supabase
      .from("chat_messages")
      .select("id, conversation_id, sender_type, sender_name, content, image_url, is_system, metadata, created_at")
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
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversation.id}` },
        (payload) => {
          const next = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
          if (lastMsgIdRef.current !== next.id) {
            lastMsgIdRef.current = next.id;
            // Play sound for incoming admin messages (not our own optimistic ones)
            if (!initialLoadRef.current && next.sender_type === "admin" && !next.is_system) {
              chatSounds.incoming();
            } else if (next.is_system) {
              chatSounds.system();
            }
          }
          // Mark as read when widget is open
          if (open && next.sender_type === "admin") {
            supabase.from("chat_conversations").update({ unread_visitor_count: 0 }).eq("id", conversation.id).then(() => {});
          }
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
  }, [conversation, open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    // Only auto-scroll if user is near bottom or it's the initial load.
    // This lets the user scroll up to read history without being yanked back down.
    if (initialLoadRef.current || !userScrolledUpRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: initialLoadRef.current ? "auto" : "smooth" });
    }
  }, [messages, open]);

  // Når popup'en åbnes på ny, skal vi altid hoppe ned til seneste besked.
  useEffect(() => {
    if (!open) return;
    userScrolledUpRef.current = false;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [open, conversation?.id, showInbox]);

  // Track whether the user has scrolled away from the bottom.
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
      upsertChat({ key: platformKey(), scope: "platform", label: "Serviceydere Kundeservice" });
      setFirstMessage("");
      setSubject("");
      chatSounds.outgoing();

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

  const sendMessage = useCallback(async (override?: string) => {
    if (!conversation || sending) return;
    const text = (override ?? draft).trim();
    if (!text && !pendingImage) return;
    if (conversation.status === "closed") return;

    setSending(true);
    let image_url: string | null = null;
    if (pendingImage && override === undefined) {
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
      if (override === undefined) { setDraft(""); clearPendingImage(); }
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
    // Don't clear locally — keep the closed conversation visible so the visitor
    // can see status changes (closed/reopened) and start a new chat when ready.
    setConversation((prev) => (prev ? { ...prev, status: "closed" } : prev));
  };

  const performDeleteCurrent = async () => {
    if (!conversation) return;
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
    removeChat(platformKey());
    setConversation(null);
    setMessages([]);
    setDraft("");
    clearPendingImage();
    chatSounds.system();
  };
  const deleteCurrentConversation = () => setConfirmDelete({ kind: "current" });

  const startNewConversation = () => {
    // Tøm lokal state og fjern session-token, så brugeren får start-formularen igen.
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    removeChat(platformKey());
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
    if (chat.key === platformKey()) { setShowInbox(false); return; }
    if (chat.scope === "business" && chat.href) {
      try { sessionStorage.setItem("serviceydere_open_chat_key", chat.key); } catch {}
      window.location.href = chat.href;
    }
  };

  const performDeleteChat = (chat: RegisteredChat) => {
    if (chat.key === platformKey()) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      if (conversation) {
        supabase.from("chat_conversations").update({ status: "closed" }).eq("id", conversation.id).then(() => {});
      }
      setConversation(null);
      setMessages([]);
    } else if (chat.scope === "business" && chat.businessId) {
      try { localStorage.removeItem(`serviceydere_biz_chat_${chat.businessId}_v1`); } catch {}
    }
    removeChat(chat.key);
    setChats(listChats());
  };
  const deleteChat = (chat: RegisteredChat) => setConfirmDelete({ kind: "chat", chat });

  // Adaptive positioning so we never overlap CartFab on mobile or desktop
  const cartFabVisible =
    cartCount > 0 &&
    !cartSheetOpen &&
    (pathname.startsWith("/v/") || pathname === "/demo" || pathname === "/tilbud");
  const isMobile = useIsMobile();

  // Layout: CartFab er rykket mod venstre på desktop, så livechat altid kan
  // sidde yderst til højre. På mobil stables livechat ovenover bestilling
  // (vi løfter bottom) for at undgå at de overlapper i siden.
  const fabBottomClass = cartFabVisible
    ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    : "bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]";
  const fabPositionClass =
    "right-[calc(env(safe-area-inset-right,0px)+1.25rem)] sm:right-[calc(env(safe-area-inset-right,0px)+1.5rem)]";

  const panelBottomClass = fabBottomClass;
  const panelPositionClass = fabPositionClass;

  // Publicér FAB'ens bredde som CSS-variabel, så CartFab kan sidde lige til
  // venstre for livechat-knappen på desktop uden at overlappe.
  const fabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = fabRef.current;
    const root = document.documentElement;
    if (!el || open || hidden || hideTrigger) {
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
  }, [open, hidden, hideTrigger]);

  const lastAdminMsg = [...messages].reverse().find((m) => m.sender_type === "admin" && !m.is_system);
  const lastVisitorMsg = [...messages].reverse().find((m) => m.sender_type === "visitor" && !m.is_system);
  const showRecommended =
    !!lastAdminMsg &&
    (!lastVisitorMsg || new Date(lastAdminMsg.created_at) > new Date(lastVisitorMsg.created_at));
  const dynamicReplies = useMemo(() => getDynamicReplies(messages), [messages]);

  const unreadAdmin = messages.some((m) => m.sender_type === "admin") && !open;
  const closed = conversation?.status === "closed";

  if (hidden) return null;

  return (
    <>
      {!open && !hideTrigger && (
        <button
          ref={fabRef}
          type="button"
          onClick={handleOpen}
          aria-label="Åbn livechat"
          className={`group fixed z-40 flex items-center gap-2 overflow-hidden rounded-full bg-foreground py-2 pl-2.5 pr-4 text-xs font-semibold text-background shadow-[0_20px_50px_-22px_hsl(var(--foreground)/0.6)] transition-all hover:scale-[1.03] active:scale-[0.97] ${fabBottomClass} ${fabPositionClass}`}
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-visible">
            <img
              src="/serviceydere-ikon.webp"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 object-contain"
            />
            <span className="absolute -right-1 -top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success ring-2 ring-foreground"></span>
            </span>
          </span>
          <span className="relative">Kundeservice</span>
        </button>
      )}

      {open && (
        <div
          className={
            isMobile
              ? "fixed inset-0 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200"
              : `fixed z-50 w-[calc(100vw-3rem)] max-w-[420px] md:w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-200 ${panelBottomClass} ${panelPositionClass}`
          }
        >
          <div
            className={
              isMobile
                ? "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-card"
                : "relative flex h-[min(680px,calc(100vh-3rem))] flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_40px_100px_-30px_hsl(204_96%_13%/0.45)] ring-1 ring-black/[0.04]"
            }
          >
            {/* Header — matcher Serviceydere hero (mørk navy + cyan glows) */}
            <div
              className="relative overflow-hidden px-5 pb-5 pt-4 text-background"
              style={{ backgroundColor: "hsl(var(--hero-bg))" }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div
                  className="absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40 blur-[60px]"
                  style={{ backgroundColor: "hsl(var(--hero-mid))" }}
                />
                <div
                  className="absolute -left-12 -bottom-16 h-44 w-44 rounded-full opacity-25 blur-[55px]"
                  style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(ellipse 90% 70% at 90% 0%, hsl(var(--hero-cyan-bright) / 0.18), transparent 60%)",
                  }}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-background/10" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background/[0.1] backdrop-blur-sm">
                    <img src="/serviceydere-ikon.webp" alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-tight">Serviceydere Kundeservice</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-background/65">
                      <span className={`h-1.5 w-1.5 rounded-full ${closed ? "bg-muted-foreground" : "animate-pulse bg-success"}`} />
                      {closed ? "Samtalen er afsluttet" : "Vi svarer typisk inden for kort tid"}
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
                  <ChatInboxList chats={chats} activeKey={platformKey()} onSelect={selectChat} onDelete={deleteChat} />
                </div>
              </div>
            )}

            {!conversation ? (
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-gradient-to-b from-secondary/30 via-background to-background px-5 py-5">
                {/* Pretty empty-state */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl" style={{ backgroundColor: "hsl(var(--hero-cyan) / 0.18)" }} />
                  <div aria-hidden className="pointer-events-none absolute -left-8 -bottom-10 h-24 w-24 rounded-full blur-2xl" style={{ backgroundColor: "hsl(var(--hero-mid) / 0.12)" }} />
                  <div className="relative mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                      Vi er online
                    </span>
                  </div>
                  <p className="relative text-[15px] font-semibold leading-snug text-foreground">
                    Hej 👋 Hvad kan vi hjælpe med?
                  </p>
                  <p className="relative mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    Vores kundeservice svarer typisk hurtigt. Skriv din henvendelse, så vender vi tilbage til dig.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Navn</span>
                      <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                        placeholder="Dit navn"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Email</span>
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                        placeholder="dig@eksempel.dk"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Din besked</span>
                    <textarea
                      value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} maxLength={2000} rows={4}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); startConversation(); } }}
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                      placeholder="Fx: Jeg skal bruge vinduespudsning i Aarhus…"
                    />
                  </label>
                </div>

                {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

                <button
                  onClick={startConversation} disabled={starting}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-[0_10px_26px_-12px_hsl(var(--foreground)/0.55)] transition-all hover:bg-foreground/90 hover:shadow-[0_14px_30px_-12px_hsl(var(--foreground)/0.7)] disabled:opacity-60 disabled:shadow-none"
                >
                  {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
                  Start samtale
                </button>

                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-success" /> Vi vender hurtigt tilbage</span>
                  <span className="h-3 w-px bg-border" />
                  <span>Vi bruger kun din email til at svare</span>
                </div>
              </div>
            ) : (
              <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-secondary/40 via-background to-background px-4 py-5 scroll-smooth">
                  <div className="mx-auto w-fit rounded-full border border-border/70 bg-card/80 px-3 py-1 text-center text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
                    Samtale startet · {formatTime(messages[0]?.created_at || new Date().toISOString())}
                  </div>

                  {messages.map((m, i) => {
                    if (m.is_system) {
                      return (
                        <div key={m.id} className="flex justify-center animate-in fade-in duration-200">
                          <span className="rounded-full border border-border bg-card px-3 py-1 text-[10px] text-muted-foreground">
                            {m.content} · {formatTime(m.created_at)}
                          </span>
                        </div>
                      );
                    }
                    if (m.metadata?.kind === "business_recommendation" && m.metadata?.business) {
                      return (
                        <BusinessRecommendationCard
                          key={m.id}
                          metadata={m.metadata as any}
                          createdAt={m.created_at}
                        />
                      );
                    }
                    const mine = m.sender_type === "visitor";
                    const prev = messages[i - 1];
                    const showAvatar = !mine && (!prev || prev.sender_type !== m.sender_type || prev.is_system || prev.sender_name !== m.sender_name);
                    let lastVisitorIdx = -1;
                    for (let j = messages.length - 1; j >= 0; j--) {
                      if (messages[j].sender_type === "visitor" && !messages[j].is_system) { lastVisitorIdx = j; break; }
                    }
                    const isLastMine = mine && i === lastVisitorIdx;
                    return (
                      <div key={m.id} className={`flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <div className="w-9 flex-shrink-0">
                            {showAvatar && (
                              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card">
                                <img src="/serviceydere-ikon.webp" alt="" aria-hidden="true" className="h-6 w-6 object-contain" />
                              </span>
                            )}
                          </div>
                        )}
                        <div className={`flex max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`}>
                          {!mine && showAvatar && (
                            <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground">
                              <span className="text-foreground/80">{m.sender_name || "Serviceydere"}</span>
                            </div>
                          )}
                          <div
                            className={`overflow-hidden rounded-2xl text-[13.5px] leading-snug shadow-[0_2px_6px_-2px_hsl(var(--foreground)/0.08)] ${
                              mine
                                ? "rounded-br-md bg-foreground text-background"
                                : "rounded-bl-md border border-border bg-card text-foreground"
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
                  <div className="border-t border-border bg-gradient-to-b from-card to-secondary/30 p-5 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <CheckCheck className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-[13px] font-semibold text-foreground">Samtalen er afsluttet</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Tak fordi du skrev til os. Du kan altid starte en ny samtale.</p>
                    <button
                      onClick={startNewConversation}
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-[0_8px_22px_-12px_hsl(var(--foreground)/0.6)] transition-all hover:bg-foreground/90"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Start en ny samtale
                    </button>
                  </div>
                ) : (
                  <>
                    {showRecommended && dynamicReplies.length > 0 && !draft && !pendingImage && (
                      <div className="border-t border-border bg-card px-3 py-2.5">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Foreslåede svar</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {dynamicReplies.map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => sendMessage(r)}
                              className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-[11px] font-medium text-foreground transition-all hover:-translate-y-px hover:border-accent/40 hover:bg-card hover:text-accent"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="border-t border-border bg-card/95 px-3 py-3 backdrop-blur-sm">
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
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-secondary/40 hover:text-foreground"
                          aria-label="Vedhæft billede"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <textarea
                          ref={textareaRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          maxLength={2000} rows={1} placeholder="Skriv en besked…"
                          className="flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                        />
                        <button
                          onClick={() => sendMessage()} disabled={sending || (!draft.trim() && !pendingImage)} aria-label="Send"
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-[0_6px_18px_-8px_hsl(var(--foreground)/0.6)] transition-all hover:bg-foreground/90 hover:shadow-[0_8px_22px_-8px_hsl(var(--foreground)/0.7)] disabled:opacity-50 disabled:shadow-none"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between px-1">
                        <span className="text-[10px] text-muted-foreground">Enter sender · max 5 MB billede</span>
                        <button onClick={deleteCurrentConversation} className="text-[10px] text-muted-foreground transition-colors hover:text-destructive">
                          Slet samtale
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Slet samtale?</AlertDialogTitle>
            <AlertDialogDescription>
              Samtalen fjernes fra dine samtaler. Du kan altid starte en ny henvendelse igen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const c = confirmDelete;
                setConfirmDelete(null);
                if (!c) return;
                if (c.kind === "current") performDeleteCurrent();
                else performDeleteChat(c.chat);
              }}
            >
              Slet samtale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LiveChatWidget;
