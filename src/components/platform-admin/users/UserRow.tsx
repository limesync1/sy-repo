import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Clock, Lock } from "lucide-react";
import { AdminUser, roleColor, loginStatus } from "./shared";

interface Props {
  user: AdminUser;
  onOpen: (u: AdminUser) => void;
}

export default function UserRow({ user: u, onOpen }: Props) {
  const isAdmin = u.roles.includes("admin");
  const ls = loginStatus(u.last_sign_in_at);
  return (
    <button
      type="button"
      onClick={() => onOpen(u)}
      className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 focus-visible:bg-secondary/40 focus-visible:outline-none"
    >
      <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
        {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="truncate text-sm font-semibold text-foreground">{u.display_name || "Uden navn"}</p>
          {u.roles.length === 0 ? (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">Kunde</Badge>
          ) : (
            u.roles.map((r) => (
              <Badge key={r} className={`text-[10px] h-5 px-1.5 border ${roleColor(r)}`}>
                {r === "admin" ? "Admin" : r === "business_owner" ? "Virksomhed" : r}
              </Badge>
            ))
          )}
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${ls.tone}`}>
            <Clock className="h-2.5 w-2.5" />{ls.label}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
          <Mail className="h-3 w-3" />{u.email || "—"}
          {u.phone && <span> · {u.phone}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground/80">
          Tilmeldt {new Date(u.auth_created_at).toLocaleDateString("da-DK")} · {Number(u.orders_count)} ordrer · {Number(u.businesses_count)} virksomheder
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {isAdmin && (
          <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">
            <Lock className="h-3 w-3" /> Admin (låst)
          </span>
        )}
        {u.email && (
          <Button asChild size="icon" variant="ghost" className="h-9 w-9"
            aria-label={`Email ${u.email}`} onClick={(e) => e.stopPropagation()}>
            <a href={`mailto:${u.email}`}><Mail className="h-4 w-4" /></a>
          </Button>
        )}
      </div>
    </button>
  );
}