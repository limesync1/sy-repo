import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * BetaNotice — besked om testfase på alle offentlige sider.
 *  1. Smal stribe øverst med en "Få besked når vi åbner"-knap.
 *  2. Ét kort, roligt kort der åbner ved første besøg i sessionen.
 * Tilmeldingen gemmes via RPC'en `join_beta_waitlist`.
 */

const HIDDEN_PREFIXES = ["/admin", "/virksomhed/", "/medarbejder", "/min-konto", "/afmeld", "/visual-test"];
const HIDDEN_EXACT = ["/virksomhed"];

const SIGNUP_KEY = "beta-waitlist-signed-up";
const POPUP_DISMISSED_KEY = "beta-popup-dismissed";

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Skriv din e-mail" })
  .email({ message: "Det ligner ikke en gyldig e-mail" })
  .max(254, { message: "E-mailen er for lang" });

type Audience = "kunde" | "virksomhed";

const BetaNotice = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [audience, setAudience] = useState<Audience>("kunde");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSignedUp, setJustSignedUp] = useState(false);
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIGNUP_KEY) === "1";
  });

  const { data } = useQuery({
    queryKey: ["public-beta-notice"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_beta_notice" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as { enabled: boolean; title: string | null; body: string | null } | null;
    },
  });

  const hidden =
    HIDDEN_EXACT.includes(pathname) || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden || !data?.enabled || done) return;
    try {
      if (window.sessionStorage.getItem(POPUP_DISMISSED_KEY) === "1") return;
    } catch {
      /* private mode */
    }
    const t = window.setTimeout(() => setPopupOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [hidden, data?.enabled, done]);

  if (hidden || !data?.enabled) return null;

  const title = data.title || "Vi er i testfase.";
  const body =
    data.body || "Vi åbner snart for kunder og virksomheder — skriv dig op, så siger vi til.";

  const dismissPopup = () => {
    try {
      window.sessionStorage.setItem(POPUP_DISMISSED_KEY, "1");
    } catch {
      /* private mode */
    }
    setPopupOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setSaving(true);
    const { error: rpcError } = await supabase.rpc("join_beta_waitlist" as any, {
      p_email: parsed.data,
      p_role: audience,
    });
    setSaving(false);
    if (rpcError) {
      setError("Vi kunne ikke gemme din e-mail lige nu. Prøv igen om lidt.");
      return;
    }
    try {
      window.localStorage.setItem(SIGNUP_KEY, "1");
      window.sessionStorage.setItem(POPUP_DISMISSED_KEY, "1");
    } catch {
      /* private mode — ikke kritisk */
    }
    setJustSignedUp(true);
    setDone(true);
  };

  /** Selve tilmeldingen — e-mail først, rollevalg som to små valg under. */
  const signupForm = (
    <form onSubmit={submit} noValidate className="mt-5 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="beta-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@mail.dk"
          aria-label="Din e-mail"
          aria-invalid={!!error}
          aria-describedby={error ? "beta-email-error" : undefined}
          className="h-11 flex-1 bg-background"
        />
        <Button type="submit" disabled={saving} className="h-11 shrink-0 px-5">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Skriv mig op
        </Button>
      </div>

      {error && (
        <p id="beta-email-error" className="text-[12.5px] text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
        <span>Jeg er</span>
        {(
          [
            { key: "kunde" as const, label: "kunde" },
            { key: "virksomhed" as const, label: "virksomhed" },
          ]
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            aria-pressed={audience === opt.key}
            onClick={() => setAudience(opt.key)}
            className={cn(
              "rounded-full px-2.5 py-0.5 font-medium transition-colors",
              audience === opt.key
                ? "bg-foreground text-background"
                : "text-muted-foreground underline underline-offset-4 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] leading-5 text-muted-foreground">
        Én mail, den dag vi åbner. Ikke andet.
      </p>
    </form>
  );

  const confirmation = (
    <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div>
        <p className="text-sm font-semibold text-foreground">Du står på listen</p>
        <p className="mt-0.5 text-[13px] leading-6 text-muted-foreground">
          Vi skriver til {email || "dig"}, så snart vi åbner. Kig gerne rundt imens.
        </p>
      </div>
    </div>
  );

  /** Fælles indhold i både stribe-dialogen og velkomst-popup'en. */
  const card = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Testfase
      </p>
      <DialogTitle className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-foreground">
        {title}
      </DialogTitle>
      <DialogDescription className="mt-2 text-[14px] leading-6 text-muted-foreground">
        {body}
      </DialogDescription>
      {justSignedUp ? confirmation : signupForm}
    </>
  );

  return (
    <>
      <aside
        role="region"
        aria-label="Besked om testfase"
        className="w-full border-b border-border bg-surface text-foreground"
      >
        <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-center sm:px-6 lg:px-8">
          <p className="text-[13.5px] leading-6">
            <span className="font-semibold">{title}</span>{" "}
            <span className="text-muted-foreground">{body}</span>
          </p>

          {done ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Du står på listen
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setJustSignedUp(false);
                setOpen(true);
              }}
              className="group inline-flex items-center gap-1 rounded-full bg-foreground px-3.5 py-1 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              Få besked når vi åbner
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </aside>

      {/* Dialog fra stribens knap */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-card p-6 sm:max-w-[420px] sm:p-7">
          {card}
        </DialogContent>
      </Dialog>

      {/* Popup ved første besøg i sessionen */}
      {!done && (
        <Dialog
          open={popupOpen}
          onOpenChange={(v) => {
            if (!v) dismissPopup();
            else setPopupOpen(true);
          }}
        >
          <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border-border bg-card p-6 sm:max-w-[420px] sm:p-7">
            {card}
            <button
              type="button"
              onClick={dismissPopup}
              className="mt-4 block text-[13px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Nej tak — kig bare rundt
            </button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BetaNotice;
