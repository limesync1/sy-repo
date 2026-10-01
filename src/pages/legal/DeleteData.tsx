import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Cookie, ExternalLink, Mail, Trash2 } from "lucide-react";
import LegalPage from "./LegalPage";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "serviceydere.cookie-consent";

const DeleteData = () => {
  const [cookieChoiceRemoved, setCookieChoiceRemoved] = useState(false);

  const removeCookieChoice = () => {
    try {
      localStorage.removeItem(COOKIE_KEY);
    } finally {
      setCookieChoiceRemoved(true);
    }
  };

  return (
    <LegalPage
      title="Slet data"
      subtitle="Her kan du slette lokale cookievalg, anmode om sletning af personoplysninger eller fjerne en virksomhedskonto."
      description="Slet dine data hos Serviceydere, træk samtykke tilbage, nulstil cookievalg eller anmod om sletning af konto og virksomhedsdata."
      canonicalPath="/slet-data"
      updated="1. oktober 2026"
      sections={[
        {
          id: "vaelg",
          title: "Vælg hvad du vil slette",
          body: (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <Trash2 className="mb-2 h-5 w-5 text-foreground" aria-hidden />
                <p className="font-semibold text-foreground">Konto og personoplysninger</p>
                <p className="mt-1 text-sm">Bed os slette din konto, tilbudsforespørgsler, kontaktoplysninger og andre personoplysninger, som vi ikke er forpligtet til at gemme.</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <Cookie className="mb-2 h-5 w-5 text-foreground" aria-hidden />
                <p className="font-semibold text-foreground">Cookies og samtykke</p>
                <p className="mt-1 text-sm">Nulstil dit gemte cookievalg på denne enhed. Cookie-banneret vises igen, så du kan vælge på ny.</p>
              </div>
            </div>
          ),
        },
        {
          id: "cookievalg",
          title: "Slet cookievalg på denne enhed",
          body: (
            <>
              <p>Denne handling fjerner det cookievalg, som Serviceydere har gemt lokalt i din browser. Den sletter ikke oplysninger, som din browser eller eksterne tjenester allerede har lagret.</p>
              <Button type="button" variant="outline" onClick={removeCookieChoice} className="gap-2">
                {cookieChoiceRemoved ? <CheckCircle2 className="h-4 w-4" /> : <Cookie className="h-4 w-4" />}
                {cookieChoiceRemoved ? "Cookievalg er nulstillet" : "Nulstil mit cookievalg"}
              </Button>
              <p>Du kan også slette alle cookies for serviceydere.dk direkte i din browser. Se flere muligheder i vores <Link to="/cookies" className="font-medium text-foreground underline">cookiepolitik</Link>.</p>
            </>
          ),
        },
        {
          id: "privat-konto",
          title: "Slet en privat konto eller forespørgsel",
          body: (
            <>
              <p>Send din anmodning fra den e-mailadresse, du brugte på Serviceydere. Skriv hvilke oplysninger eller forespørgsler du ønsker slettet, så vi kan identificere dem uden at bede om flere oplysninger end nødvendigt.</p>
              <Button asChild className="gap-2">
                <a href="mailto:kontakt@serviceydere.dk?subject=Anmodning%20om%20sletning%20af%20data&body=Hej%20Serviceydere%0A%0AJeg%20%C3%B8nsker%20at%20f%C3%A5%20slettet%3A%0A%0AE-mailen%20p%C3%A5%20min%20konto%2Fforesp%C3%B8rgsel%3A%0A%0AVenlig%20hilsen">
                  <Mail className="h-4 w-4" /> Send anmodning
                </a>
              </Button>
            </>
          ),
        },
        {
          id: "virksomhedsdata",
          title: "Slet virksomhed og medarbejderdata",
          body: (
            <>
              <p>En virksomhedsejer kan anmode om sletning direkte i virksomhedspanelets indstillinger. Handlingen kræver en bekræftelseskode sendt til ejerens e-mail, så uvedkommende ikke kan slette virksomheden.</p>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/virksomhed?tab=settings"><ExternalLink className="h-4 w-4" /> Åbn virksomhedsindstillinger</Link>
              </Button>
              <p>Medarbejdere kan bede virksomhedsejeren fjerne deres adgang. Ønsker du også oplysninger hos Serviceydere slettet, kan du sende en separat anmodning til kontakt@serviceydere.dk.</p>
            </>
          ),
        },
        {
          id: "samtykke",
          title: "Tilbagekald samtykke og datatilladelser",
          body: (
            <>
              <p>Du kan til enhver tid tilbagekalde et samtykke. Det gælder blandt andet deling af kontaktoplysninger i en tilbudsforespørgsel og forbindelser til eksterne tjenester. Tilbagekaldelsen gælder fremadrettet og ændrer ikke lovlig behandling, der allerede er udført.</p>
              <p>Virksomheder kan afbryde eksterne forbindelser under de relevante indstillinger. Du kan desuden skrive til <a href="mailto:kontakt@serviceydere.dk" className="font-medium text-foreground underline">kontakt@serviceydere.dk</a> og oplyse, hvilken tilladelse du vil trække tilbage.</p>
            </>
          ),
        },
        {
          id: "behandlingstid",
          title: "Hvad sker der efter din anmodning?",
          body: (
            <>
              <p>Vi bekræfter din identitet, afgrænser anmodningen og svarer som udgangspunkt senest én måned efter modtagelsen. Hvis anmodningen er kompleks, kan fristen forlænges efter GDPR.</p>
              <p>Oplysninger, som vi er retligt forpligtet til at opbevare — eksempelvis regnskabsmateriale eller dokumentation for sikkerhedshændelser — slettes først, når opbevaringspligten udløber. Adgang begrænses i mellemtiden til det nødvendige.</p>
            </>
          ),
        },
      ]}
    />
  );
};

export default DeleteData;