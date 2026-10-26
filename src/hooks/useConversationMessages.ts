import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConversationMessage = {
  id: string; conversation_id: string; sender_type: "visitor" | "admin";
  sender_name: string; content: string | null; image_url?: string | null;
  is_system?: boolean; created_at: string;
};

export function useConversationMessages(id: string | null, onIncoming: (message: ConversationMessage) => void) {
  const [state, setState] = useState<{ id: string | null; messages: ConversationMessage[]; loading: boolean; error: boolean }>({ id: null, messages: [], loading: false, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const received: ConversationMessage[] = [];
    setState({ id, messages: [], loading: true, error: false });
    const load = async () => {
      try {
        const { data, error } = await supabase.from("chat_messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
        if (cancelled) return;
        if (error) { setState(s => ({ ...s, loading: false, error: true })); return; }
        const merged = new Map((data as ConversationMessage[] || []).map(m => [m.id, m]));
        for (const message of received) merged.set(message.id, message);
        setState({ id, messages: [...merged.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)), loading: false, error: false });
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false, error: true }));
      }
    };
    const markRead = () => { void supabase.from("chat_conversations").update({ unread_admin_count: 0 }).eq("id", id).then(() => {}); };
    markRead();
    const channel = supabase.channel(`biz-admin-chat-msg-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${id}` }, payload => {
        if (cancelled) return;
        const message = payload.new as ConversationMessage;
        if (message.conversation_id !== id) return;
        received.push(message);
        setState(s => s.id !== id || s.messages.some(m => m.id === message.id) ? s : { ...s, messages: [...s.messages, message] });
        onIncoming(message);
        if (message.sender_type === "visitor") markRead();
      }).subscribe();
    void load();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [id, attempt, onIncoming]);
  const current = state.id === id;
  return { messages: current ? state.messages : [], loading: !!id && (!current || state.loading), error: current && state.error, retry: () => setAttempt(n => n + 1) };
}