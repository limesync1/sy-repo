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
      className="relative w-full bg-[hsl(var(--hero-bg))] text-background"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-7 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              <Hammer className="h-3.5 w-3.5" />
              Testfase
            </span>

            <h2 className="mt-4 text-[1.6rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[2.1rem] lg:text-[2.4rem]">
              {title}
            </h2>

            <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-background/80 sm:text-[15.5px]">
              {body}
            </p>
          </div>

          <div className="rounded-2xl border border-background/20 bg-background/[0.07] p-5 backdrop-blur sm:p-6">
            {done ? (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="text-sm font-semibold">Du står på listen</p>
                  <p className="mt-1 text-[13.5px] leading-6 text-background/75">
                    Vi sender én mail — den dag vi åbner. Ikke andet.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <p className="text-sm font-semibold">Få besked når vi åbner</p>

                <div className="mt-3 flex gap-2" role="group" aria-label="Hvem skriver du dig op som?">
                  {(
                    [
                      { key: "kunde" as const, label: "Jeg er kunde" },
                      { key: "virksomhed" as const, label: "Jeg har en virksomhed" },
                    ]
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      aria-pressed={audience === opt.key}
                      onClick={() => setAudience(opt.key)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                        audience === opt.key
                          ? "border-background bg-background text-foreground"
                          : "border-background/30 bg-transparent text-background/80 hover:bg-background/10",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <label htmlFor="beta-email" className="sr-only">
                  Din e-mail
                </label>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
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
                      className="h-11 w-full rounded-full border border-background/25 bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-70"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Skriv mig op
                  </button>
                </div>

                {error && (
                  <p id="beta-email-error" className="mt-2 text-[12.5px] text-red-200">
                    {error}
                  </p>
                )}

                <p className="mt-3 text-[12px] leading-5 text-background/60">
                  Vi bruger kun din e-mail til at fortælle, at vi er åbnet. Du kan altid bede os slette den.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default BetaNotice;
