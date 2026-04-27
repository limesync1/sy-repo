import LegalPage from "./LegalPage";

const Terms = () => (
  <LegalPage
    title="Vilkår og betingelser"
    subtitle="Vilkår for brug af Serviceydere ApS' platform — gælder både private brugere og tilmeldte serviceudbydere."
    description="Vilkår og betingelser for brug af Serviceydere — Danmarks platform for serviceydere."
    canonicalPath="/vilkaar"
    updated="27. april 2026"
    sections={[
      {
        id: "om",
        title: "1. Om Serviceydere",
        body: (
          <p>
            Serviceydere drives af Adely Group (CVR-nr. 40543120) — software og full-service branding. Platformen formidler kontakt mellem private og virksomheder, der udbyder serviceydelser. Serviceydere er ikke part i den aftale, der måtte indgås mellem en kunde og en udbyder.
          </p>
        ),
      },
      {
        id: "brug",
        title: "2. Brug af platformen",
        body: (
          <ul className="ml-5 list-disc space-y-1">
            <li>Du skal være myndig (18+) for at oprette en konto eller bestille opgaver via platformen.</li>
            <li>Oplysninger du afgiver skal være korrekte og opdaterede.</li>
            <li>Du må ikke bruge platformen til ulovlige formål, spam, chikane eller misbrug.</li>
            <li>Vi forbeholder os ret til at suspendere konti, der overtræder vilkårene.</li>
          </ul>
        ),
      },
      {
        id: "tilbud",
        title: "3. Indhent 3 tilbud",
        body: (
          <>
            <p>
              Når du indhenter tilbud via platformen, deler vi din forespørgsel og — hvis du har givet samtykke — dine kontaktoplysninger med op til tre matchede udbydere, som herefter kan kontakte dig direkte vedrørende den konkrete forespørgsel.
            </p>
            <p>
              Udbydere må alene kontakte dig om den specifikke forespørgsel. De må ikke bruge dine oplysninger til markedsføring uden særskilt samtykke. Du kan til enhver tid trække dit samtykke tilbage ved at skrive til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>.
            </p>
            <p>Tilbud er uforpligtende, indtil du udtrykkeligt accepterer et konkret tilbud fra en udbyder.</p>
          </>
        ),
      },
      {
        id: "udbydere",
        title: "4. Vilkår for serviceudbydere",
        body: (
          <>
            <p>Som registreret udbyder accepterer du følgende:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Du er ansvarlig for at have de nødvendige tilladelser, autorisationer og forsikringer til at udføre dine ydelser.</li>
              <li>Du må kun bruge kundedata fra Serviceydere til at besvare den konkrete forespørgsel — ikke til markedsføring uden særskilt samtykke.</li>
              <li>Du forpligter dig til at overholde gældende dansk ret, herunder forbrugeraftaleloven, markedsføringsloven og GDPR.</li>
              <li>Abonnementsbetaling og priser fremgår af din konto. Opsigelse kan ske til udløb af indeværende periode.</li>
              <li>Vi kan suspendere eller fjerne din virksomhedsprofil ved gentagne klager, manglende betaling eller overtrædelse af vilkårene.</li>
            </ul>
          </>
        ),
      },
      {
        id: "betaling",
        title: "5. Betaling og prøveperiode",
        body: (
          <>
            <p>
              Udbydere får 14 dages gratis prøveperiode (medmindre andet er angivet). Herefter trækkes det valgte abonnement automatisk via Stripe. Priser oplyses i danske kroner inkl. moms.
            </p>
            <p>Manglende betaling kan medføre, at virksomhedsprofilen deaktiveres.</p>
          </>
        ),
      },
      {
        id: "ansvar",
        title: "6. Ansvarsfraskrivelse",
        body: (
          <>
            <p>
              Serviceydere bestræber sig på at sikre høj kvalitet i matches, men vi garanterer ikke et bestemt resultat eller kvaliteten af de udførte ydelser.
            </p>
            <p>
              Vi er ikke ansvarlige for tab eller skader, der måtte opstå som følge af aftaler indgået mellem kunder og udbydere. Tvister mellem kunde og udbyder skal som udgangspunkt afgøres mellem parterne.
            </p>
          </>
        ),
      },
      {
        id: "fortrydelse",
        title: "7. Fortrydelsesret for forbrugere",
        body: (
          <p>
            Som forbruger har du som udgangspunkt 14 dages fortrydelsesret ved aftaler indgået online. Hvis du ønsker at få ydelsen leveret inden fortrydelsesfristens udløb, kan retten bortfalde, jf. forbrugeraftaleloven §18, stk. 2, nr. 1, hvis du udtrykkeligt har accepteret dette.
          </p>
        ),
      },
      {
        id: "lovvalg",
        title: "8. Lovvalg og værneting",
        body: (
          <p>Vilkårene er underlagt dansk ret. Tvister afgøres ved Københavns Byret som første instans, medmindre præceptive forbrugerregler anviser andet.</p>
        ),
      },
      {
        id: "aendringer-vilkaar",
        title: "9. Ændringer",
        body: <p>Vi kan ændre vilkårene med rimeligt varsel via e-mail eller via en notifikation på platformen.</p>,
      },
    ]}
  />
);

export default Terms;