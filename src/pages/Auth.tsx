import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Building2, User, ArrowLeft, ShieldCheck, Star, Sparkles, CheckCircle, HardHat } from "lucide-react";
import SEO from "@/components/SEO";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const signupParam = searchParams.get("signup");
  const [isSignUp, setIsSignUp] = useState(signupParam === "1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync signUp state with URL param when it changes (e.g. clicking "Opret konto" in nav)
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

  // Virksomheds-tilmelding går altid via onboarding-flowet, så de først
  // konfigurerer deres pakke og derefter opretter loginet.
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

  // Smart greeting: only say "Velkommen tilbage" when actually logging in (not on signup)
  const heroTitle = isSignUp
    ? (isBusiness ? "Opret virksomhedskonto" : isEmployee ? "Aktivér medarbejderkonto" : "Opret din konto")
    : (isBusiness ? "Log ind som virksomhed" : isEmployee ? "Log ind som medarbejder" : "Velkommen tilbage");
  const heroSub = isSignUp
    ? "Kom i gang på under et minut"
    : (isEmployee ? "Brug det login din virksomhed har sendt dig" : "Log ind for at fortsætte");

  return (
      <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <SEO
        title={isSignUp ? "Opret konto – Serviceydere" : "Log ind – Serviceydere"}
        description={isSignUp ? "Opret en konto på Serviceydere og kom i gang med at finde de bedste serviceydere i Danmark." : "Log ind på din Serviceydere-konto for at administrere bestillinger, abonnementer og favoritter."}
        canonicalPath="/log-ind"
        noIndex
      />
      {/* ── Left: Branding panel ── */}
      <div className="surface-dark-panel relative hidden overflow-hidden lg:flex lg:min-h-screen lg:flex-col lg:justify-between px-10 py-8">
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/10 to-transparent" />
        <div className="absolute right-0 top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10">
          <Link to="/">
            <img
              src="/serviceydere-logo.webp"
              alt="Serviceydere"
              className="h-8 w-auto mb-12"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Sikker adgang til din konto
          </div>
          <h2 className="mt-6 text-3xl font-bold leading-tight text-white xl:text-5xl">
            Saml booking,
            <br />
            kunder og drift ét sted.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70">
            Log ind for at følge bestillinger, håndtere services og arbejde mere effektivt med Serviceydere.
          </p>

          <div className="mt-10 grid gap-4">
            {[
              { icon: ShieldCheck, title: "Verificeret platform", text: "Adgang til kunder, medarbejdere og virksomhedsdata samlet ét sted." },
              { icon: Star, title: "Professionelt overblik", text: "Hold styr på tilbud, bestillinger og historik uden ekstra støj." },
              { icon: Sparkles, title: "Hurtig opstart", text: "Kom i gang på få sekunder og skift let mellem kunde-, medarbejder- og virksomhedslogin." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-accent">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/25">© {new Date().getFullYear()} Serviceydere</p>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-5">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className="h-6 w-auto lg:hidden"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          {mode && (
            <Link to="/log-ind" className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors">
              Skift logintype
            </Link>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-6 lg:px-10">
          <div className="w-full max-w-md space-y-7">

            {/* ── Mode Selector ── */}
            {showModeSelector && (
              <div className="space-y-6">
                {/* Toggle: Log ind / Opret konto — skifter URL-param så formen
                    også reagerer korrekt når brugeren senere vælger en type. */}
                <div className="flex rounded-full border border-border bg-secondary/50 p-1">
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
                  <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                    {isSignUp ? "Kom i gang." : "Velkommen tilbage."}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isSignUp
                      ? "Vælg hvilken type konto du vil oprette."
                      : "Vælg hvordan du logger ind."}
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { to: `/log-ind?mode=customer${isSignUp ? "&signup=1" : ""}`, icon: User, title: "Privat / kunde", sub: isSignUp ? "Find og bestil services hos verificerede udbydere" : "Log ind på din kundekonto", tone: "accent" },
                    { to: `/log-ind?mode=business${isSignUp ? "&signup=1" : ""}`, icon: Building2, title: "Virksomhed", sub: isSignUp ? "Tilbyd dine services og få nye kunder" : "Administrer services og bestillinger", tone: "foreground" },
                    { to: `/log-ind?mode=employee${isSignUp ? "&signup=1" : ""}`, icon: HardHat, title: "Medarbejder", sub: isSignUp ? "Aktivér din invitation fra arbejdsgiveren" : "Se dine ruter og opgaver", tone: "muted" },
                  ].map((opt) => (
                    <Link key={opt.to} to={opt.to} className="group block">
                      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.25)]">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          opt.tone === "accent" ? "bg-accent/10 text-accent" : opt.tone === "foreground" ? "bg-foreground/5 text-foreground" : "bg-secondary text-foreground"
                        }`}>
                          <opt.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[15px] font-semibold text-foreground">{opt.title}</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">{opt.sub}</p>
                        </div>
                        <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-5 pt-1 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Sikker</span>
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-accent" /> Dansk</span>
                </div>
              </div>
            )}

            {/* ── Login / Signup Form ── */}
            {(isBusiness || isCustomer || isEmployee) && (
              <div className="space-y-6">
                {/* Mode badge + back link */}
                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                    isBusiness ? "border-foreground/15 bg-foreground/5 text-foreground"
                    : isEmployee ? "border-border bg-secondary text-foreground"
                    : "border-accent/20 bg-accent/10 text-accent"
                  }`}>
                    {isBusiness ? <Building2 className="h-3.5 w-3.5" /> : isEmployee ? <HardHat className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                    {isBusiness ? "Virksomhed" : isEmployee ? "Medarbejder" : "Privat / kunde"}
                  </div>
                  <Link to="/log-ind" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Skift type
                  </Link>
                </div>

                <div>
                  <h1 className="text-[1.85rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.1rem]">
                    {heroTitle}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {heroSub}
                  </p>
                  {isEmployee && !isSignUp && (
                    <p className="mt-3 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                      Du skal være inviteret af din virksomhed for at kunne logge ind.
                    </p>
                  )}
                </div>

                {/* Toggle for non-business modes (business signup redirects to onboarding) */}
                {!isBusiness && (
                  <div className="flex rounded-full border border-border bg-secondary/50 p-1">
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
                      disabled={isEmployee}
                      className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      } ${isEmployee ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      Opret konto
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">E-mail</label>
                    <Input
                      type="email"
                      placeholder="din@email.dk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adgangskode</label>
                      {!isSignUp && (
                        <Link to="/log-ind?reset=1" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                          Glemt?
                        </Link>
                      )}
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-xl bg-foreground text-base font-semibold text-background shadow-[0_12px_30px_-12px_hsl(var(--foreground)/0.5)] transition-all hover:bg-foreground/90 hover:shadow-[0_16px_36px_-12px_hsl(var(--foreground)/0.55)]"
                  >
                    {submitting ? "Vent..." : isSignUp ? "Opret konto" : "Log ind"}
                  </Button>
                </form>

                <div className="text-center">
                  {isBusiness && !isSignUp ? (
                    <p className="text-sm text-muted-foreground">
                      Har du ikke en konto?{" "}
                      <Link to="/opret-virksomhed" className="font-medium text-foreground hover:underline">
                        Opret virksomhed
                      </Link>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {isSignUp ? "Har du allerede en konto?" : "Har du ikke en konto?"}{" "}
                      <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-foreground hover:underline">
                        {isSignUp ? "Log ind" : "Opret konto"}
                      </button>
                    </p>
                  )}
                </div>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-5 pt-1 text-xs text-muted-foreground/70">
                  <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Gratis</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Sikker</span>
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-accent" /> Dansk</span>
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
