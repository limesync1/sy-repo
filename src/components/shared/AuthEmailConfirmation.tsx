import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import confirmIcon from "@/assets/signup-icons/bekraeft-din-email.svg.asset.json";
import { translateAuthError } from "@/lib/auth-errors";
import { supabase } from "@/integrations/supabase/client";

// Koden er 6 cifre (kan være 8, hvis login-indstillingen ikke er ændret).
const CODE_LENGTH = 8;
const MIN_CODE = 6;

export function AuthEmailConfirmation({ email, onEdit, loginPath = "/log-ind", business = false, onVerified }: {
  email: string; onEdit: () => void; loginPath?: string; business?: boolean; onVerified?: () => void;
}) {
  const { resendConfirmation, emailCooldown } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const verify = async (value = code) => {
    if (verifying || value.length < MIN_CODE) return;
    setVerifying(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ email, token: value, type: "signup" });
      if (err) {
        setError(/expired|invalid/i.test(err.message) ? "Koden er forkert eller udløbet. Prøv igen, eller få en ny kode." : translateAuthError(err));
        setCode("");
        return;
      }
      setVerified(true);
      if (onVerified) { onVerified(); return; }
      setTimeout(() => { setOpen(false); navigate("/"); }, 900);
    } catch (e) {
      setError(translateAuthError(e));
    } finally { setVerifying(false); }
  };

  const resend = async () => {
    if (sending || emailCooldown > 0) return;
    setSending(true);
    setError(null);
    try {
      const result = await resendConfirmation(email, business ? "/opret-virksomhed" : "/log-ind");
      if (result.error) setError(translateAuthError(result.error));
      else { setResent(true); setCode(""); }
    } catch (e) {
      setError(translateAuthError(e));
    } finally { setSending(false); }
  };

  return <>
    {/* Fallback på siden, hvis vinduet lukkes */}
    <div className="space-y-4 border-t border-border py-5" role="status">
      <div className="flex items-center gap-3"><img src={confirmIcon.url} alt="" aria-hidden width={48} height={48} className="h-12 w-12 shrink-0 object-contain" /><h3 className="text-lg font-semibold text-foreground">{verified ? "E-mail bekræftet" : "Bekræft din e-mail"}</h3></div>
      {!verified && <>
        <p className="break-words text-sm leading-6 text-muted-foreground">Vi har sendt en kode til <strong className="break-all text-foreground">{email}</strong>.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button className="min-h-11" onClick={() => setOpen(true)}>Indtast kode</Button>
          <Button variant="ghost" className="min-h-11" onClick={onEdit}>{business ? "Tilbage til konto" : "Ret e-mail"}</Button>
        </div>
      </>}
    </div>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 p-0 pt-0 pb-[env(safe-area-inset-bottom)] sm:max-w-md sm:rounded-2xl sm:p-0">
        <div className="bg-gradient-to-br from-accent/15 via-accent/5 to-transparent rounded-t-2xl px-6 pb-6 pt-10 text-center">
          {verified ? <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/15"><CheckCircle2 className="h-10 w-10 text-accent" aria-hidden /></span> : <img src={confirmIcon.url} alt="" aria-hidden width={80} height={80} className="mx-auto h-20 w-20 object-contain" />}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent">{verified ? "Færdig" : "Sidste trin"}</p>
          <DialogTitle className="mt-1 text-2xl font-bold text-foreground">{verified ? "E-mail bekræftet" : "Tjek din e-mail"}</DialogTitle>
          <DialogDescription className="mt-2 break-words text-base leading-7 text-muted-foreground">
            {verified
              ? (business ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Opretter din virksomhed og åbner dit panel…</span> : "Du er nu logget ind.")
              : <>Vi har sendt en kode til <strong className="break-all text-foreground">{email}</strong>. Skriv hele koden herunder.</>}
          </DialogDescription>
        </div>

        {!verified && <div className="space-y-5 px-5 pb-6 pt-6 sm:px-6">
          <div className="flex justify-center">
            <InputOTP maxLength={CODE_LENGTH} value={code} autoFocus inputMode="numeric" pattern="^[0-9]*$"
              aria-label="Bekræftelseskode"
              onChange={(v) => { setCode(v); setError(null); if (v.length === CODE_LENGTH) void verify(v); }}>
              <InputOTPGroup>
                {Array.from({ length: code.length >= MIN_CODE ? CODE_LENGTH : MIN_CODE }).map((_, i) => <InputOTPSlot key={i} index={i} className="h-12 w-9 text-xl font-bold min-[360px]:w-10 sm:h-14 sm:w-12" />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
          {resent && !error && <p className="text-center text-sm text-muted-foreground">Ny kode sendt. Brug den nyeste kode.</p>}
          <Button className="min-h-12 w-full text-base" disabled={verifying || code.length < MIN_CODE} onClick={() => verify()}>
            {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Bekræfter…</> : "Bekræft e-mail"}
          </Button>
          <div className="rounded-xl bg-secondary p-4 text-sm leading-6 text-muted-foreground">
            Kan du ikke finde mailen? Kig i <strong className="text-foreground">spam</strong> eller <strong className="text-foreground">reklamer</strong>. Du kan også trykke på knappen i mailen.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={sending || emailCooldown > 0} onClick={resend}>
              {sending ? "Sender…" : emailCooldown > 0 ? `Ny kode om ${emailCooldown} s` : "Send ny kode"}
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={() => { setOpen(false); onEdit(); }}>{business ? "Tilbage til konto" : "Ret e-mail"}</Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">Har du allerede en konto? <Link to={loginPath} className="font-medium text-foreground underline underline-offset-4">Log ind</Link></p>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
