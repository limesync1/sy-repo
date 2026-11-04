import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";

const PRINCIPLES = [
  { h: "Priser er intervaller", p: "Vi angiver aldrig præcise priser. Prisintervaller bygger på gennemsnit af offentligt tilgængelige priser og opgaver på platformen og vises med forbehold." },
  { h: "Regler tjekkes ved kilden", p: "Regler om fx skorstensfejning, moms og affald tjekkes mod myndigheders egne sider, før de nævnes. Ændres reglerne, opdaterer vi artiklen." },
  { h: "Ingen opfundne tal eller citater", p: "Vi skriver ikke statistik, kundecitater eller funktioner, vi ikke kan dokumentere." },
  { h: "Artikler holdes opdaterede", p: "Ældre artikler og artikler, som læsere ikke finder svar i, bliver gennemgået og opdateret løbende. Datoen for sidste opdatering står på hver artikel." },
  { h: "Teknologi med kontrol", p: "Vi bruger AI til udkast og billeder. Alt indhold skal igennem faste kvalitetskrav for længde, struktur, links og forbud mod præcise priser, før det udgives." },
];

const Editorial = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Redaktionen bag Serviceyderes guides og artikler"
      description="Sådan skriver, tjekker og opdaterer Serviceyderes redaktion guides om priser, regler og servicearbejde i Danmark."
      canonicalPath="/redaktion"
      jsonLd={[{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "Serviceyderes redaktion",
        url: "https://serviceydere.dk/redaktion",
        publisher: { "@type": "Organization", name: "Serviceydere", url: "https://serviceydere.dk/" },
      }]}
    />
    <SiteNav />
    <main id="main" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Serviceyderes redaktion</h1>
      <p className="mt-4 text-lg leading-relaxed text-foreground/80">
        Vores guides skal hjælpe dig med at forstå priser, regler og hvad du skal være opmærksom på, når du bestiller eller driver servicearbejde. Her er de principper, vi skriver efter.
      </p>
      <div className="mt-10 space-y-6">
        {PRINCIPLES.map((x) => (
          <section key={x.h} className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold text-foreground">{x.h}</h2>
            <p className="mt-2 leading-relaxed text-foreground/80">{x.p}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-foreground/80">
        Har du fundet en fejl? <Link to="/kontakt" className="font-semibold underline underline-offset-2">Skriv til os</Link>, så retter vi den. Se alle artikler på <Link to="/blog" className="font-semibold underline underline-offset-2">bloggen</Link>.
      </p>
    </main>
    <Footer />
  </div>
);

export default Editorial;
