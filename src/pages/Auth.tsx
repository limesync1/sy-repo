import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Building2, User, ArrowLeft, ShieldCheck, Star, Sparkles, CheckCircle, HardHat } from "lucide-react";
import SEO from "@/components/SEO";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8 mb-12" />
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
            <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-6 lg:hidden" />
          </Link>
          {mode && (
            <Link to="/log-ind" className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors">
              Skift logintype
            </Link>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-6 lg:px-10">
          <div className="w-full max-w-md space-y-5">

            {/* ── Mode Selector ── */}
            {showModeSelector && (
              <div className="space-y-5">
                <div className="text-center">
                  <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">Vælg adgang</span>
                  <h1 className="mt-4 text-3xl font-bold text-foreground">Velkommen tilbage</h1>
                  <p className="mt-2 text-sm text-muted-foreground">Vælg hvordan du vil bruge Serviceydere</p>
                </div>

                <Link to="/log-ind?mode=customer" className="group block">
                  <Card className="overflow-hidden border-border/70 bg-card transition-all group-hover:-translate-y-0.5 group-hover:border-accent/30 group-hover:shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.3)]">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 transition-colors group-hover:bg-accent/15">
                        <User className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Jeg er kunde</h3>
                        <p className="text-sm text-muted-foreground">Find og bestil services</p>
                      </div>
                      <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/log-ind?mode=business" className="group block">
                  <Card className="overflow-hidden border-border/70 bg-card transition-all group-hover:-translate-y-0.5 group-hover:border-foreground/20 group-hover:shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.3)]">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground/5 transition-colors group-hover:bg-foreground/10">
                        <Building2 className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Jeg er virksomhed</h3>
                        <p className="text-sm text-muted-foreground">Administrer services og kunder</p>
                      </div>
                      <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </CardContent>
                  </Card>
                </Link>

                <Link to="/log-ind?mode=employee" className="group block">
                  <Card className="overflow-hidden border-border/70 bg-card transition-all group-hover:-translate-y-0.5 group-hover:border-accent/25 group-hover:shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.3)]">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary transition-colors group-hover:bg-accent/10">
                        <HardHat className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">Jeg er medarbejder</h3>
                        <p className="text-sm text-muted-foreground">Se mine ruter og opgaver</p>
                      </div>
                      <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground/40 transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                    </CardContent>
                  </Card>
                </Link>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground/60">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Gratis</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Sikker</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Dansk</span>
                </div>
              </div>
            )}

            {/* ── Login / Signup Form ── */}
            {(isBusiness || isCustomer || isEmployee) && (
              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_18px_50px_-32px_hsl(var(--foreground)/0.28)] sm:p-8">
                <div className="text-center">
                  <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isBusiness ? "bg-foreground/5" : isEmployee ? "bg-secondary" : "bg-accent/10"
                  }`}>
                    {isBusiness
                      ? <Building2 className="h-6 w-6 text-foreground" />
                      : isEmployee
                        ? <HardHat className="h-6 w-6 text-foreground" />
                        : <User className="h-6 w-6 text-accent" />
                    }
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {isSignUp ? "Opret konto" : "Log ind"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isBusiness ? "Virksomhedskonto" : isEmployee ? "Medarbejderkonto" : "Kundekonto"} · {isSignUp ? "Kom i gang på få sekunder" : "Velkommen tilbage"}
                  </p>
                  {isEmployee && !isSignUp && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Du skal være inviteret af din virksomhed for at logge ind.
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">E-mail</label>
                    <Input
                      type="email"
                      placeholder="din@email.dk"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Adgangskode</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
                  >
                    {submitting ? "Vent..." : isSignUp ? "Opret konto" : "Log ind"}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {isSignUp ? "Har du allerede en konto?" : "Har du ikke en konto?"}{" "}
                    <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-foreground hover:underline">
                      {isSignUp ? "Log ind" : "Opret konto"}
                    </button>
                  </p>
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
