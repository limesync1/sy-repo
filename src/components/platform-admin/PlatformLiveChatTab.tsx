import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, Send, Loader2, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

/**
 * Platform-admin livechat-fane: liste af samtaler + chat-vindue.
 * Realtime opdatering af både samtale-listen og beskeder.
 */

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
  content: string;
  created_at: string;
};

const PlatformLiveChatTab = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [adminName, setAdminName] = useState("Support");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load admin display name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setAdminName(data.display_name);
      });
  }, [user]);

  // Load conversations + subscribe
  useEffect(() => {
    const load = () => {
      supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(100)
        .then(({ data }) => {
          if (data) setConversations(data as Conversation[]);
        });
    };
    load();

    const channel = supabase
      .channel("admin-chat-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load messages for active conversation + subscribe
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

    // Reset unread admin count
    supabase
      .from("chat_conversations")
      .update({ unread_admin_count: 0 })
      .eq("id", activeId)
      .then(() => {});

    const channel = supabase
      .channel(`admin-chat-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
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
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  const sendReply = async () => {
    if (!active || !draft.trim() || sending) return;
    setSending(true);
    const content = draft.trim().slice(0, 2000);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: active.id,
      sender_type: "admin",
      sender_name: adminName,
      content,
    });
    setSending(false);
    if (!error) setDraft("");
  };

  const closeConversation = async (id: string) => {
    await supabase.from("chat_conversations").update({ status: "closed" }).eq("id", id);
  };

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* List */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Livechat</h2>
          </div>
          <span className="text-xs text-muted-foreground">{conversations.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">
              Ingen samtaler endnu.
            </p>
          )}
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors ${
                  isActive ? "bg-accent/10" : "hover:bg-secondary/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {c.visitor_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.unread_admin_count > 0 && (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                        {c.unread_admin_count}
                      </span>
                    )}
                    {c.status === "closed" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {c.subject || c.visitor_email}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.last_message_at), { locale: da, addSuffix: true })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Vælg en samtale for at svare.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {active.visitor_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {active.visitor_email}
                  {active.subject ? ` · ${active.subject}` : ""}
                  {active.user_id ? " · 🟢 Logget ind" : " · Gæst"}
                </p>
              </div>
              {active.status !== "closed" && (
                <button
                  onClick={() => closeConversation(active.id)}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  Afslut
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-secondary/40 p-4">
              {messages.map((m) => {
                const mine = m.sender_type === "admin";
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        mine
                          ? "rounded-br-sm bg-foreground text-background"
                          : "rounded-bl-sm border border-border bg-card text-foreground"
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

            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  maxLength={2000}
                  rows={2}
                  placeholder="Skriv et svar…"
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !draft.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformLiveChatTab;