// Eksport af en hel samtale som .txt — bruges fra livechat-headeren til at
// arkivere support-sager udenfor systemet (juridik, kunde-ønske om
// dataudtræk, intern kvalitetssikring). Vi laver en simpel, læsbar
// transskription i stedet for JSON for at gøre den nem at sende videre.

type ExportMessage = {
  sender_type: "visitor" | "admin";
  sender_name: string;
  content: string | null;
  image_url?: string | null;
  is_system?: boolean;
  metadata?: { kind?: string; [key: string]: unknown } | null;
  created_at: string;
};

type ExportConversation = {
  visitor_name: string;
  visitor_email: string;
  subject: string | null;
  status: string;
  created_at: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("da-DK", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

export const buildTranscript = (conv: ExportConversation, messages: ExportMessage[]): string => {
  const header = [
    "Serviceydere — Livechat-transskription",
    "".padEnd(60, "="),
    `Kunde:    ${conv.visitor_name} <${conv.visitor_email}>`,
    `Emne:     ${conv.subject || "(ingen)"}`,
    `Status:   ${conv.status}`,
    `Startet:  ${fmt(conv.created_at)}`,
    `Eksport:  ${fmt(new Date().toISOString())}`,
    "".padEnd(60, "="),
    "",
  ].join("\n");

  const body = messages.map((m) => {
    const ts = fmt(m.created_at);
    if (m.is_system) return `[${ts}] -- ${m.content || ""}`;
    const who =
      m.sender_type === "admin"
        ? (m.metadata?.kind === "ai" ? "Serviceydere AI" : `Admin (${m.sender_name})`)
        : m.sender_name;
    const parts = [`[${ts}] ${who}:`];
    if (m.content) parts.push(m.content);
    if (m.image_url) parts.push(`(billede: ${m.image_url})`);
    return parts.join("\n");
  }).join("\n\n");

  return header + body + "\n";
};

export const downloadTranscript = (conv: ExportConversation, messages: ExportMessage[]) => {
  const txt = buildTranscript(conv, messages);
  const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName = conv.visitor_name.replace(/[^a-z0-9æøå-]+/gi, "-").slice(0, 40) || "samtale";
  const dateStamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-${safeName}-${dateStamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
