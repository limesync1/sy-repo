import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("saadan-vaelger-du-maler")!;

const ChoosePainter = () => (
  <BlogArticleLayout
    post={post}
    keywords="vælg maler, malerpriser, maler tjekliste, maler kontrakt, professionel maler danmark"
    faq={[
      { q: "Hvad koster en maler i timen i 2026?", a: "En faglært maler koster typisk 425–550 kr. pr. time inkl. moms. Materialer kommer oveni — eller indgår, hvis du har bedt om en samlet fast pris." },
      { q: "Skal jeg vælge timepris eller fast pris?", a: "Til kendte opgaver som maling af én bestemt stue er fast pris bedst — du kender beløbet på forhånd. Til løbende reparationer eller hvor omfanget er uklart, kan timepris give mening." },
      { q: "Hvor lang garanti giver en maler?", a: "Professionelle malere giver 5 års AB-Forbruger garanti på arbejdet, hvis I aftaler det skriftligt i tilbuddet eller kontrakten." },
    ]}
  >
    <h2>1. Beslut hvad du vil have malet — og dokumentér det</h2>
    <p>
      Inden du indhenter tilbud skal du have en klar liste: hvilke rum, hvilke flader (vægge, lofter,
      paneler, døre, karme), antal lag, og om der skal spartles eller slibes først. Tag billeder af
      eksisterende skader, så maleren kan prissætte realistisk.
    </p>

    <h2>2. Indhent altid 2–3 tilbud</h2>
    <p>
      Malerpriser varierer 30–50 % afhængigt af firma, sæson og opgavetype. Indhent altid mindst 2–3
      tilbud, og bed om at de bliver brudt ned i timer, materialer og evt. stillads/afdækning, så de
      kan sammenlignes ærligt.
    </p>

    <h2>3. Tjek autorisation og forsikring</h2>
    <p>
      Maler-faget er ikke autoriseret, men en seriøs maler er medlem af <em>Danske Malermestre</em>
      eller har faglært personale. Bed om dokumentation for erhvervsansvarsforsikring — uden den hænger
      du selv på regningen, hvis møbler eller gulve skades.
    </p>

    <h2>4. Vær opmærksom på underlagets stand</h2>
    <p>
      Den største ukendte i malerprojekter er underlagets stand. Revner, fugtskader og afskalning kan
      let fordoble timeforbruget. Bed maleren se opgaven på stedet før prisen bliver fastlåst.
    </p>

    <h2>5. Vælg de rigtige produkter</h2>
    <p>
      Glansgrad (matt, æggeskal, blank), Svanemærkning, og vådslidstyrke (klasse 1–5) afgør både
      udseende og holdbarhed. Til badeværelser og køkken skal du have klasse 1–2 vådslid og fugtsikker
      maling. Bed maleren rådgive — og bekræfte produktvalg skriftligt i tilbuddet.
    </p>

    <h2>6. Stil krav til afdækning og oprydning</h2>
    <p>
      Møbler skal dækkes, gulve skal afdækkes med papir + tape, og opgaven skal afleveres støvsuget og
      ryddet. Skriv det ind i aftalen — det er en af de hyppigste klagesager.
    </p>

    <h2>7. Læs kontrakten — særligt om tillægsregning</h2>
    <p>
      Pas på formuleringer som "ekstraarbejde afregnes efter medgået tid". Aftal i stedet, at alt
      ekstraarbejde skal godkendes skriftligt af dig før det udføres. Det forhindrer ubehagelige
      overraskelser i slutregningen.
    </p>

    <h2>8. Brug BoligJob-fradraget på lønnen</h2>
    <p>
      Almindeligt vedligehold som maling indvendigt er fradragsberettiget under BoligJob-ordningen.
      Du kan trække lønnen fra (op til 11.900 kr. i 2026), men ikke materialer. Betal elektronisk for
      at få fradraget.
    </p>

    <h2>Røde flag</h2>
    <ul>
      <li>Vil kun give pris over telefonen uden at se opgaven.</li>
      <li>Insisterer på kontant betaling eller stort forskud (&gt; 25 %).</li>
      <li>Ingen skriftligt tilbud, eller tilbuddet er en ulæselig sms.</li>
      <li>Kan ikke nævne hvilke produkter de bruger.</li>
    </ul>
  </BlogArticleLayout>
);

export default ChoosePainter;