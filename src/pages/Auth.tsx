import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Building2, User } from "lucide-react";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode"); // "business" or "customer" or null
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Indlæser...</div>;
  
  // Redirect based on mode
  if (user) {
    if (mode === "customer") return <Navigate to="/dashboard" replace />;
    return <Navigate to="/admin" replace />;
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
  const showModeSelector = !mode;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent/10 to-background px-4">
      <div className="w-full max-w-sm space-y-4">
        {showModeSelector && (
          <div className="space-y-3">
            <div className="text-center">
              <Link to="/">
                <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="mx-auto mb-4 h-10" />
              </Link>
              <h1 className="text-2xl font-bold text-foreground">Velkommen</h1>
              <p className="mt-1 text-sm text-muted-foreground">Vælg hvordan du vil logge ind</p>
            </div>
            <Link to="/auth?mode=customer" className="block">
              <Card className="border-border/60 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <User className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Jeg er kunde</h3>
                    <p className="text-sm text-muted-foreground">Administrer dine bestillinger og services</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link to="/auth?mode=business" className="block">
              <Card className="border-border/60 hover:border-accent/40 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground/5">
                    <Building2 className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Jeg er virksomhed</h3>
                    <p className="text-sm text-muted-foreground">Administrer din virksomhed og services</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {(isBusiness || isCustomer) && (
          <Card className="w-full border-border/60">
            <CardHeader className="text-center">
              <Link to="/">
                <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="mx-auto mb-4 h-10" />
              </Link>
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                {isBusiness ? <Building2 className="h-5 w-5 text-foreground" /> : <User className="h-5 w-5 text-accent" />}
              </div>
              <CardTitle className="text-2xl">{isSignUp ? "Opret konto" : "Log ind"}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isBusiness ? "Virksomhedskonto" : "Kundekonto"}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input type="password" placeholder="Adgangskode" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting}>
                  {submitting ? "Vent..." : isSignUp ? "Opret konto" : "Log ind"}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {isSignUp ? "Har du allerede en konto?" : "Har du ikke en konto?"}{" "}
                <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-accent hover:underline">
                  {isSignUp ? "Log ind" : "Opret konto"}
                </button>
              </p>
              <Link to="/auth" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground hover:underline">
                ← Skift logintype
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
