import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";

/**
 * /reset-password — siden som recovery-mailen linker til.
 *
 * Supabase parser automatisk recovery-tokenet fra URL'en og udløser et
 * `PASSWORD_RECOVERY` event via onAuthStateChange — vi behøver kun at
 * lytte og lade brugeren vælge en ny adgangskode.
 *
 * VIGTIGT: Siden er public (ikke bag auth) så linket fra mailen virker
 * også selvom brugeren ikke er logget ind på enheden.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Lyt FØRST efter recovery-event så vi ikke misser det.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
      }
      setReady(true);
    });
    // Og tjek om der allerede er en aktiv session (linket åbnet i samme tab).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasRecoverySession(true);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Adgangskoden skal være mindst 6 tegn.");
      return;
    }
    if (password !== confirm) {
      toast.error("De to adgangskoder er ikke ens.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Vi kunne ikke opdatere adgangskoden. Prøv igen.");
      return;
    }
    toast.success("Din adgangskode er opdateret. Du kan nu logge ind.");
    // Log ud så brugeren bevidst logger ind igen med ny kode.
    await supabase.auth.signOut();
    navigate("/log-ind", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <SEO title="Vælg ny adgangskode – Serviceydere" canonicalPath="/reset-password" noIndex />
      <div className="w-full max-w-[420px]">
        <Link to="/log-ind" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tilbage til log ind
        </Link>

        <div className="mt-8 rounded-2xl border border-border bg-card p-7 shadow-sm">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
            Vælg ny adgangskode
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Skriv din nye adgangskode nedenfor. Brug mindst 6 tegn.
          </p>

          {!ready ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
              Indlæser…
            </div>
          ) : !hasRecoverySession ? (
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Linket er udløbet eller ugyldigt. Bed om et nyt fra log ind-siden.
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link to="/log-ind?reset=1">Bed om nyt link</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ny adgangskode
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-border bg-card px-4 pr-12 text-[15px]"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gentag adgangskode
                </label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 rounded-xl border-border bg-card px-4 text-[15px]"
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="group h-12 w-full rounded-xl bg-foreground text-[15px] font-semibold text-background hover:bg-foreground/90"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                    Opdaterer…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Gem ny adgangskode <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;