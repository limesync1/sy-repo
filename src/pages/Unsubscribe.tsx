import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | "validating"
  | "ready"
  | "already"
  | "invalid"
  | "submitting"
  | "success"
  | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");

  useEffect(() => {
    document.title = "Afmeld e-mails — Serviceydere";
  }, []);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          return;
        }
        if (data.valid === true) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        { body: { token } }
      );
      if (error) {
        setState("error");
        return;
      }
      if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        {state === "validating" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
            <h1 className="text-2xl font-bold">Tjekker dit link...</h1>
          </>
        )}
        {state === "ready" && (
          <>
            <MailX className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-2xl font-bold">Afmeld e-mails</h1>
            <p className="text-muted-foreground">
              Vil du afmelde dig fremtidige e-mails fra Serviceydere? Du modtager
              stadig vigtige beskeder vedrørende din konto og dine ordrer.
            </p>
            <Button onClick={confirm} className="w-full">
              Bekræft afmelding
            </Button>
          </>
        )}
        {state === "submitting" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
            <h1 className="text-2xl font-bold">Afmelder...</h1>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-2xl font-bold">Du er nu afmeldt ✅</h1>
            <p className="text-muted-foreground">
              Du vil ikke længere modtage marketing- eller påmindelses-e-mails fra Serviceydere.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Tilbage til forsiden</Link>
            </Button>
          </>
        )}
        {state === "already" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-2xl font-bold">Allerede afmeldt</h1>
            <p className="text-muted-foreground">
              Denne e-mailadresse er allerede afmeldt vores udsendelser.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Tilbage til forsiden</Link>
            </Button>
          </>
        )}
        {(state === "invalid" || state === "error") && (
          <>
            <XCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Linket virker ikke</h1>
            <p className="text-muted-foreground">
              Linket er enten udløbet eller ugyldigt. Kontakt os, hvis du fortsat
              modtager uønskede e-mails.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Tilbage til forsiden</Link>
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
