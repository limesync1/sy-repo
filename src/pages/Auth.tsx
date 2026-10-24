import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigate, Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Building2, User, ArrowLeft, ArrowRight, ShieldCheck, Sparkles,
  CheckCircle, HardHat, Quote, TrendingUp, Eye, EyeOff, Mail, AlertCircle,
} from "lucide-react";
import SEO from "@/components/SEO";
import { translateAuthError } from "@/lib/auth-errors";
import { detectUserRole, ROLE_HOME } from "@/lib/detect-user-role";
import { supabase } from "@/integrations/supabase/client";
import BlueFlowBackground from "@/components/landing/BlueFlowBackground";
import { Skeleton } from "@/components/ui/skeleton";
import testimonialPatrick from "@/assets/testimonial-patrick.png";
import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/auth-flow";
import { AuthEmailConfirmation } from "@/components/shared/AuthEmailConfirmation";

/** Almindelige tastefejl i e-mail-domæner — vi tilbyder en venlig "mente du …?". */
const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "gnail.com": "gmail.com", "gmial.com": "gmail.com", "gmal.com": "gmail.com",
  "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmail.dk": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmial.dk": "hotmail.dk",
  "hotmal.com": "hotmail.com", "hotnail.com": "hotmail.com",
  "outloo.com": "outlook.com", "outlok.com": "outlook.com", "outlook.dk": "outlook.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
  "live.dk": "live.com", "icoud.com": "icloud.com", "iclud.com": "icloud.com",
};
const suggestEmailFix = (email: string): string | null => {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  const fix = EMAIL_DOMAIN_TYPOS[domain];
  if (!fix || fix === domain) return null;
  return email.slice(0, at + 1) + fix;
};

/** Simpel password-styrke 0-4: længde + variation. */
const passwordScore = (pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } => {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-ZÆØÅ]/.test(pw) && /[a-zæøå]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Svag", "Okay", "God", "Stærk"] as const;
  return { score: Math.min(4, score) as 0|1|2|3|4, label: labels[Math.min(4, score)] };
};

const Auth = () => {
  const { user, loading, signIn, signUp, resetPassword, resendConfirmation, emailCooldown } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // "mode" bruges KUN på opret-konto-flowet (vi skal vide hvilken type konto
  // der oprettes). Log-ind kender vi rollen automatisk fra databasen.
  const mode = searchParams.get("mode");
  const signupParam = searchParams.get("signup");
  const isResetMode = searchParams.get("reset") === "1";
  const [isSignUp, setIsSignUp] = useState(signupParam === "1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const submitLock = useRef(false);

  // Pre-fill email fra localStorage så folk ikke skal indtaste den hver gang
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sy-last-email");
      if (stored) setEmail(stored);
    } catch { /* Login remains usable with blocked browser storage. */ }
  }, []);

  useEffect(() => {
    setIsSignUp(signupParam === "1");
  }, [signupParam]);

  // Skift mode? Nulstil fejl så den ikke hænger fra forrige forsøg
  useEffect(() => { setFormError(null); setResetSent(false); setConfirmationEmail(null); setUnconfirmed(false); }, [isSignUp, mode, isResetMode]);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setDestination(null); return; }
    detectUserRole(user.id).then((role) => {
      if (!cancelled) setDestination(ROLE_HOME[role]);
    }).catch(() => { if (!cancelled) setDestination("/min-konto"); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const emailSuggestion = suggestEmailFix(email);
  const pwStrength = passwordScore(password);

  if (loading) return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2" aria-busy="true" aria-label="Indlæser login">
      <div className="public-blue-surface relative isolate hidden lg:block"><BlueFlowBackground /></div>
      <div className="flex items-center justify-center px-5">
        <div className="w-full max-w-[420px] space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );

  if (user) {
    // Hvis brugeren er logget ind men signup-flowet for virksomhed kører,
    // skal de fortsætte til onboarding. Ellers send dem til deres panel.
    if (mode === "business" && isSignUp) return <Navigate to="/opret-virksomhed" replace />;
    if (destination) return <Navigate to={destination} replace />;
    return <div role="status" className="flex min-h-screen items-center justify-center bg-background text-foreground">Åbner din konto…</div>;
  }

  if (mode === "business" && isSignUp) {
    return <Navigate to="/opret-virksomhed" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current) return;
    setFormError(null);
    setUnconfirmed(false);
    if (!email.trim() || !password) {
      setFormError("Udfyld både e-mail og adgangskode for at fortsætte.");
      return;
    }
    // Basal e-mail-validering inden vi kalder serveren
    if (!isValidAuthEmail(email)) {
      setFormError("Det ser ikke ud som en gyldig e-mail. Tjek lige stavemåden.");
      return;
    }
    if (isSignUp && password.length < 6) {
      setFormError("Adgangskoden er for kort. Vælg mindst 6 tegn.");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
      if (result.error) {
        setUnconfirmed((result.error as { code?: string }).code === "email_not_confirmed" || result.error.message.toLowerCase().includes("email not confirmed"));
        setFormError(translateAuthError(result.error, isSignUp ? "Vi kunne ikke oprette din konto. Prøv igen." : "Vi kunne ikke logge dig ind. Tjek e-mail og adgangskode."));
        return;
      }
      try { localStorage.setItem("sy-last-email", normalizeAuthEmail(email)); } catch {}
      if (isSignUp && "status" in result && result.status === "confirmation_required") {
        setConfirmationEmail(normalizeAuthEmail(email));
        setPassword("");
      }
    } catch (error) {
      setFormError(translateAuthError(error));
    } finally { submitLock.current = false; setSubmitting(false); }
  };

  /** Send mail med link til /reset-password. Vi viser altid en "tjek din mail"-besked
   *  uanset om e-mailen findes — for at undgå at lække hvilke mails der har konto. */
  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || emailCooldown > 0) return;
    setFormError(null);
    if (!isValidAuthEmail(email)) {
      setFormError("Skriv en gyldig e-mailadresse for at fortsætte.");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const { error } = await resetPassword(email);
      if (error) setFormError(translateAuthError(error, "Vi kunne ikke sende mailen. Prøv igen."));
      else setResetSent(true);
    } catch (error) { setFormError(translateAuthError(error)); }
    finally { submitLock.current = false; setSubmitting(false); }
  };

  const handleResend = async () => {
    if (submitLock.current || emailCooldown > 0) return;
    submitLock.current = true; setSubmitting(true);
    try {
      const { error } = await resendConfirmation(email);
      if (error) setFormError(translateAuthError(error));
      else setConfirmationEmail(normalizeAuthEmail(email));
    } catch (error) { setFormError(translateAuthError(error)); }
    finally { submitLock.current = false; setSubmitting(false); }
  };

  const isBusiness = mode === "business";
  const isCustomer = mode === "customer";
  const isEmployee = mode === "employee";
  // Opret-konto siden viser KUN kundeoprettelse. Virksomheder bruger
  // /opret-virksomhed, og medarbejdere aktiveres fra virksomhedspanelet.
  // Hvis brugeren lander på signup uden mode, behandl det som kunde.
  const showSignupTypeSelector = false;
  const showLoginForm = !mode && !isResetMode && !isSignUp;
  const effectiveIsCustomer = isCustomer || (!mode && !isResetMode && isSignUp);

  const heroTitle = isSignUp
    ? (isBusiness ? "Opret virksomhedskonto" : isEmployee ? "Aktivér medarbejderkonto" : "Opret din konto")
    : (isBusiness ? "Log ind som virksomhed" : isEmployee ? "Log ind som medarbejder" : "Velkommen tilbage");
  const heroSub = isSignUp
    ? "Det tager under et minut at komme i gang"
    : (isEmployee ? "Brug det login din virksomhed har sendt dig" : "Log ind for at fortsætte");

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SEO
        title={isSignUp ? "Opret konto – Serviceydere" : "Log ind – Serviceydere"}
        description={isSignUp ? "Opret en konto på Serviceydere og kom i gang med at finde de bedste serviceydere i Danmark." : "Log ind på din Serviceydere-konto for at administrere bestillinger, abonnementer og favoritter."}
        canonicalPath="/log-ind"
        noIndex
      />

      {/* ── Left: Branding panel (desktop only) — matcher forsidens hero ── */}
      <div
        className="auth-blue-panel public-blue-surface relative isolate hidden overflow-hidden lg:flex lg:min-h-screen lg:flex-col lg:justify-between px-12 py-10"
      >
        <BlueFlowBackground variant="founder" />

        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <img
              src="/serviceydere-logo.webp"
              alt="Serviceydere"
              className="h-11 w-auto"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
             loading="lazy"/>
          </Link>
        </div>

        <div className="public-content-enter relative z-10 max-w-lg">
          <h2 className="text-4xl font-semibold leading-[1.05] text-ocean-foreground xl:text-5xl">
            Saml booking, kunder<br />
            og drift{" "}
            <span className="home-hero-highlight">
              ét sted.
            </span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ocean-foreground/90">
            Hele Danmarks platform for serviceydere. Find kunder, planlæg ruter og hold styr på din forretning — alt sammen i ét værktøj.
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { value: "1.200+", label: "Virksomheder" },
              { value: "4,9★", label: "Tilfredshed" },
              { value: "24/7", label: "Support" },
            ].map((s) => (
              <div key={s.label} className="auth-stat rounded-lg border p-4">
                <p className="text-2xl font-semibold text-ocean-foreground">{s.value}</p>
                <p className="mt-1 text-xs text-ocean-foreground/85">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="auth-quote mt-8 rounded-lg border p-5">
            <Quote className="h-5 w-5" style={{ color: "hsl(var(--hero-cyan-bright))" }} />
            <p className="mt-3 text-sm leading-6 text-ocean-foreground/85">
              "Serviceydere har samlet hele vores drift. Vi sparer timer hver uge på planlægning og fakturering."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <img
                src={testimonialPatrick}
                alt="Patrick Nissen"
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-background/15"
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="text-sm font-semibold text-ocean-foreground">Patrick Nissen</p>
                <p className="text-xs text-ocean-foreground/85">Vinduespudser hos DK Renfyn</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-ocean-foreground/80">© {new Date().getFullYear()} Serviceydere</p>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Top bar */}
        <div className="auth-mobile-header relative isolate flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden lg:hidden"><BlueFlowBackground /></div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="lg:hidden">
              <img
                src="/serviceydere-logo.webp"
                alt="Serviceydere"
                className="h-9 w-auto"
                width={1920}
                height={539}
                decoding="async"
               loading="lazy"/>
            </span>
            <span className="hidden lg:inline">Tilbage til forsiden</span>
          </Link>
          {mode && (
            <Link to="/log-ind" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
              Skift type
            </Link>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-2 sm:px-8 lg:px-12">
          <div key={`${isResetMode}-${isSignUp}-${mode}`} className="public-content-enter w-full max-w-[420px] space-y-7">

            {/* ── Glemt adgangskode ── */}
            {confirmationEmail && <AuthEmailConfirmation email={confirmationEmail} onEdit={() => setConfirmationEmail(null)} />}
            {unconfirmed && !confirmationEmail && <Button variant="outline" disabled={submitting || emailCooldown > 0} onClick={handleResend} className="w-full">{emailCooldown > 0 ? `Send igen om ${emailCooldown} s` : "Send bekræftelseslink igen"}</Button>}
            {isResetMode && !confirmationEmail && (
              <div className="space-y-6">
                <Link
                  to={`/log-ind${mode ? `?mode=${mode}` : ""}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Tilbage til log ind
                </Link>

                <div>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.25rem]">
                    Glemt din adgangskode?
                  </h1>
                  <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
                    Skriv din e-mail, så sender vi dig et link til at vælge en ny.
                  </p>
                </div>

                {resetSent ? (
                  <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                        <Mail className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Tjek din indbakke</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Hvis <span className="break-words font-medium text-foreground">{email.trim()}</span> er knyttet til en konto, har vi sendt dig en mail med et link til at vælge ny adgangskode. Brug det nyeste link, og tjek også spam.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/log-ind${mode ? `?mode=${mode}` : ""}`}>Tilbage til log ind</Link>
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        disabled={emailCooldown > 0}
                        onClick={() => { setResetSent(false); }}
                      >
                        {emailCooldown > 0 ? `Send igen om ${emailCooldown} s` : "Send igen"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendReset} className="space-y-4">
                    {formError && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3.5 py-3 text-xs text-rose-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}
                    <div>
                      <label htmlFor="reset-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        E-mail
                      </label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        placeholder="din@email.dk"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl border-border bg-card px-4 text-[15px]"
                      />
                      {emailSuggestion && (
                        <button
                          type="button"
                          onClick={() => setEmail(emailSuggestion)}
                          className="mt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Mente du <span className="font-semibold text-foreground">{emailSuggestion}</span>?
                        </button>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting || emailCooldown > 0}
                      className="group h-12 w-full rounded-xl bg-foreground text-[15px] font-semibold text-background hover:bg-foreground/90"
                    >
                      {submitting ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                          Sender…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          Send link <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* ── Log ind: én samlet formular. Vi gætter rolle automatisk efter login ── */}
            {showLoginForm && !confirmationEmail && (
              <div className="space-y-7">
                <div className="flex rounded-full border border-border bg-secondary/60 p-1">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="flex-1 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
                  >
                    Log ind
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Opret konto
                  </button>
                </div>

                <div>
                  <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.4rem]">
                    Velkommen tilbage.
                  </h1>
                  <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
                    Skriv din e-mail og adgangskode — vi sender dig automatisk
                    til det rigtige sted.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3.5 py-3 text-xs text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="auth-email-main" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                    <Input
                      id="auth-email-main"
                      type="email"
                      autoComplete="email"
                      placeholder="din@email.dk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl border-border bg-card px-4 text-[15px]"
                    />
                    {emailSuggestion && (
                      <button
                        type="button"
                        onClick={() => setEmail(emailSuggestion)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Mente du <span className="font-semibold text-foreground">{emailSuggestion}</span>?
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="auth-password-main" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adgangskode</label>
                      <Link
                        to="/log-ind?reset=1"
                        className="text-xs font-semibold text-accent underline-offset-2 transition-colors hover:underline"
                      >
                        Glemt adgangskode?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-password-main"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={(e) => setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"))}
                        onKeyDown={(e) => setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"))}
                        onBlur={() => setCapsLockOn(false)}
                        className="h-12 rounded-xl border-border bg-card px-4 pr-12 text-[15px]"
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
                    {capsLockOn && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" /> Caps Lock er slået til
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="group h-12 w-full rounded-xl bg-foreground text-[15px] font-semibold text-background shadow-[0_12px_30px_-12px_hsl(var(--foreground)/0.5)] transition-all hover:bg-foreground/90 hover:shadow-[0_16px_36px_-12px_hsl(var(--foreground)/0.55)]"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                        Logger ind…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Log ind
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Har du ikke en konto?{" "}
                  <button onClick={() => setIsSignUp(true)} className="font-semibold text-foreground hover:underline">
                    Opret konto
                  </button>
                </p>

                {/* Trust strip */}
                <div className="flex items-center justify-center gap-5 border-t border-border/60 pt-5 text-xs text-muted-foreground/80">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Sikker</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> Dansk support</span>
                </div>
              </div>
            )}

            {/* ── Opret konto: vælg type først ── */}
            {showSignupTypeSelector && (
              <div className="space-y-7">
                <div className="flex rounded-full border border-border bg-secondary/60 p-1">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Log ind
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="flex-1 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
                  >
                    Opret konto
                  </button>
                </div>

                <div>
                  <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.4rem]">
                    Kom i gang.
                  </h1>
                  <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
                    Opret en kundekonto for at bestille services. Er du en virksomhed,{" "}
                    <Link to="/opret-virksomhed" className="font-semibold text-foreground underline-offset-2 hover:underline">
                      bliv udbyder her
                    </Link>.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { to: `/log-ind?mode=customer&signup=1`, icon: User, title: "Privat / kunde", sub: "Find og bestil services hos verificerede udbydere", tone: "accent" as const },
                    { to: `/log-ind?mode=employee&signup=1`, icon: HardHat, title: "Medarbejder", sub: "Aktivér din invitation fra arbejdsgiveren", tone: "muted" as const },
                  ].map((opt) => (
                    <Link key={opt.to} to={opt.to} className="group block">
                      <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.28)]">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          opt.tone === "accent" ? "bg-accent/10 text-accent" : "bg-secondary text-foreground"
                        }`}>
                          <opt.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-semibold text-foreground">{opt.title}</h3>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{opt.sub}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Har du allerede en konto?{" "}
                  <button onClick={() => setIsSignUp(false)} className="font-semibold text-foreground hover:underline">
                    Log ind
                  </button>
                </p>

                <div className="flex items-center justify-center gap-5 border-t border-border/60 pt-5 text-xs text-muted-foreground/80">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Sikker</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> Dansk support</span>
                </div>
              </div>
            )}

            {/* ── Login / Signup Form ── */}
            {!isResetMode && !confirmationEmail && (isBusiness || effectiveIsCustomer || isEmployee) && (
              <div className="space-y-7">
                {/* Mode chip */}
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  isBusiness ? "border-foreground/15 bg-foreground/5 text-foreground"
                  : isEmployee ? "border-border bg-secondary text-foreground"
                  : "border-accent/20 bg-accent/10 text-accent"
                }`}>
                  {isBusiness ? <Building2 className="h-3.5 w-3.5" /> : isEmployee ? <HardHat className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  {isBusiness ? "Virksomhed" : isEmployee ? "Medarbejder" : "Privat / kunde"}
                </div>

                <div>
                  <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.25rem]">
                    {heroTitle}
                  </h1>
                  <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
                    {heroSub}
                  </p>
                  {isEmployee && !isSignUp && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-secondary/60 px-3.5 py-3 text-xs text-muted-foreground">
                      <HardHat className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
                      <span>Du skal være inviteret af din virksomhed for at kunne logge ind.</span>
                    </div>
                  )}
                </div>

                {/* Toggle for non-business modes */}
                {!isBusiness && !isEmployee && (
                  <div className="flex rounded-full border border-border bg-secondary/60 p-1">
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        !isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Log ind
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Opret konto
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {formError && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/5 px-3.5 py-3 text-xs text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="auth-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</label>
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="din@email.dk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl border-border bg-card px-4 text-[15px]"
                    />
                    {emailSuggestion && (
                      <button
                        type="button"
                        onClick={() => setEmail(emailSuggestion)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Mente du <span className="font-semibold text-foreground underline-offset-2 group-hover:underline">{emailSuggestion}</span>?
                      </button>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adgangskode</label>
                      {!isSignUp && (
                        <Link
                          to={`/log-ind?reset=1${mode ? `&mode=${mode}` : ""}`}
                          className="text-xs font-semibold text-accent underline-offset-2 transition-colors hover:underline"
                        >
                          Glemt adgangskode?
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={(e) => setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"))}
                        onKeyDown={(e) => setCapsLockOn(e.getModifierState && e.getModifierState("CapsLock"))}
                        onBlur={() => setCapsLockOn(false)}
                        className="h-12 rounded-xl border-border bg-card px-4 pr-12 text-[15px]"
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
                    {capsLockOn && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" /> Caps Lock er slået til
                      </p>
                    )}
                    {isSignUp && password.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex gap-1">
                          {[1,2,3,4].map((i) => (
                            <span
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i <= pwStrength.score
                                  ? pwStrength.score <= 1 ? "bg-rose-500"
                                    : pwStrength.score === 2 ? "bg-amber-500"
                                    : pwStrength.score === 3 ? "bg-emerald-500"
                                    : "bg-emerald-600"
                                  : "bg-secondary"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pwStrength.label || "Mindst 6 tegn."}
                          {pwStrength.score < 3 && password.length >= 6 && " — bland gerne tal og store bogstaver."}
                        </p>
                      </div>
                    )}
                    {isSignUp && password.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground/80">Mindst 6 tegn.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="group h-12 w-full rounded-xl bg-foreground text-[15px] font-semibold text-background shadow-[0_12px_30px_-12px_hsl(var(--foreground)/0.5)] transition-all hover:bg-foreground/90 hover:shadow-[0_16px_36px_-12px_hsl(var(--foreground)/0.55)]"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                        Vent...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {isSignUp ? "Opret konto" : "Log ind"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  {isBusiness && !isSignUp ? (
                    <p className="text-sm text-muted-foreground">
                      Har du ikke en konto?{" "}
                      <Link to="/opret-virksomhed" className="font-semibold text-foreground hover:underline">
                        Opret virksomhed
                      </Link>
                    </p>
                  ) : !isEmployee ? (
                    <p className="text-sm text-muted-foreground">
                      {isSignUp ? "Har du allerede en konto?" : "Har du ikke en konto?"}{" "}
                      <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-foreground hover:underline">
                        {isSignUp ? "Log ind" : "Opret konto"}
                      </button>
                    </p>
                  ) : null}
                </div>

                {isSignUp && (
                  <p className="text-center text-xs leading-5 text-muted-foreground/80">
                    Ved at oprette en konto accepterer du vores{" "}
                    <Link to="/vilkaar" className="underline-offset-2 hover:text-foreground hover:underline">vilkår</Link>{" "}og{" "}
                    <Link to="/privatlivspolitik" className="underline-offset-2 hover:text-foreground hover:underline">privatlivspolitik</Link>.
                  </p>
                )}

                <div className="flex items-center justify-center gap-5 border-t border-border/60 pt-5 text-xs text-muted-foreground/80">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Sikker</span>
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-accent" /> 1.200+ brugere</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
