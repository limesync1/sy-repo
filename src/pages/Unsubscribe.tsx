import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { CheckCircle2 } from "lucide-react";

export default function Unsubscribe() {
  useEffect(() => {
    document.title = "Afmeld e-mails — Serviceydere";
  }, []);

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
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-foreground" />
            <h1 className="text-2xl font-bold">E-mailindstillinger administreres sikkert</h1>
            <p className="text-muted-foreground">
              Brug afmeldingslinket nederst i den seneste e-mail. Linket håndteres af vores sikre e-mailtjeneste.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Tilbage til forsiden</Link>
            </Button>
          </>
      </Card>
      </div>
    </main>
  );
}
