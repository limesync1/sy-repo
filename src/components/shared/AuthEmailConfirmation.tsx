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
  return <div className="space-y-4 rounded-lg border border-accent/25 bg-accent/5 p-5" role="status">
    <Mail className="h-7 w-7 text-accent" aria-hidden />
    <h2 className="text-lg font-semibold text-foreground">Tjek din e-mail</h2>
    <p className="break-words text-sm leading-6 text-muted-foreground">
      Hvis adressen kan bruges til en ny konto, sender vi et bekræftelseslink til <strong className="text-foreground">{email}</strong>.
      {" "}Kontoen er først klar, når du har bekræftet din e-mail. Tjek også spam.
    </p>
    <p className="text-sm leading-6 text-muted-foreground">Har du allerede en konto? Log ind med din eksisterende adgangskode, eller vælg Glemt adgangskode.</p>
    {business && <p className="text-sm leading-6 text-muted-foreground">Efter bekræftelsen kan du fortsætte her med dine virksomhedsvalg. Virksomheden er ikke oprettet endnu.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {resent && !error && <p className="text-sm text-muted-foreground">Hvis kontoen afventer bekræftelse, får du et nyt link.</p>}
    <div className="flex flex-wrap gap-2">
      <Button asChild><Link to={loginPath}>Log ind</Link></Button>
      <Button variant="outline" disabled={sending || emailCooldown > 0} onClick={resend}>
        {sending ? "Sender…" : emailCooldown > 0 ? `Send igen om ${emailCooldown} s` : "Send bekræftelseslink igen"}
      </Button>
      <Button variant="ghost" onClick={onEdit}>Ret e-mail</Button>
    </div>
  </div>;
}