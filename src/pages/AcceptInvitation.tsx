import { useEffect, useState } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Briefcase } from "lucide-react";
import SEO from "@/components/SEO";

type Invitation = {
  id: string;
  email: string;
  business_id: string;
  employee_id: string;
  expires_at: string;
  accepted_at: string | null;
  businesses?: { name: string } | null;
};

const AcceptInvitation = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Manglende invitationslink.");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("employee_invitations")
        .select("id, email, business_id, employee_id, expires_at, accepted_at, businesses(name)")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        setError("Linket er ugyldigt eller udløbet.");
      } else if (data.accepted_at) {
        setError("Denne invitation er allerede accepteret. Log ind for at fortsætte.");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("Linket er udløbet. Bed virksomheden om at sende en ny invitation.");
      } else {
        setInvitation(data as Invitation);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    if (password.length < 6) {
      toast.error("Adgangskoden skal være mindst 6 tegn");
      return;
    }
    setSubmitting(true);
    try {
      // Sign up the new user with the invited email
      const { error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/medarbejder` },
      });
      if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
        throw signUpError;
      }

      // Mark invitation as accepted
      await supabase
        .from("employee_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      setAccepted(true);
      toast.success("Konto oprettet! Log ind for at fortsætte.");
    } catch (err: any) {
      toast.error(err.message || "Noget gik galt");
    } finally {
      setSubmitting(false);
    }
  };

  if (user && accepted) return <Navigate to="/medarbejder" replace />;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-secondary/30">
      <SEO title="Accepter invitation – Serviceydere" canonicalPath="/medarbejder/accepter" noIndex />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Briefcase className="h-6 w-6 text-accent" />
          </div>
          <CardTitle>Medarbejder-invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Tjekker dit link…</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button asChild variant="outline"><Link to="/log-ind">Til login</Link></Button>
            </div>
          )}

          {!loading && invitation && !accepted && (
            <form onSubmit={handleAccept} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Du er inviteret som medarbejder hos{" "}
                <strong className="text-foreground">{invitation.businesses?.name || "virksomheden"}</strong>.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">E-mail</label>
                <Input value={invitation.email} disabled className="h-11 bg-muted" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vælg adgangskode</label>
                <Input
                  type="password"
                  placeholder="Mindst 6 tegn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full h-11">
                {submitting ? "Opretter…" : "Opret konto og accepter"}
              </Button>
            </form>
          )}

          {accepted && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-foreground" />
              <p className="text-sm">Konto oprettet. Tjek din e-mail for bekræftelse, og log derefter ind.</p>
              <Button asChild className="w-full"><Link to="/log-ind">Log ind</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default AcceptInvitation;
