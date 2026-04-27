import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import {
  Building2, User, ArrowLeft, ArrowRight, ShieldCheck, Sparkles,
  CheckCircle, HardHat, Quote, TrendingUp, Eye, EyeOff,
} from "lucide-react";
import SEO from "@/components/SEO";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const signupParam = searchParams.get("signup");
  const [isSignUp, setIsSignUp] = useState(signupParam === "1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIsSignUp(signupParam === "1");
  }, [signupParam]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-muted-foreground">Indlæser...</p>
      </div>
    </div>
  );

  if (user) {
    if (mode === "customer") return <Navigate to="/min-konto" replace />;
    if (mode === "employee") return <Navigate to="/medarbejder" replace />;
    return <Navigate to="/virksomhed" replace />;
  }

  if (mode === "business" && isSignUp) {
    return <Navigate to="/opret-virksomhed" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Udfyld alle felter"); return; }
    setSubmitting(true);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else if (isSignUp) {
      toast.success("Konto oprettet! Tjek din e-mail for bekræftelse.");
    }
  };

  const isBusiness = mode === "business";
  const isCustomer = mode === "customer";
  const isEmployee = mode === "employee";
  const showModeSelector = !mode;

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

      {/* ── Left: Branding panel (desktop only) ── */}
      <div className="surface-dark-panel relative hidden overflow-hidden lg:flex lg:min-h-screen lg:flex-col lg:justify-between px-12 py-10">
        {/* Layered ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />
          <div className="absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-[140px]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }} />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-block">
            <img
              src="/serviceydere-logo.webp"
              alt="Serviceydere"
              className="h-8 w-auto"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Live på Serviceydere
          </div>
          <h2 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-5xl">
            Saml booking, kunder<br />
            og drift <span className="text-accent">ét sted.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/65">
            Hele Danmarks platform for serviceydere. Find kunder, planlæg ruter og hold styr på din forretning — alt sammen i ét værktøj.
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { value: "1.200+", label: "Virksomheder" },
              { value: "4,9★", label: "Tilfredshed" },
              { value: "24/7", label: "Support" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-xs text-white/55">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
            <Quote className="h-5 w-5 text-accent/80" />
            <p className="mt-3 text-sm leading-6 text-white/80">
              "Serviceydere har samlet hele vores drift. Vi sparer timer hver uge på planlægning og fakturering."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                MK
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Mikkel K.</p>
                <p className="text-xs text-white/50">Ejer, Nord Rengøring</p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">© {new Date().getFullYear()} Serviceydere · Made in Denmark</p>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="lg:hidden">
              <img
                src="/serviceydere-logo-dark.webp"
                alt="Serviceydere"
                className="h-6 w-auto"
                width={1920}
                height={539}
                decoding="async"
              />
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
          <div className="w-full max-w-[420px] space-y-7">

            {/* ── Mode Selector ── */}
            {showModeSelector && (
              <div className="space-y-7">
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

                <div>
                  <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[2.4rem]">
                    {isSignUp ? "Kom i gang." : "Velkommen tilbage."}
                  </h1>
                  <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
                    {isSignUp
                      ? "Vælg hvilken type konto du vil oprette."
                      : "Vælg hvordan du logger ind."}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { to: `/log-ind?mode=customer${isSignUp ? "&signup=1" : ""}`, icon: User, title: "Privat / kunde", sub: isSignUp ? "Find og bestil services hos verificerede udbydere" : "Log ind på din kundekonto", tone: "accent" as const },
                    { to: `/log-ind?mode=business${isSignUp ? "&signup=1" : ""}`, icon: Building2, title: "Virksomhed", sub: isSignUp ? "Tilbyd dine services og få nye kunder" : "Administrer services og bestillinger", tone: "foreground" as const, badge: isSignUp ? "Mest valgt" : undefined },
                    { to: `/log-ind?mode=employee${isSignUp ? "&signup=1" : ""}`, icon: HardHat, title: "Medarbejder", sub: isSignUp ? "Aktivér din invitation fra arbejdsgiveren" : "Se dine ruter og opgaver", tone: "muted" as const },
                  ].map((opt) => (
                    <Link key={opt.to} to={opt.to} className="group block">
                      <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_18px_44px_-22px_hsl(var(--foreground)/0.28)]">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          opt.tone === "accent" ? "bg-accent/10 text-accent" : opt.tone === "foreground" ? "bg-foreground/5 text-foreground" : "bg-secondary text-foreground"
                        }`}>
                          <opt.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-foreground">{opt.title}</h3>
                            {opt.badge && (
                              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{opt.sub}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Trust strip */}
                <div className="flex items-center justify-center gap-5 border-t border-border/60 pt-5 text-xs text-muted-foreground/80">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Sikker</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-accent" /> Dansk support</span>
                </div>
              </div>
            )}

            {/* ── Login / Signup Form ── */}
            {(isBusiness || isCustomer || isEmployee) && (
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
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adgangskode</label>
                      {!isSignUp && (
                        <Link to="/log-ind?reset=1" className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline">
                          Glemt?
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
                    {isSignUp && (
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
