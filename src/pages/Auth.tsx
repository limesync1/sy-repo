import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Navigate, Link } from "react-router-dom";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Indlæser...</div>;
  if (user) return <Navigate to="/admin" replace />;

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent/10 to-background px-4">
      <Card className="w-full max-w-sm border-border/60">
        <CardHeader className="text-center">
          <Link to="/">
            <img src="/serviceydere-logo.png" alt="Serviceydere" className="mx-auto mb-4 h-10" />
          </Link>
          <CardTitle className="text-2xl">{isSignUp ? "Opret konto" : "Log ind"}</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
