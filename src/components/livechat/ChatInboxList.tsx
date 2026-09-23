import { MessageCircle, Trash2 } from "lucide-react";
import { platformKey, type RegisteredChat } from "./chatRegistry";
import supportPortrait from "@/assets/serviceydere-support.jpg.asset.json";

type Props = {
  chats: RegisteredChat[];
  activeKey: string;
  onSelect: (chat: RegisteredChat) => void;
  onDelete: (chat: RegisteredChat) => void;
};

const ChatAvatar = ({ chat }: { chat: RegisteredChat }) => {
  if (chat.scope === "platform") {
    return <img src={supportPortrait.url} alt="Serviceydere kundeservice" className="h-11 w-11 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
      <MessageCircle className="h-4 w-4" />
    </div>
  );
};

const ChatRow = ({ chat, active, onSelect, onDelete }: { chat: RegisteredChat; active: boolean; onSelect: () => void; onDelete: () => void }) => (
  <div
    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 transition-colors ${
      active ? "border-foreground bg-secondary/60" : "border-border bg-card hover:border-foreground/30 hover:bg-secondary/40"
    }`}
  >
    <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <ChatAvatar chat={chat} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-foreground">{chat.label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {chat.scope === "platform" ? "Kundeservice" : "Virksomhed"}
          {active && " · åben her"}
        </span>
      </span>
    </button>
    <button
      type="button"
      onClick={onDelete}
      aria-label={`Slet ${chat.label} fra mine samtaler`}
      title="Slet samtale"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

const ChatInboxList = ({ chats, activeKey, onSelect, onDelete }: Props) => {
  const platformChat = chats.find((chat) => chat.key === platformKey());
  const businessChats = chats.filter((chat) => chat.scope === "business");

  if (chats.length === 0) {
    return <p className="px-3 py-4 text-[12px] text-muted-foreground">Ingen gemte samtaler endnu.</p>;
  }

  return (
    <div className="space-y-4 p-2">
      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Serviceydere kundeservice livechat</p>
          {platformChat && <span className="text-[10px] text-muted-foreground">1</span>}
        </div>
        {platformChat ? (
          <ChatRow
            chat={platformChat}
            active={platformChat.key === activeKey}
            onSelect={() => onSelect(platformChat)}
            onDelete={() => onDelete(platformChat)}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">Ingen samtale med kundeservice.</p>
        )}
      </section>

      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Virksomheder</p>
          {businessChats.length > 0 && <span className="text-[10px] text-muted-foreground">{businessChats.length}</span>}
        </div>
        {businessChats.length > 0 ? (
          <div className="space-y-1.5">
            {businessChats.map((chat) => (
              <ChatRow
                key={chat.key}
                chat={chat}
                active={chat.key === activeKey}
                onSelect={() => onSelect(chat)}
                onDelete={() => onDelete(chat)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-[12px] text-muted-foreground">Ingen samtaler med virksomheder.</p>
        )}
      </section>
    </div>
  );
};

export default ChatInboxList;