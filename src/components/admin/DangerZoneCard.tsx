// DangerZoneCard — opsig og slet virksomheden permanent.
// Anmoder først om en 5-cifret kode pr. e-mail, og bekræfter sletning
// kun når koden indtastes. Soft-sletter virksomheden og annullerer planen.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { AlertTriangle, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
}

export const DangerZoneCard = ({ businessId, businessName, ownerEmail }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Cooldown — forhindrer at brugeren spammer "Send ny kode" (og dermed
  // også vores transactional-email kvote). 60 sek. mellem hvert kald.
  const COOLDOWN_SECONDS = 60;
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => { if (cooldownRef.current) window.clearTimeout(cooldownRef.current); };
  }, [cooldown]);

  const requestCode = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    try {
      const { data: codeValue, error } = await supabase.rpc("request_business_deletion_code", {
        p_business_id: businessId,
      });
      if (error || !codeValue) throw new Error(error?.message || "Kunne ikke generere kode");
      const email = ownerEmail;
      if (!email) throw new Error("Ingen e-mail tilknyttet din konto");
      const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "business-deletion-code",
          recipientEmail: email,
          idempotencyKey: `biz-del-${businessId}-${codeValue}`,
          templateData: { businessName, code: codeValue, expiresInMinutes: 15 },
        },
      });
      if (mailErr) throw mailErr;
      setSentTo(email);
      setStep("code");
      setCooldown(COOLDOWN_SECONDS);
      toast.success(`Kode sendt til ${email}`);
    } catch (err: any) {
      toast.error(err?.message || "Noget gik galt");
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 5) {
      toast.error("Koden skal være 5 cifre");
      return;
    }
    setConfirming(true);
    try {
      const { data, error } = await supabase.rpc("confirm_business_deletion", {
        p_business_id: businessId,
        p_code: trimmed,
      });
      if (error) throw error;
      if (!data) {
        toast.error("Ugyldig eller udløbet kode");
        setConfirming(false);
        return;
      }
      toast.success("Virksomheden er nu slettet og abonnementet annulleret");
      setOpen(false);
      // Log brugeren ud så de ikke ender i et tomt admin-panel
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Kunne ikke slette virksomheden");
      setConfirming(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Opsig og slet virksomhed"
        icon={<AlertTriangle />}
        description="Annullér abonnementet og fjern virksomheden fra Serviceydere. Handlingen kan rulles tilbage af platform-support i op til 30 dage."
      >
        <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Slet {businessName} permanent</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Vi sender en 5-cifret kode til <strong>{ownerEmail || "din e-mail"}</strong>. Når du indtaster koden,
                deaktiveres virksomheden, abonnementet annulleres med det samme, og I opkræves ikke yderligere.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => { setStep("intro"); setCode(""); setOpen(true); }}
              className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Slet virksomhed
            </Button>
          </div>
        </div>
      </SectionCard>

      <Dialog open={open} onOpenChange={(o) => { if (!confirming) setOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Slet {businessName}</DialogTitle>
            <DialogDescription>
              {step === "intro"
                ? "Dette annullerer jeres abonnement og fjerner virksomheden fra Serviceydere. Vi sender en bekræftelseskode til din e-mail før sletningen gennemføres."
                : `Indtast den 5-cifrede kode vi har sendt til ${sentTo}.`}
            </DialogDescription>
          </DialogHeader>

          {step === "code" && (
            <div className="space-y-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="00000"
                inputMode="numeric"
                maxLength={5}
                className="text-center text-2xl tracking-[0.5em] font-mono tabular-nums h-14"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Koden er gyldig i 15 minutter. Modtog du den ikke?{" "}
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={sending || cooldown > 0}
                  className="font-medium text-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {cooldown > 0 ? `Send ny kode om ${cooldown}s` : "Send ny kode"}
                </button>
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={sending || confirming}>
              Annullér
            </Button>
            {step === "intro" ? (
              <Button
                variant="destructive"
                onClick={requestCode}
                disabled={sending || !ownerEmail}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send bekræftelseskode"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={confirm}
                disabled={confirming || code.length !== 5}
              >
                {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bekræft sletning"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};