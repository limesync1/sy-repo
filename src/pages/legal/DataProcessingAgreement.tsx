import { Link } from "react-router-dom";
import LegalPage from "./LegalPage";
import { SUB_PROCESSORS, DPA_VERSION } from "@/data/subprocessors";

/**
 * Databehandleraftale mellem virksomheden (dataansvarlig) og Serviceydere
 * (databehandler) for de kunde- og medarbejderoplysninger, virksomheden
 * lægger i virksomhedspanelet. Accepteres aktivt i panelet, og accepten
 * logges med tidspunkt, bruger og version.
 */
const DataProcessingAgreement = () => (
  <LegalPage
    title="Databehandleraftale"
    subtitle="Aftale om vores behandling af oplysninger om jeres kunder og medarbejdere i virksomhedspanelet, jf. databeskyttelsesforordningens artikel 28."
    description="Databehandleraftale for Serviceyderes virksomhedspanel: instruks, sikkerhed, underdatabehandlere, sletning og revision."
    canonicalPath="/databehandleraftale"
    updated="27. april 2026"
    sections={[
      {
        id: "parter",
        title: "1. Parterne og aftalens omfang",
        body: (
          <>
            <p>
              Denne aftale (version {DPA_VERSION}) indgås mellem den virksomhed, der bruger Serviceyderes
              virksomhedspanel (<strong className="text-foreground">den dataansvarlige</strong>), og Adely Group,
              CVR-nr. 40543120, der driver Serviceydere (<strong className="text-foreground">databehandleren</strong>).
            </p>
            <p>
              Aftalen gælder databehandlerens behandling af personoplysninger på den dataansvarliges vegne,
              når virksomheden bruger panelet til kunder, aftaler, ruter, medarbejdere, tilbud, fakturagrundlag
              og beskeder. Aftalen har forrang for vores{" "}
              <Link to="/vilkaar" className="text-foreground underline">vilkår</Link> i spørgsmål om behandling
              af personoplysninger.
            </p>
            <p>
              For de oplysninger, vi selv bestemmer formålet med — fx jeres eget abonnement, jeres login og
              markedspladsen — er vi dataansvarlige. Det er beskrevet i{" "}
              <Link to="/privatlivspolitik" className="text-foreground underline">privatlivspolitikken</Link>.
            </p>
          </>
        ),
      },
      {
        id: "instruks",
        title: "2. Instruks",
        body: (
          <>
            <p>
              Vi behandler kun personoplysninger efter dokumenteret instruks fra jer. Instruksen er den brug,
              panelet lægger op til: at gemme og vise jeres kunder og aftaler, planlægge ruter, sende
              beskeder I selv udløser, danne fakturagrundlag og give jeres medarbejdere adgang til deres eget arbejde.
            </p>
            <p>
              Vi bruger ikke jeres kundedata til egne formål, sælger dem ikke og bruger dem ikke til at træne
              AI-modeller. Vi kan behandle anonymiserede og aggregerede driftstal, der ikke kan henføres til
              en person, til at forbedre systemet.
            </p>
            <p>
              Mener vi, at en instruks strider mod databeskyttelsesreglerne, giver vi jer besked med det samme.
            </p>
          </>
        ),
      },
      {
        id: "kategorier",
        title: "3. Kategorier af registrerede og oplysninger",
        body: (
          <>
            <p><strong className="text-foreground">Registrerede:</strong> jeres kunder (private og erhverv), disses kontaktpersoner, og jeres egne medarbejdere.</p>
            <p><strong className="text-foreground">Oplysninger:</strong> navn, adresse, postnummer og by, e-mail, telefonnummer, CVR-nummer for erhvervskunder, aftaler og opgaver, noter og adgangsforhold I selv skriver, planlagte og udførte besøg, tidsregistreringer, fotos og dokumenter I uploader, beskedhistorik samt fakturagrundlag.</p>
            <p><strong className="text-foreground">Tekniske oplysninger:</strong> IP-adresse, enheds- og browseroplysninger samt hændelseslogs, der bruges til sikkerhed, fejlretning og sporbarhed — blandt andet i rutehistorikken, hvor virksomhedens ejer kan se hvem der har ændret hvad.</p>
            <p><strong className="text-foreground">Særlige kategorier:</strong> panelet er ikke beregnet til følsomme oplysninger, jf. artikel 9. Skriv derfor ikke helbredsoplysninger eller lignende i frie tekstfelter. Sygemelding af en medarbejder registreres udelukkende som fravær på en dato — ikke som en helbredsoplysning.</p>
          </>
        ),
      },
      {
        id: "sikkerhed",
        title: "4. Sikkerhed",
        body: (
          <>
            <p>Vi træffer passende tekniske og organisatoriske foranstaltninger, jf. artikel 32. Konkret betyder det blandt andet:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Al trafik til og fra panelet sker krypteret over HTTPS, og data opbevares i krypteret form hos vores hostingleverandør.</li>
              <li>Adgangen til data er styret pr. virksomhed på databaseniveau, så én virksomhed ikke kan se en andens data.</li>
              <li>Medarbejderlogins ser kun det, deres rolle kræver — typisk deres egne ruter og opgaver.</li>
              <li>Ændringer på ruter logges med bruger, tidspunkt, IP-adresse og enhed. De tekniske spor er kun synlige for virksomhedens ejer.</li>
              <li>Adgangskoder gemmes aldrig i klartekst, og vores adgang til produktionsdata er begrænset til det, support og drift kræver.</li>
              <li>Der tages løbende sikkerhedskopier hos hostingleverandøren.</li>
            </ul>
          </>
        ),
      },
      {
        id: "underdatabehandlere",
        title: "5. Underdatabehandlere",
        body: (
          <>
            <p>
              I giver med denne aftale generel godkendelse til, at vi bruger underdatabehandlere. De aktuelle
              underdatabehandlere fremgår af{" "}
              <Link to="/underdatabehandlere" className="text-foreground underline">listen over underdatabehandlere</Link>{" "}
              og omfatter i dag blandt andet {SUB_PROCESSORS.slice(0, 4).map((s) => s.name.split(" (")[0]).join(", ")} m.fl.
            </p>
            <p>
              Vi indgår skriftlig aftale med hver underdatabehandler med mindst samme forpligtelser som i denne
              aftale. Ved tilføjelse eller udskiftning varsler vi jer på e-mail, inden ændringen træder i kraft,
              og I kan gøre indsigelse og i sidste ende opsige abonnementet.
            </p>
            <p>
              Overførsel til lande uden for EU/EØS sker kun på et gyldigt overførselsgrundlag, typisk
              EU-Kommissionens standardkontraktbestemmelser.
            </p>
          </>
        ),
      },
      {
        id: "bistand",
        title: "6. Bistand til jer",
        body: (
          <>
            <p>
              Vi bistår jer med at opfylde jeres forpligtelser over for de registrerede — indsigt, berigtigelse,
              sletning, begrænsning og dataportabilitet. Meget kan I selv klare i panelet: rette og slette
              kunder, eksportere data og lukke medarbejderadgange.
            </p>
            <p>
              Henvender en af jeres kunder sig direkte til os, videresender vi henvendelsen til jer og svarer
              ikke på jeres vegne.
            </p>
          </>
        ),
      },
      {
        id: "brud",
        title: "7. Brud på persondatasikkerheden",
        body: (
          <p>
            Opdager vi et brud, underretter vi jer uden unødig forsinkelse og senest 24 timer efter, vi er blevet
            bekendt med det, med de oplysninger vi har om bruddets karakter, omfang og konsekvenser samt de
            tiltag, vi har iværksat. Anmeldelse til Datatilsynet er jeres ansvar som dataansvarlig, men vi
            leverer det materiale, I har brug for.
          </p>
        ),
      },
      {
        id: "sletning",
        title: "8. Opbevaring og sletning",
        body: (
          <>
            <p>
              Vi opbevarer oplysningerne, så længe I har et aktivt abonnement. Ved ophør kan I hente jeres data,
              og vi sletter eller anonymiserer dem senest 90 dage efter abonnementets ophør, medmindre lovgivning
              kræver længere opbevaring — fx bogføringsmateriale, der skal gemmes i 5 år.
            </p>
            <p>
              Sikkerhedskopier ryddes efter vores normale rotation. Sletter I en kunde i panelet, fjernes
              oplysningerne fra den daglige drift, mens hændelseslogs kan bevare en teknisk henvisning af
              hensyn til sporbarhed.
            </p>
          </>
        ),
      },
      {
        id: "revision",
        title: "9. Dokumentation og revision",
        body: (
          <p>
            Vi stiller på anmodning de oplysninger til rådighed, der er nødvendige for at påvise, at vi
            overholder artikel 28 — herunder beskrivelse af sikkerhedsforanstaltninger og listen over
            underdatabehandlere. Ønsker I en egentlig revision, aftales tidspunkt og omfang i forvejen, og
            omkostningerne afholdes af jer, medmindre revisionen påviser væsentlig misligholdelse fra vores side.
          </p>
        ),
      },
      {
        id: "ikrafttraeden",
        title: "10. Ikrafttræden, ændringer og ophør",
        body: (
          <>
            <p>
              Aftalen træder i kraft, når I accepterer den i virksomhedspanelet, og gælder så længe vi behandler
              personoplysninger på jeres vegne. Accepten logges med virksomhed, bruger, tidspunkt og version, og
              I kan altid se og hente den fra panelet.
            </p>
            <p>
              Væsentlige ændringer varsler vi på e-mail og beder om fornyet accept i panelet. Aftalen er underlagt
              dansk ret med Københavns Byret som værneting.
            </p>
            <p>
              Spørgsmål:{" "}
              <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>.
            </p>
          </>
        ),
      },
    ]}
  />
);

export default DataProcessingAgreement;
