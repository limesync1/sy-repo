import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { translateAuthError } from "@/lib/auth-errors";

export function AuthEmailConfirmation({ email, onEdit, loginPath = "/log-ind", business = false }: {
  email: string; onEdit: () => void; loginPath?: string; business?: boolean;
}) {
  const { resendConfirmation, emailCooldown } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const resend = async () => {
    if (sending || emailCooldown > 0) return;
    setSending(true);
    setError(null);
    try {
      const result = await resendConfirmation(email, business ? "/opret-virksomhed" : "/log-ind");
      if (result.error) setError(translateAuthError(result.error));
      else setResent(true);
    } catch (e) {
      setError(translateAuthError(e));
    } finally { setSending(false); }
  };
  return <div className="space-y-4 border-t border-border py-5" role="status">
    <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10"><Mail className="h-6 w-6 text-accent" aria-hidden /></span><h3 className="text-lg font-semibold text-foreground">Bekræft din e-mail</h3></div>
    <p className="break-words text-sm leading-6 text-muted-foreground">
      For nye konti skal e-mailen bekræftes. Kig efter et link i indbakken eller spam på <strong className="break-all text-foreground">{email}</strong>.
    </p>
    <p className="text-sm leading-6 text-muted-foreground">Har du allerede en konto? Log ind med din eksisterende adgangskode, eller vælg Glemt adgangskode.</p>
    {business && <p className="text-sm leading-6 text-muted-foreground">Bekræft e-mailen, og fortsæt oprettelsen her. Din virksomhed oprettes først bagefter.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {resent && !error && <p className="text-sm text-muted-foreground">Hvis kontoen afventer bekræftelse, får du et nyt link.</p>}
    <div className="grid gap-2 sm:grid-cols-2">
      <Button asChild className="min-h-11"><Link to={loginPath}>Log ind</Link></Button>
      <Button variant="outline" className="h-auto min-h-11 whitespace-normal px-3 py-2" disabled={sending || emailCooldown > 0} onClick={resend}>
        {sending ? "Sender…" : emailCooldown > 0 ? `Send igen om ${emailCooldown} s` : "Send bekræftelseslink igen"}
      </Button>
      <Button variant="ghost" className="min-h-11 sm:col-span-2" onClick={onEdit}>{business ? "Tilbage til konto" : "Ret e-mail"}</Button>
    </div>
  </div>;
}