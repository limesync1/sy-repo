import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";
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
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <SEO
        title="Afmeld e-mails – Serviceydere"
        description="Administrér dine e-mailindstillinger og afmeld nyheds- og påmindelses-e-mails fra Serviceydere."
        canonicalPath="/afmeld"
        noIndex
      />
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,420px)] lg:items-center">
        <section className="surface-panel rounded-[2rem] border border-border p-6 shadow-[0_20px_50px_-34px_hsl(var(--foreground)/0.28)] sm:p-8 lg:p-10">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">E-mailindstillinger</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Hold styr på, hvilke beskeder du vil modtage.</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Du kan altid afmelde marketing- og påmindelses-e-mails. Vigtige beskeder om din konto, dine bestillinger og drift fortsætter vi med at sende.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["Marketing", "Nyheder og relevante opdateringer"],
              ["Påmindelser", "Status og tidskritiske beskeder"],
              ["Kontosikkerhed", "Vigtige beskeder sendes stadig"],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-border bg-card/90 p-4">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

      <Card className="w-full rounded-[2rem] border border-border bg-card p-8 text-center shadow-[0_20px_50px_-34px_hsl(var(--foreground)/0.28)] space-y-4">
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
      </div>
    </main>
  );
}
