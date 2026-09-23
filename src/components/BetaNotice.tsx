import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, ArrowRight, BellRing } from "lucide-react";
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
    <form onSubmit={submit} noValidate className="mt-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
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
          className="h-10 min-w-0 bg-background"
        />
        <Button type="submit" disabled={saving} className="h-10 shrink-0 px-5">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Skriv mig op
        </Button>
      </div>

      {error && (
        <p id="beta-email-error" className="text-[12.5px] text-destructive">
          {error}
        </p>
      )}

      <fieldset className="flex min-w-0 items-center gap-2 text-[12.5px] text-muted-foreground">
        <legend className="sr-only">Tilmeldingstype</legend>
        <span className="shrink-0">Jeg er</span>
        <div className="inline-grid min-w-0 grid-cols-2 rounded-md border border-border bg-secondary/60 p-0.5">
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
              "min-w-0 rounded px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

      <p className="text-[12px] leading-5 text-muted-foreground">
        Én mail, den dag vi åbner. Ikke andet.
      </p>
    </form>
  );

  const confirmation = (
    <div className="mt-4 flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-3">
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
      <div className="flex items-start gap-3 pr-7">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><BellRing className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Testfase</p>
          <DialogTitle className="mt-1 text-xl font-semibold leading-tight text-foreground">{title}</DialogTitle>
        </div>
      </div>
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
        className="w-full border-b border-border bg-secondary/70 text-foreground"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-center sm:px-6 lg:px-8">
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
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border-border bg-card p-5 sm:max-w-[430px] sm:p-6">
          {card}
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
          <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border-border bg-card p-5 sm:max-w-[430px] sm:p-6">
            {card}
            <button
              type="button"
              onClick={dismissPopup}
              className="mt-3 block w-full rounded-md py-2 text-center text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
