import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("boligjob-fradrag-2026")!;

const BoligJobGuide = () => (
  <BlogArticleLayout
    post={post}
    keywords="boligjob fradrag 2026, servicefradrag 2026, håndværkerfradrag, rengøring fradrag, fradrag arbejdsløn, skat boligjob"
    faq={[
      { q: "Hvor meget kan jeg trække fra i 2026?", a: "Op til 11.900 kr. på serviceydelser (rengøring, havearbejde, vinduespudsning) og op til 17.500 kr. på håndværkerydelser pr. person over 18 år i husstanden." },
      { q: "Hvad er kravet til betaling?", a: "Beløbet skal være betalt elektronisk — MobilePay, bankoverførsel, betalingskort. Kontant betaling giver ikke ret til fradrag." },
      { q: "Hvornår skal jeg indberette fradraget?", a: "Indberet i din TastSelv på skat.dk under 'BoligJob-ordningen' — senest 1. maj året efter du har fået arbejdet udført." },
    ]}
  >
    <h2>Hvad er BoligJob-ordningen?</h2>
    <p>
      BoligJob-ordningen er et skattefradrag, der gør det billigere at få hjælp til praktiske
      opgaver i hjemmet. Du får fradrag for <strong>arbejdsløn</strong> (ikke materialer) når en
      virksomhed har udført arbejdet, og du har betalt elektronisk.
    </p>

    <h2>Beløbsgrænser i 2026</h2>
    <div className="not-prose my-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Maks. pr. person</th>
            <th className="px-4 py-3 font-semibold">Skatteværdi (ca.)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr><td className="px-4 py-3">Serviceydelser</td><td className="px-4 py-3">11.900 kr.</td><td className="px-4 py-3">~3.250 kr.</td></tr>
          <tr><td className="px-4 py-3">Håndværkerydelser (grønne)</td><td className="px-4 py-3">17.500 kr.</td><td className="px-4 py-3">~4.800 kr.</td></tr>
        </tbody>
      </table>
      <p className="bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        Grænserne gælder pr. person over 18 år i husstanden. Et par kan altså trække dobbelt så meget fra.
      </p>
    </div>

    <h2>Hvad er omfattet — serviceydelser</h2>
    <ul>
      <li>Rengøring (privat hjem, vinduespudsning).</li>
      <li>Havearbejde (græsslåning, hækklipning, snerydning).</li>
      <li>Børnepasning i hjemmet.</li>
      <li>Almindeligt vedligehold (ikke renovering).</li>
    </ul>

    <h2>Hvad er omfattet — håndværkerydelser</h2>
    <ul>
      <li>Energibesparende renoveringer (isolering, vinduer, varmepumpe).</li>
      <li>Klimasikring (omfangsdræn, tagrender).</li>
      <li>Installation af ladestander, solceller, energistyring.</li>
      <li>Tilslutning til bredbånd og fibernet.</li>
    </ul>

    <h2>Krav for at få fradraget</h2>
    <ol>
      <li><strong>Elektronisk betaling</strong> — MobilePay, bankoverførsel eller kort. Kontant gælder ikke.</li>
      <li><strong>Faktura med CVR</strong> — virksomheden skal være momsregistreret.</li>
      <li><strong>Arbejdsløn skal fremgå særskilt</strong> — materialer kan ikke trækkes fra.</li>
      <li><strong>Arbejdet udført på din bopæl eller fritidsbolig</strong> i Danmark eller EU/EØS.</li>
      <li><strong>Du skal være fyldt 18 år</strong> ved årets udgang.</li>
    </ol>

    <h2>Sådan indberetter du</h2>
    <p>
      Gå til <em>skat.dk → TastSelv → Ret årsopgørelsen → BoligJob-ordningen</em>. Indtast CVR,
      beløb og dato. Gem fakturaen i 5 år — Skat kan bede om dokumentation.
    </p>

    <h2>Eksempler</h2>
    <p>
      <strong>Familie med rengøring:</strong> 1.500 kr. pr. måned i arbejdsløn = 18.000 kr./år.
      To voksne kan tilsammen trække 23.800 kr. fra (2 × 11.900). Hele beløbet er fradragsberettiget.
      Skatteværdi: ~6.500 kr.
    </p>
    <p>
      <strong>Par der får sat varmepumpe op:</strong> Arbejdsløn 22.000 kr. To voksne kan tilsammen
      trække 35.000 kr. fra (2 × 17.500). Hele beløbet er fradragsberettiget. Skatteværdi: ~6.000 kr.
    </p>

    <h2>Typiske fejl der koster fradraget</h2>
    <ul>
      <li>Betalt kontant — selv én gang underkender hele beløbet.</li>
      <li>Faktura mangler CVR eller specifikation af arbejdsløn.</li>
      <li>Indberettet for sent (efter 1. maj året efter).</li>
      <li>Arbejdet udført på en bolig du ikke selv bor i.</li>
    </ul>
  </BlogArticleLayout>
);

export default BoligJobGuide;