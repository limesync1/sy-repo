// Delte typer, konstanter og formattere for livechat-fanen.
// Holdes som ren data så både orkestrator og præsentations-komponenter kan
// importere uden cirkulære afhængigheder.
export type Conversation = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  subject: string | null;
  status: string;
  last_message_at: string;
  unread_admin_count: number;
  user_id: string | null;
  created_at: string;
  needs_human?: boolean;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string | null;
  image_url?: string | null;
  is_system?: boolean;
  created_at: string;
};

export type Filter = "all" | "open" | "unread" | "closed" | "snoozed";
export type SortMode = "recent" | "unread_first" | "oldest";

export const CANNED_KEY = "serviceydere_admin_canned_v3";

export const DEFAULT_CATEGORIES = ["Velkomst", "Pris", "Support", "Opfølgning", "Afslutning"];

export const formatTime = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  if (sameDay) return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";