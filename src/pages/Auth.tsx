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
    <div className="flex min-h-screen">
      <SEO
        title={isSignUp ? "Opret konto – Serviceydere" : "Log ind – Serviceydere"}
        description={isSignUp ? "Opret en konto på Serviceydere og kom i gang med at finde de bedste serviceydere i Danmark." : "Log ind på din Serviceydere-konto for at administrere bestillinger, abonnementer og favoritter."}
        canonicalPath="/log-ind"
        noIndex
      />
      {/* ── Left: Branding panel ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between bg-[hsl(222,47%,11%)] px-10 py-8 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-accent/10 blur-[100px] animate-magic-bg-1" />
        <div className="absolute -bottom-40 -right-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-[80px] animate-magic-bg-2" />

        <div className="relative z-10">
          <Link to="/">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="h-8 mb-12" />
          </Link>
          <h2 className="text-3xl font-extrabold text-white leading-tight xl:text-4xl">
            Find de bedste<br />
            <span className="text-accent">serviceydere</span> nær dig
          </h2>
          <p className="mt-4 max-w-md text-white/60 leading-relaxed">
            Sammenlign priser, læs anmeldelser og bestil services fra verificerede virksomheder — alt sammen ét sted.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]">
              <ShieldCheck className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Verificerede virksomheder</p>
              <p className="text-xs text-white/40">Alle virksomheder er gennemgået</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]">
              <Star className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Ægte anmeldelser</p>
              <p className="text-xs text-white/40">Fra rigtige kunder</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08]">
              <Sparkles className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">AI-drevne tilbud</p>
              <p className="text-xs text-white/40">Få skræddersyede tilbud automatisk</p>
            </div>
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

        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-sm space-y-5">

            {/* ── Mode Selector ── */}
            {showModeSelector && (
              <div className="space-y-5">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-foreground">Velkommen</h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">Vælg hvordan du vil bruge Serviceydere</p>
                </div>

                <Link to="/log-ind?mode=customer" className="group block">
                  <Card className="border-border/60 transition-all group-hover:border-accent/30 group-hover:shadow-md">
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
                  <Card className="border-border/60 transition-all group-hover:border-foreground/20 group-hover:shadow-md">
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
                  <Card className="border-border/60 transition-all group-hover:border-amber-400/40 group-hover:shadow-md">
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 transition-colors group-hover:bg-amber-200">
                        <HardHat className="h-6 w-6 text-amber-700" />
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
              <div className="space-y-6">
                <div className="text-center">
                  <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isBusiness ? "bg-foreground/5" : isEmployee ? "bg-amber-100" : "bg-accent/10"
                  }`}>
                    {isBusiness
                      ? <Building2 className="h-6 w-6 text-foreground" />
                      : isEmployee
                        ? <HardHat className="h-6 w-6 text-amber-700" />
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
