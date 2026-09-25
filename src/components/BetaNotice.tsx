import { useEffect, useRef, useState } from "react";
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
 *  2. Ét lyst modal-kort i samme rolige marine/teal-design som forsiden.
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
  const emailRef = useRef<HTMLInputElement>(null);

  /** Sæt fokus på e-mailfeltet — ikke rollevalget, som ellers får en tydelig fokus-ring. */
  const focusEmail = (e: Event) => {
    e.preventDefault();
    window.setTimeout(() => emailRef.current?.focus(), 30);
  };

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

  /** Rollevalg — to små valg over e-mailfeltet, som i det valgte design. */
  const roleSelector = (
    <fieldset>
      <legend className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Jeg er:
      </legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary p-1">
        {(
          [
            { key: "kunde" as const, label: "Kunde" },
            { key: "virksomhed" as const, label: "Virksomhed" },
          ]
        ).map((opt) => (
          <Button
            key={opt.key}
            type="button"
            variant="ghost"
            aria-pressed={audience === opt.key}
            onClick={() => setAudience(opt.key)}
            className={cn(
              "h-10 rounded-md text-[13.5px] font-medium",
              audience === opt.key
                ? "border border-border bg-card text-foreground shadow-sm hover:bg-card"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );

  const emailField = (
      <Input
      ref={emailRef}
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
      className="h-12 rounded-lg border-border bg-background px-4 text-[15px] shadow-none placeholder:text-muted-foreground focus-visible:border-beta-accent focus-visible:ring-beta-accent/20"
    />
  );

  const submitButton = (
    <Button type="submit" disabled={saving} className="h-12 w-full rounded-lg bg-foreground text-background text-[15px] font-semibold shadow-sm hover:bg-foreground/90">
      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Skriv mig op
    </Button>
  );

  /** Selve tilmeldingen — rollevalg først, derefter e-mail, derefter knap. */
  const signupForm = (
    <form onSubmit={submit} noValidate className="space-y-4">
      {roleSelector}
      {emailField}
      {error && (
        <p id="beta-email-error" className="text-[12.5px] text-destructive">
          {error}
        </p>
      )}
      {submitButton}
      <p className="text-center text-[11.5px] leading-tight text-muted-foreground">
        Én mail, den dag vi åbner. Ikke andet.
      </p>
    </form>
  );

  const confirmation = (
    <div className="flex flex-col items-center py-3 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-beta-accent/10 text-beta-accent">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <p className="mt-4 text-lg font-bold tracking-tight text-foreground">Du står på listen</p>
      <p className="mt-1.5 max-w-[260px] text-[13.5px] leading-relaxed text-muted-foreground">
        Vi skriver til {email || "dig"}, så snart vi åbner. Kig gerne rundt imens.
      </p>
    </div>
  );

  const dialogClass =
    "max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] gap-0 overflow-y-auto rounded-2xl border border-border bg-card p-0 shadow-2xl shadow-foreground/15 sm:max-w-[430px] [&>button]:right-4 [&>button]:top-4 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full [&>button]:border [&>button]:border-border [&>button]:bg-secondary [&>button]:text-foreground [&>button]:opacity-100 hover:[&>button]:bg-muted focus-visible:[&>button]:ring-beta-accent";

  const dialogHeader = (
    <div className="border-b border-border bg-surface px-6 pb-6 pt-7 pr-16 text-left sm:px-8 sm:pb-7 sm:pt-8 sm:pr-20">
      <div className="mb-4 flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-full bg-beta-accent" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Testfase</span>
      </div>
      <DialogTitle className="text-[26px] font-bold leading-tight text-foreground sm:text-[28px]">
        {title}
      </DialogTitle>
      <DialogDescription className="mt-2.5 max-w-[340px] text-sm leading-6 text-muted-foreground">
        {body}
      </DialogDescription>
    </div>
  );

  return (
    <>
      <aside
        role="region"
        aria-label="Besked om testfase"
        className="w-full border-b border-border bg-secondary/70 text-foreground"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-center sm:px-6 lg:px-8">
          <p className="text-[13.5px] leading-6">
            <span className="font-semibold">{title}</span>{" "}
            <span className="text-muted-foreground">{body}</span>
          </p>

          {done ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
              <CheckCircle2 className="h-4 w-4 text-beta-accent" />
              Du står på listen
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setJustSignedUp(false);
                setOpen(true);
              }}
              className="group inline-flex items-center gap-1 rounded-md bg-foreground px-3.5 py-1.5 text-[12.5px] font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Få besked når vi åbner
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </aside>

      {/* Dialog fra stribens knap */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={dialogClass} onOpenAutoFocus={focusEmail}>
          {dialogHeader}
          <div className="p-6 sm:p-8">{justSignedUp ? confirmation : signupForm}</div>
        </DialogContent>
      </Dialog>

      {/* Popup ved første besøg i sessionen */}
      {(!done || justSignedUp) && (
        <Dialog
          open={popupOpen}
          onOpenChange={(v) => {
            if (!v) dismissPopup();
            else setPopupOpen(true);
          }}
        >
          <DialogContent className={dialogClass} onOpenAutoFocus={focusEmail}>
            {dialogHeader}
            <div className="p-6 sm:p-8">
              {justSignedUp ? confirmation : signupForm}
              <Button
                type="button"
                variant="ghost"
                onClick={dismissPopup}
                className="mt-3 h-10 w-full text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                Nej tak — kig bare rundt
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BetaNotice;
