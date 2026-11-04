import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { comparisons } from "./comparisons";

const ComparisonHub = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Sammenlign rutesystemer og ruteplanlæggere (2026)"
      description="Se Serviceydere side om side med SkvizBiz, Fenster, RuteKlar, Rutemanager, Clientflow, Ordrestyring og Minuba. Kun fakta fra deres egne sider."
      canonicalPath="/software/sammenlign"
      jsonLd={[{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Sammenligninger af rutesystemer",
        itemListElement: comparisons.map((c, i) => ({
          "@type": "ListItem", position: i + 1, name: `Serviceydere vs. ${c.name}`,
          url: `https://serviceydere.dk/software/sammenlign/${c.slug}`,
        })),
      }]}
    />
    <SiteNav />
    <main id="main" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-[2.6rem]">
        Sammenlign rutesystemer
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/80">
        Se Serviceydere side om side med andre danske ruteprogrammer. Alle oplysninger om de andre kommer fra deres egne sider og har en tjekdato.
      </p>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border-2 border-primary/40 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Sparkles className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Usikker på, hvad du har brug for?</h2>
            <p className="text-[15px] text-muted-foreground">Svar på 4 korte spørgsmål i rutesystem-finderen.</p>
          </div>
        </div>
        <Button asChild size="lg" className="min-h-11 shrink-0"><Link to="/software/rutesystem-finder">Start finderen <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {comparisons.map((c) => (
          <li key={c.slug}>
            <Link to={`/software/sammenlign/${c.slug}`} className="group flex h-full min-h-11 flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
              <h2 className="text-lg font-semibold text-foreground">Serviceydere vs. {c.name}</h2>
              <p className="mt-2 flex-1 text-[15px] leading-6 text-muted-foreground">{c.tagline}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground">Se sammenligning <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
    <Footer />
  </div>
);

export default ComparisonHub;
