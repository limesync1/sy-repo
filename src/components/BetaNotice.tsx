import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, CheckCircle2, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BetaNotice — stor besked øverst på alle offentlige sider mens platformen
 * er i testfase. Besøgende kan skrive sig op med e-mail, og en platform-admin
 * kan slå beskeden fra og sende åbnings-mailen fra panelet (fanen "Venteliste").
 *
 * Teksten hentes fra platform-indstillingerne via den offentlige RPC
 * `public_beta_notice`, så indholdet kan rettes uden en ny udgivelse.
 */

// Paneler og interne skærme skal ikke have banneret hen over arbejdsfladen.
const HIDDEN_PREFIXES = ["/admin", "/virksomhed/", "/medarbejder", "/min-konto", "/afmeld", "/visual-test"];
const HIDDEN_EXACT = ["/virksomhed"];

const SIGNUP_KEY = "beta-waitlist-signed-up";

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Skriv din e-mail" })
  .email({ message: "Det ligner ikke en gyldig e-mail" })
  .max(254, { message: "E-mailen er for lang" });

type Audience = "kunde" | "virksomhed";

const BetaNotice = () => {
  const { pathname } = useLocation();
  const [email, setEmail] = useState("");
  const [audience, setAudience] = useState<Audience>("kunde");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  if (hidden || !data?.enabled) return null;

  const title = data.title || "Vi er i testfase — vi åbner snart";
  const body =
    data.body ||
    "Serviceydere bliver bygget færdig lige nu. Du er velkommen til at kigge rundt, men vi tager hverken imod kunder eller virksomheder endnu. Skriv din e-mail, så siger vi til den dag vi åbner.";

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
    } catch {
      /* private mode — ikke kritisk */
    }
    setDone(true);
  };

  return (
    <aside
      role="region"
      aria-label="Besked om testfase"
      className="w-full border-b border-border bg-secondary text-foreground"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-8">
        {/* Besked — kort og på én linje når der er plads */}
        <div className="flex min-w-0 items-start gap-2.5 lg:items-center">
          <span className="mt-0.5 inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-background lg:mt-0">
            <Hammer className="h-3 w-3" />
            Testfase
          </span>
          <p className="min-w-0 text-[13.5px] leading-6">
            <span className="font-semibold">{title}</span>{" "}
            <span className="text-muted-foreground">{body}</span>
          </p>
        </div>

        {/* Tilmelding — kompakt, altid til højre på store skærme */}
        <div className="shrink-0">
          {done ? (
            <p className="inline-flex items-center gap-2 text-[13px] font-medium">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Du står på listen — vi sender én mail, den dag vi åbner.
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-wrap items-center gap-2">
              <div
                className="flex shrink-0 overflow-hidden rounded-full border border-border bg-background p-0.5"
                role="group"
                aria-label="Hvem skriver du dig op som?"
              >
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
                      "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                      audience === opt.key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <label htmlFor="beta-email" className="sr-only">
                Din e-mail
              </label>
              <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="beta-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@mail.dk"
                  aria-invalid={!!error}
                  aria-describedby={error ? "beta-email-error" : undefined}
                  className="h-9 w-full rounded-full border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-70"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Skriv mig op
              </button>

              {error && (
                <p id="beta-email-error" className="w-full text-[12px] text-destructive">
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </aside>
  );
};


export default BetaNotice;
