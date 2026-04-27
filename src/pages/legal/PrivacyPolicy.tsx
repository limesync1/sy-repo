import LegalPage from "./LegalPage";

const PrivacyPolicy = () => (
  <LegalPage
    title="Privatlivspolitik"
    subtitle="Sådan behandler Serviceydere ApS dine personoplysninger, jf. databeskyttelsesforordningen (GDPR) og databeskyttelsesloven."
    description="Privatlivspolitik for Serviceydere — hvordan vi indsamler, bruger og beskytter dine personoplysninger."
    canonicalPath="/privatlivspolitik"
    updated="27. april 2026"
    sections={[
      {
        id: "dataansvarlig",
        title: "1. Dataansvarlig",
        body: (
          <>
            <p>
              Serviceydere ApS (CVR-nr. 40543120) er dataansvarlig for behandlingen af de personoplysninger,
              vi indsamler om dig, når du bruger serviceydere.dk og tilhørende tjenester.
            </p>
            <p>Du kan altid kontakte os på <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>.</p>
          </>
        ),
      },
      {
        id: "hvilke-data",
        title: "2. Hvilke oplysninger behandler vi?",
        body: (
          <>
            <p>Når du bruger Serviceydere kan vi behandle følgende oplysninger om dig:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Identifikationsoplysninger: navn, e-mail, telefonnummer, adresse og postnummer.</li>
              <li>Forespørgsler: kategori, beskrivelse af opgave, evt. lokation og budget.</li>
              <li>Kontooplysninger: profilbillede, login, kontaktpræferencer.</li>
              <li>Virksomhedsoplysninger: CVR-nr., firmanavn, faktureringsdata for udbydere.</li>
              <li>Tekniske oplysninger: IP-adresse, browsertype, enheds-ID, log-data.</li>
              <li>Cookies: se vores <a href="/cookies" className="text-foreground underline">cookiepolitik</a>.</li>
            </ul>
          </>
        ),
      },
      {
        id: "formal",
        title: "3. Formål og behandlingsgrundlag",
        body: (
          <>
            <p>Vi behandler dine personoplysninger til følgende formål:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-foreground">Levering af tjenesten</strong> — at matche dig med relevante udbydere og videreformidle din forespørgsel.
                Grundlag: aftale, jf. GDPR art. 6, stk. 1, litra b.
              </li>
              <li>
                <strong className="text-foreground">Samtykke</strong> — når du via "Indhent 3 tilbud" giver tilladelse til, at vi deler dine kontaktoplysninger med matchede virksomheder.
                Grundlag: samtykke, jf. GDPR art. 6, stk. 1, litra a.
              </li>
              <li>
                <strong className="text-foreground">Bogføring og fakturering</strong> for udbydere.
                Grundlag: retlig forpligtelse (bogføringsloven), jf. GDPR art. 6, stk. 1, litra c.
              </li>
              <li>
                <strong className="text-foreground">Kundeservice og sikkerhed</strong> — fejlretning, misbrugsbekæmpelse og supporthenvendelser.
                Grundlag: legitim interesse, jf. GDPR art. 6, stk. 1, litra f.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "deling",
        title: "4. Hvem deler vi data med?",
        body: (
          <>
            <p>
              Vi videregiver kun dine oplysninger, når det er nødvendigt for at levere tjenesten, eller når du har givet samtykke. Modtagere kan være:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Matchede serviceudbydere på platformen — kun de oplysninger du har valgt at dele i forbindelse med en forespørgsel.</li>
              <li>Databehandlere som hosting (Supabase/AWS), e-mail (Lovable Email), betalingsudbyder (Stripe) og analyseværktøjer.</li>
              <li>Offentlige myndigheder, hvis vi er retligt forpligtet hertil.</li>
            </ul>
            <p>Vi overfører som udgangspunkt ikke data uden for EU/EØS. Hvis det undtagelsesvist sker, er det baseret på EU-Kommissionens standardkontrakter.</p>
          </>
        ),
      },
      {
        id: "opbevaring",
        title: "5. Opbevaring og sletning",
        body: (
          <>
            <ul className="ml-5 list-disc space-y-1">
              <li>Forespørgsler og leads: op til 24 måneder fra sidste aktivitet.</li>
              <li>Konto- og virksomhedsdata: så længe din konto er aktiv + 12 måneder.</li>
              <li>Bogføringsmateriale: 5 år fra udgangen af det regnskabsår, materialet vedrører (bogføringsloven).</li>
              <li>Marketing-samtykker: indtil du trækker dit samtykke tilbage.</li>
            </ul>
          </>
        ),
      },
      {
        id: "rettigheder",
        title: "6. Dine rettigheder",
        body: (
          <>
            <p>Du har efter GDPR følgende rettigheder:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Indsigt i hvilke oplysninger vi behandler om dig.</li>
              <li>Berigtigelse af forkerte oplysninger.</li>
              <li>Sletning ("retten til at blive glemt") inden for lovens rammer.</li>
              <li>Begrænsning af behandlingen.</li>
              <li>Dataportabilitet.</li>
              <li>Indsigelse mod behandling baseret på legitim interesse eller direkte markedsføring.</li>
              <li>Tilbagekaldelse af samtykke til enhver tid.</li>
            </ul>
            <p>Skriv til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a> for at udøve dine rettigheder.</p>
          </>
        ),
      },
      {
        id: "klage",
        title: "7. Klage til Datatilsynet",
        body: (
          <p>
            Du kan klage over vores behandling af dine personoplysninger til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby — <a href="https://www.datatilsynet.dk" className="text-foreground underline" target="_blank" rel="noopener noreferrer">datatilsynet.dk</a>.
          </p>
        ),
      },
      {
        id: "aendringer",
        title: "8. Ændringer i politikken",
        body: <p>Vi kan opdatere denne privatlivspolitik. Den til enhver tid gældende version findes på serviceydere.dk/privatlivspolitik.</p>,
      },
    ]}
  />
);

export default PrivacyPolicy;