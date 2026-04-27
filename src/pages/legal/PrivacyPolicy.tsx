import LegalPage from "./LegalPage";

const PrivacyPolicy = () => (
  <LegalPage
    title="Privatlivspolitik"
    subtitle="Sådan behandler vi dine personoplysninger på serviceydere.dk, jf. databeskyttelsesforordningen (forordning (EU) 2016/679 — GDPR) og databeskyttelsesloven (lov nr. 502 af 23. maj 2018 med senere ændringer)."
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
              Serviceydere drives af Adely Group (CVR-nr. 40543120) — software og full-service branding —
              som er dataansvarlig (jf. GDPR art. 4, nr. 7) for behandlingen af de personoplysninger,
              vi indsamler om dig, når du bruger serviceydere.dk og tilhørende tjenester.
            </p>
            <p>
              <strong className="text-foreground">Adely Group</strong><br />
              CVR-nr.: 40543120<br />
              E-mail: <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a><br />
              Domæne: serviceydere.dk
            </p>
            <p>
              For henvendelser om dine rettigheder, sletning af data eller spørgsmål til denne politik kan du
              altid skrive til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>.
            </p>
          </>
        ),
      },
      {
        id: "hvilke-data",
        title: "2. Hvilke personoplysninger behandler vi?",
        body: (
          <>
            <p>Vi behandler som udgangspunkt kun almindelige personoplysninger (jf. GDPR art. 6). Afhængigt af din brug af platformen kan vi behandle:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong className="text-foreground">Identifikations- og kontaktoplysninger:</strong> navn, e-mail, telefonnummer, adresse, postnummer og by.</li>
              <li><strong className="text-foreground">Forespørgsler og opgaver:</strong> kategori, beskrivelse af opgaven, ønsket lokation, budget og evt. billeder du selv uploader.</li>
              <li><strong className="text-foreground">Konto- og profiloplysninger:</strong> profilbillede, login-ID, valgte præferencer, korrespondance med udbydere via platformen.</li>
              <li><strong className="text-foreground">Virksomhedsoplysninger (for udbydere):</strong> CVR-nr., firmanavn, kontaktperson og faktureringsoplysninger. Betalingskortdata håndteres direkte af Stripe — vi opbevarer aldrig fulde kortnumre.</li>
              <li><strong className="text-foreground">Tekniske oplysninger:</strong> IP-adresse, enheds- og browseroplysninger, hændelseslogs til drift, fejlretning og misbrugsbekæmpelse.</li>
              <li><strong className="text-foreground">Cookies og lignende teknologier:</strong> se vores <a href="/cookies" className="text-foreground underline">cookiepolitik</a>.</li>
            </ul>
            <p>Vi indsamler <em>ikke bevidst</em> følsomme oplysninger (jf. GDPR art. 9) som fx helbreds- eller religiøse oplysninger, og vi opfordrer dig til ikke at angive sådanne i fri-tekst.</p>
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
                <strong className="text-foreground">Levering af platformen</strong> — at oprette og drive din konto, vise indhold, formidle kontakt og levere de funktioner du anmoder om.
                Grundlag: aftale, jf. GDPR art. 6, stk. 1, litra b.
              </li>
              <li>
                <strong className="text-foreground">Indhent 3 tilbud</strong> — når du via tilbudsformularen aktivt accepterer at videregive dine kontaktoplysninger til op til 3 matchede udbydere, deler vi navn, e-mail, evt. telefon, postnummer og opgavebeskrivelsen med dem.
                Grundlag: samtykke, jf. GDPR art. 6, stk. 1, litra a.
              </li>
              <li>
                <strong className="text-foreground">Bogføring og fakturering</strong> af betalinger fra udbydere.
                Grundlag: retlig forpligtelse, jf. GDPR art. 6, stk. 1, litra c, sammenholdt med bogføringsloven (lov nr. 700 af 24. maj 2022) §12 om opbevaring af regnskabsmateriale i 5 år.
              </li>
              <li>
                <strong className="text-foreground">Drift, support og sikkerhed</strong> — at svare på henvendelser, forebygge svindel, sikre platformens stabilitet og forbedre tjenesten på baggrund af aggregeret/statistisk brug.
                Grundlag: legitim interesse, jf. GDPR art. 6, stk. 1, litra f.
              </li>
              <li>
                <strong className="text-foreground">Lovlige forpligtelser</strong> — overholdelse af forbrugerbeskyttelses-, regnskabs- og hvidvasklovgivning.
                Grundlag: GDPR art. 6, stk. 1, litra c.
              </li>
            </ul>
            <p className="text-xs">Hvor vi støtter os på <em>legitim interesse</em>, har vi foretaget en interesseafvejning og vurderet, at vores behandling ikke krænker dine rettigheder. Du kan altid gøre indsigelse — se afsnit 6.</p>
          </>
        ),
      },
      {
        id: "deling",
        title: "4. Modtagere og databehandlere",
        body: (
          <>
            <p>
              Vi videregiver kun dine oplysninger, når det er nødvendigt for at levere tjenesten, når du har givet samtykke, eller når vi er retligt forpligtet til det. Modtagere kan være:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong className="text-foreground">Matchede serviceudbydere</strong> — kun de oplysninger du udtrykkeligt har valgt at dele i forbindelse med en konkret tilbudsforespørgsel. Udbyderen agerer selvstændig dataansvarlig for sin egen efterfølgende behandling.</li>
              <li><strong className="text-foreground">Databehandlere</strong> som vi har indgået databehandleraftaler med (jf. GDPR art. 28): hosting og database (Supabase/AWS, EU-region), e-mailudsendelse (Mailgun via Lovable Email), betalingsudbyder (Stripe Payments Europe Ltd.), kortbetjening og analyseværktøjer til drift.</li>
              <li><strong className="text-foreground">Offentlige myndigheder</strong> som SKAT, politi eller domstole, hvis vi er retligt forpligtet hertil.</li>
            </ul>
            <p>Data opbevares som udgangspunkt inden for EU/EØS. Hvis en databehandler undtagelsesvist overfører data til et tredjeland (fx USA), sker det på baggrund af EU-Kommissionens standardkontraktbestemmelser (Standard Contractual Clauses) eller anden gyldig overførselsmekanisme, jf. GDPR kapitel V.</p>
          </>
        ),
      },
      {
        id: "opbevaring",
        title: "5. Opbevaring og sletning",
        body: (
          <>
            <p>Vi opbevarer dine oplysninger så længe det er nødvendigt for de formål, de blev indsamlet til:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Tilbudsforespørgsler og leads: op til 24 måneder fra sidste aktivitet, hvorefter de anonymiseres eller slettes.</li>
              <li>Konto-, profil- og virksomhedsdata: så længe din konto er aktiv plus op til 12 måneder efter lukning.</li>
              <li>Korrespondance og support-tråde: op til 3 år (jf. forældelsesloven §3).</li>
              <li>Regnskabsmateriale (fakturaer, betalinger): 5 år fra udgangen af regnskabsåret, jf. bogføringsloven §12.</li>
              <li>Samtykker (fx til markedsføring): indtil du trækker dit samtykke tilbage, og dokumentation for samtykket i op til 2 år herefter.</li>
              <li>Backups: maksimalt 35 dage, hvorefter data slettes ved næste rotation.</li>
            </ul>
          </>
        ),
      },
      {
        id: "rettigheder",
        title: "6. Dine rettigheder som registreret",
        body: (
          <>
            <p>Du har efter GDPR (art. 15-22) følgende rettigheder, som du gratis kan udøve:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong className="text-foreground">Ret til indsigt</strong> i hvilke oplysninger vi behandler og hvorfor (art. 15).</li>
              <li><strong className="text-foreground">Ret til berigtigelse</strong> af forkerte eller ufuldstændige oplysninger (art. 16).</li>
              <li><strong className="text-foreground">Ret til sletning</strong> ("retten til at blive glemt") inden for lovens rammer (art. 17).</li>
              <li><strong className="text-foreground">Ret til begrænsning</strong> af behandlingen i visse tilfælde (art. 18).</li>
              <li><strong className="text-foreground">Ret til dataportabilitet</strong> — udlevering af dine oplysninger i et struktureret, maskinlæsbart format (art. 20).</li>
              <li><strong className="text-foreground">Ret til indsigelse</strong> mod behandling baseret på legitim interesse, og altid mod direkte markedsføring (art. 21).</li>
              <li><strong className="text-foreground">Ret til at tilbagekalde samtykke</strong> til enhver tid (art. 7, stk. 3) — uden at det berører lovligheden af behandling før tilbagekaldelsen.</li>
            </ul>
            <p>Send din anmodning til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>. Vi besvarer som udgangspunkt inden for én måned, jf. GDPR art. 12, stk. 3. Vi kan bede om dokumentation for din identitet for at beskytte dine oplysninger.</p>
          </>
        ),
      },
      {
        id: "klage",
        title: "7. Klage til Datatilsynet",
        body: (
          <>
            <p>Hvis du er utilfreds med vores behandling af dine personoplysninger, opfordrer vi dig til først at kontakte os. Du har dog altid ret til at indgive en klage til:</p>
            <p>
              <strong className="text-foreground">Datatilsynet</strong><br />
              Carl Jacobsens Vej 35<br />
              2500 Valby<br />
              Telefon: +45 33 19 32 00<br />
              E-mail: <a href="mailto:dt@datatilsynet.dk" className="text-foreground underline">dt@datatilsynet.dk</a><br />
              Web: <a href="https://www.datatilsynet.dk" className="text-foreground underline" target="_blank" rel="noopener noreferrer">datatilsynet.dk</a>
            </p>
          </>
        ),
      },
      {
        id: "aendringer",
        title: "8. Ændringer i politikken",
        body: <p>Vi kan løbende opdatere denne privatlivspolitik for at afspejle ændringer i lovgivningen, vores tjenester eller praksis. Den til enhver tid gældende version findes altid på serviceydere.dk/privatlivspolitik. Ved væsentlige ændringer der påvirker dine rettigheder, vil vi orientere dig på e-mail eller via en notifikation på platformen.</p>,
      },
    ]}
  />
);

export default PrivacyPolicy;