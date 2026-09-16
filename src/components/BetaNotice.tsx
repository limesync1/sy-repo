import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * BetaNotice — smal besked øverst på alle offentlige sider mens platformen
 * er i testfase. Selve tilmeldingen ligger i en dialog, så stribens højde
 * og indhold aldrig konkurrerer med sidens eget indhold (fx login-formularen).
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
  const [open, setOpen] = useState(false);
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

  const title = data.title || "Vi er i testfase.";
  const body =
    data.body || "Vi åbner snart for kunder og virksomheder — skriv dig op, så siger vi til.";

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="rounded-full bg-foreground px-3.5 py-1 text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90"
              >
                Få besked når vi åbner
              </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Få besked når vi åbner</DialogTitle>
                <DialogDescription>
                  Vi sender én enkelt mail — den dag Serviceydere åbner. Ikke andet, ingen reklamer.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={submit} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label>Hvem skriver du dig op som?</Label>
                  <div className="grid grid-cols-2 gap-2">
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
                          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                          audience === opt.key
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beta-email">Din e-mail</Label>
                  <Input
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
                  />
                  {error && (
                    <p id="beta-email-error" className="text-[12.5px] text-destructive">
                      {error}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Skriv mig op
                </Button>

                <p className="text-[12px] leading-5 text-muted-foreground">
                  Vi bruger kun din e-mail til at fortælle, at vi er åbnet. Du kan altid bede os slette den.
                </p>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </aside>
  );
};

export default BetaNotice;
