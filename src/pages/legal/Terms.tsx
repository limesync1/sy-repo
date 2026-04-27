import LegalPage from "./LegalPage";

const Terms = () => (
  <LegalPage
    title="Vilkår og betingelser"
    subtitle="Vilkår for brug af serviceydere.dk — gælder både private brugere (forbrugere) og tilmeldte serviceudbydere (erhvervsdrivende)."
    description="Vilkår og betingelser for brug af Serviceydere — Danmarks platform for serviceydere."
    canonicalPath="/vilkaar"
    updated="27. april 2026"
    sections={[
      {
        id: "om",
        title: "1. Om Serviceydere",
        body: (
          <>
            <p>
              Serviceydere er en digital formidlingsplatform, der drives af <strong className="text-foreground">Adely Group</strong> (CVR-nr. 40543120) — software og full-service branding. Platformen formidler udelukkende kontakt mellem forbrugere og erhvervsdrivende, der udbyder serviceydelser.
            </p>
            <p>
              Serviceydere er <strong className="text-foreground">ikke part</strong> i den aftale, som måtte indgås mellem en kunde og en udbyder, og er ikke ansvarlig for udbyderens udførelse, kvalitet, priser, fakturering eller eventuelle tvister vedrørende den enkelte ydelse. Disse forhold er et anliggende mellem kunden og udbyderen.
            </p>
          </>
        ),
      },
      {
        id: "brug",
        title: "2. Generelle vilkår for brug",
        body: (
          <>
            <ul className="ml-5 list-disc space-y-1">
              <li>Du skal være fyldt 18 år og myndig for at oprette en konto eller bestille opgaver via platformen.</li>
              <li>De oplysninger du afgiver skal være korrekte, fuldstændige og opdaterede.</li>
              <li>Du må ikke bruge platformen til ulovlige eller skadelige formål, spam, chikane, krænkelse af andres rettigheder, automatiseret skrabning af data eller forsøg på at omgå sikkerhedsforanstaltninger.</li>
              <li>Du er selv ansvarlig for at holde dine login-oplysninger fortrolige.</li>
              <li>Vi forbeholder os ret til, uden varsel, at fjerne indhold eller suspendere/lukke konti som overtræder disse vilkår eller dansk lovgivning.</li>
            </ul>
          </>
        ),
      },
      {
        id: "tilbud",
        title: "3. Indhent 3 tilbud — formidling og samtykke",
        body: (
          <>
            <p>
              Når du anvender funktionen "Indhent 3 tilbud", videregiver vi din forespørgsel og — såfremt du udtrykkeligt har afkrydset samtykkefeltet — dine kontaktoplysninger (navn, e-mail og evt. telefonnummer) til op til tre matchede udbydere. Behandlingsgrundlaget er dit samtykke, jf. GDPR art. 6, stk. 1, litra a.
            </p>
            <p>
              Udbydere må alene kontakte dig om den konkrete forespørgsel. De må <strong className="text-foreground">ikke</strong> anvende dine oplysninger til direkte markedsføring uden dit særskilte og udtrykkelige forudgående samtykke, jf. markedsføringsloven §10. Det er en kontraktlig forpligtelse for udbydere registreret på platformen.
            </p>
            <p>
              Du kan til enhver tid trække dit samtykke tilbage med fremadrettet virkning ved at skrive til <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline">kontakt@serviceydere.dk</a>. Tilbud modtaget via platformen er <strong className="text-foreground">uforpligtende</strong>, indtil du udtrykkeligt accepterer et konkret tilbud direkte over for en udbyder.
            </p>
          </>
        ),
      },
      {
        id: "udbydere",
        title: "4. Vilkår for serviceudbydere",
        body: (
          <>
            <p>Som registreret serviceudbyder (erhvervsdrivende) accepterer du følgende:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Du har de nødvendige tilladelser, autorisationer (fx el-/VVS-autorisation, hvor relevant) og lovpligtige forsikringer til at udføre de udbudte ydelser.</li>
              <li>Du fremstår med korrekt CVR-nr. og kontaktoplysninger, og du oplyser priser, vilkår og forventet levering klart over for kunder.</li>
              <li>Kundedata modtaget via platformen må <em>kun</em> anvendes til at besvare den konkrete forespørgsel. Brug til markedsføring kræver et særskilt samtykke fra kunden, jf. markedsføringsloven §10.</li>
              <li>Du overholder al gældende dansk lovgivning, herunder forbrugeraftaleloven (lov nr. 1457 af 17. december 2013), købeloven, markedsføringsloven, hvidvaskloven, bogføringsloven og GDPR.</li>
              <li>Du indgår en databehandleraftale med Serviceydere i det omfang behandlingen af kundedata kræver det, jf. GDPR art. 28.</li>
              <li>Abonnementspriser, ekstratjenester og fakturering fremgår løbende af din konto. Opsigelse kan ske til udløb af indeværende betalingsperiode via kontoens indstillinger.</li>
              <li>Vi kan med rimeligt varsel suspendere eller fjerne din virksomhedsprofil ved gentagne berettigede klager, manglende betaling, vildledende oplysninger eller overtrædelse af disse vilkår.</li>
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
              Nye udbydere kan tilbydes en gratis prøveperiode på op til 14 dage (medmindre andet er angivet i tilbuddet). Efter prøveperiodens udløb fornyes abonnementet automatisk og trækkes via vores betalingsudbyder Stripe Payments Europe Ltd. Priser oplyses i danske kroner og er inkl. moms (25%), medmindre andet udtrykkeligt fremgår.
            </p>
            <p>
              Manglende betaling kan, efter mindst én rykker, medføre at virksomhedsprofilen deaktiveres. Eventuelt udestående beløb forfalder fortsat til betaling.
            </p>
          </>
        ),
      },
      {
        id: "ansvar",
        title: "6. Ansvarsfraskrivelse",
        body: (
          <>
            <p>
              Serviceydere bestræber sig på at sikre høj kvalitet i matchende udbydere, men vi yder <strong className="text-foreground">ingen garanti</strong> for et bestemt resultat, en bestemt pris eller kvaliteten af den ydelse, en udbyder leverer.
            </p>
            <p>
              Vi er — i det omfang gældende ret tillader det — ikke ansvarlige for direkte eller indirekte tab, driftstab, tabt fortjeneste, dataspil eller skader, der måtte opstå som følge af aftaler indgået mellem en kunde og en udbyder, eller som følge af nedetid på platformen. Vores samlede erstatningsansvar over for en udbyder kan i alle tilfælde aldrig overstige det beløb, udbyderen har betalt til Serviceydere de seneste 12 måneder forud for skadens indtræden.
            </p>
            <p>
              <strong className="text-foreground">Ufravigelige forbrugerregler</strong> begrænses ikke af ovenstående. Tvister mellem kunde og udbyder skal som udgangspunkt afgøres direkte mellem parterne, eller via Forbrugerklagenævnet/Center for Klageløsning, jf. lov nr. 524 af 29. april 2015.
            </p>
          </>
        ),
      },
      {
        id: "fortrydelse",
        title: "7. Fortrydelsesret for forbrugere",
        body: (
          <>
            <p>
              Som forbruger har du som udgangspunkt 14 dages fortrydelsesret ved fjernsalgsaftaler indgået online, jf. forbrugeraftaleloven §18, stk. 1. Fristen regnes fra dagen efter aftaleindgåelsen for tjenesteydelser, og fra dagen efter modtagelsen for varer.
            </p>
            <p>
              <strong className="text-foreground">Bemærk:</strong> Hvis du udtrykkeligt anmoder om, at en tjenesteydelse påbegyndes inden fortrydelsesfristens udløb, og samtidig anerkender, at fortrydelsesretten bortfalder, når ydelsen er fuldt leveret, mister du retten ved fuld levering, jf. forbrugeraftaleloven §18, stk. 2, nr. 1. For delvist leverede ydelser skal du betale et beløb svarende til den leverede del.
            </p>
            <p>
              Du fortryder ved en utvetydig erklæring til den udbyder, du har indgået aftalen med — fx via e-mail. Du kan bruge standardfortrydelsesformularen i bilaget til forbrugeraftaleloven.
            </p>
          </>
        ),
      },
      {
        id: "immaterielle",
        title: "8. Immaterielle rettigheder",
        body: (
          <p>
            Alt indhold på serviceydere.dk — herunder design, kildekode, logoer, varemærker og tekster der ikke er bidraget af brugere — tilhører Adely Group eller dets licensgivere og er beskyttet af ophavsret og varemærkelovgivning. Indhold som du selv uploader (fx billeder, beskrivelser, anmeldelser) bevarer du rettighederne til, men du giver Serviceydere en vederlagsfri, ikke-eksklusiv licens til at vise og anvende det i forbindelse med driften af platformen.
          </p>
        ),
      },
      {
        id: "lovvalg",
        title: "9. Lovvalg og værneting",
        body: (
          <p>Vilkårene er underlagt dansk ret med undtagelse af lovvalgsregler, der måtte henvise til andet lands ret. Tvister afgøres ved Københavns Byret som første instans, medmindre ufravigelige forbrugerregler eller anden præceptiv lovgivning anviser et andet værneting. Forbrugere har altid ret til at anlægge sag ved retten i deres hjemting.</p>
        ),
      },
      {
        id: "aendringer-vilkaar",
        title: "10. Ændringer af vilkår",
        body: <p>Vi kan ændre disse vilkår med mindst 30 dages varsel via e-mail eller via en notifikation på platformen. Hvis du ikke ønsker at acceptere ændringerne, kan du opsige din konto inden ikrafttræden. Fortsat brug af platformen efter ikrafttræden anses som accept af de opdaterede vilkår.</p>,
      },
    ]}
  />
);

export default Terms;