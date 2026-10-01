import { useMemo } from "react";
import { StatCard } from "@/components/admin/shared/AdminUI";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";

export type LiveChatStatsConversation = {
  id: string;
  status: string;
  unread_admin_count: number;
  created_at: string;
  first_admin_reply_at?: string | null;
};

type FeedbackRow = { rating: string };

const formatResponse = (minutes: number | null) => {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min.`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours} t. ${mins} min.` : `${hours} t.`;
};

export const LiveChatStats = ({
  conversations,
  feedback = [],
}: {
  conversations: LiveChatStatsConversation[];
  feedback?: FeedbackRow[];
}) => {
  const stats = useMemo(() => {
    const open = conversations.filter((conversation) => conversation.status !== "closed");
    const unanswered = open.filter((conversation) => !conversation.first_admin_reply_at).length;
    const responseMinutes = conversations
      .filter((conversation) => conversation.first_admin_reply_at)
      .map((conversation) => (
        new Date(conversation.first_admin_reply_at as string).getTime() - new Date(conversation.created_at).getTime()
      ) / 60_000)
      .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);
    const averageResponse = responseMinutes.length
      ? responseMinutes.reduce((sum, minutes) => sum + minutes, 0) / responseMinutes.length
      : null;
    const positive = feedback.filter((row) => row.rating === "up").length;
    const measured = feedback.length > 0 ? Math.round((positive / feedback.length) * 100) : null;
    return { open: open.length, unanswered, averageResponse, measured };
  }, [conversations, feedback]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Aktive samtaler" value={stats.open} icon={<BrandedIllustration name="activeConversations" />} />
      <StatCard label="Ubesvarede beskeder" value={stats.unanswered} icon={<BrandedIllustration name="unansweredMessages" />} tone={stats.unanswered > 0 ? "warn" : "ok"} />
      <StatCard label="Svartid" value={formatResponse(stats.averageResponse)} icon={<BrandedIllustration name="responseTime" />} hint="Faktisk første svartid" />
      <StatCard
        label="Kundetilfredshed"
        value={stats.measured === null ? "Ikke målt endnu" : `${stats.measured}%`}
        icon={<BrandedIllustration name="customerSatisfaction" />}
        hint={stats.measured === null ? "Vises, når kunder giver feedback" : `${feedback.length} svar`}
        tone={stats.measured === null ? "neutral" : "ok"}
      />
    </div>
  );
};

export default LiveChatStats;