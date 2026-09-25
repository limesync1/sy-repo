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
 *  2. Ét indbydende modal-kort ("Premium marine glow") ved første besøg i sessionen:
 *     mørk marine-header med teal glød + lys formularflade.
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
      <div className="flex rounded-xl bg-secondary p-1">
        {(
          [
            { key: "kunde" as const, label: "Kunde" },
            { key: "virksomhed" as const, label: "Virksomhed" },
          ]
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            aria-pressed={audience === opt.key}
            onClick={() => setAudience(opt.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-[13.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
              audience === opt.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
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
      className="h-12 rounded-xl px-4 text-[15px]"
    />
  );

  const submitButton = (
    <Button type="submit" disabled={saving} className="h-12 w-full rounded-xl bg-beta-accent text-white text-[15px] font-semibold shadow-lg shadow-beta-accent/25 transition-all hover:bg-beta-accent/90 active:scale-[0.98]">
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
    "max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto rounded-3xl border-border/60 bg-card p-0 shadow-[0_32px_64px_-24px_hsl(204_96%_13%/0.45)] sm:max-w-[400px] [&>button]:text-white/60 hover:[&>button]:bg-white/10 hover:[&>button]:text-white";

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
      <Dialog open={open} onOpenChange={setOpen} onOpenAutoFocus={focusEmail}>
        <DialogContent className={dialogClass}>
          {/* Marine header med teal glød */}
          <div className="relative overflow-hidden bg-ocean px-6 pb-7 pt-9 text-center sm:px-8">
            <span
              aria-hidden
              className="pointer-events-none absolute -left-20 -top-24 h-48 w-48 rounded-full bg-hero-cyan opacity-20 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-24 bottom-[-4rem] h-40 w-40 rounded-full bg-hero-cyan opacity-10 blur-3xl"
            />
            <div className="relative">
              <span className="inline-block rounded-full bg-hero-cyan/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-hero-cyan">
                Testfase
              </span>
              <DialogTitle className="mt-3.5 text-2xl font-bold tracking-tight text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="mx-auto mt-2.5 max-w-[280px] text-[13.5px] leading-relaxed text-white/65">
                {body}
              </DialogDescription>
            </div>
          </div>

          {/* Lys formularflade */}
          <div className="p-6 sm:p-7">{justSignedUp ? confirmation : signupForm}</div>
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
          onOpenAutoFocus={focusEmail}
        >
          <DialogContent className={dialogClass}>
            <div className="relative overflow-hidden bg-ocean px-6 pb-7 pt-9 text-center sm:px-8">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-20 -top-24 h-48 w-48 rounded-full bg-hero-cyan opacity-20 blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -right-24 bottom-[-4rem] h-40 w-40 rounded-full bg-hero-cyan opacity-10 blur-3xl"
              />
              <div className="relative">
                <span className="inline-block rounded-full bg-hero-cyan/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-hero-cyan">
                  Testfase
                </span>
                <DialogTitle className="mt-3.5 text-2xl font-bold tracking-tight text-white">
                  {title}
                </DialogTitle>
                <DialogDescription className="mx-auto mt-2.5 max-w-[280px] text-[13.5px] leading-relaxed text-white/65">
                  {body}
                </DialogDescription>
              </div>
            </div>

            <div className="p-6 sm:p-7">
              {justSignedUp ? confirmation : signupForm}
              <button
                type="button"
                onClick={dismissPopup}
                className="mt-4 block w-full rounded-md py-1.5 text-center text-[13px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Nej tak — kig bare rundt
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default BetaNotice;
