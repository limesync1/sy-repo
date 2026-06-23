import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("vvs-akut-foer-installatoeren-kommer")!;

const VvsAkut = () => (
  <BlogArticleLayout
    post={post}
    keywords="vvs akut, sprunget vandrør, tilstoppet afløb, stoppet toilet, vvs hjælp"
    faq={[
      { q: "Hvor er hovedhanen typisk?", a: "I lejligheder findes hovedhanen ofte i køkkenet eller i et teknikskab i entreen. I huse er den oftest ved vandmåleren — i kælder, bryggers eller et målerskab udvendigt." },
      { q: "Hvad koster en akut VVS-udrykning?", a: "Akut udkald uden for normal arbejdstid koster typisk 1.500–3.000 kr. i udkald + materialer og timepris. Inden for normal arbejdstid er det billigere — typisk 600–900 kr./time." },
      { q: "Dækker forsikringen vandskader?", a: "Pludselige skader (sprunget rør) er normalt dækket af husforsikringen. Skader fra langsomme utætheder eller dårlig vedligeholdelse er typisk IKKE dækket — derfor er det vigtigt at få stoppet skaden hurtigt." },
    ]}
  >
    <h2>1. Sluk for vandet med det samme</h2>
    <p>
      Det allervigtigste: find hovedhanen og luk for vandet. Jo længere vandet fosser, jo større
      bliver skaden — og din selvrisiko. Hvis du ikke kan finde hovedhanen, så luk for den enkelte
      ventil under vasken eller bag toilettet.
    </p>

    <h2>2. Sluk for strømmen i berørte rum</h2>
    <p>
      Hvis vand er løbet i nærheden af stikkontakter, lamper eller hvidevarer: sluk gruppen på
      el-tavlen. Vand + strøm = livsfarligt.
    </p>

    <h2>3. Begræns skaden med håndklæder og spande</h2>
    <p>
      Brug håndklæder, klude og spande til at suge vand op. Flyt møbler, tæpper og elektronik væk fra
      det våde område. Tag billeder af alt — du får brug for dem til forsikringen.
    </p>

    <h2>4. Ring til VVS — og din forsikring</h2>
    <p>
      Ring først til en autoriseret VVS-installatør (kræves ved alle indgreb på drikkevandsinstallationer).
      Anmeld dernæst skaden til forsikringen — gerne mens VVS'eren er på vej, så du har en sagsnummer
      klar.
    </p>

    <h2>Tilstoppet afløb — prøv dette først</h2>
    <ol>
      <li>Kogende vand + opvaskemiddel (køkkenvask, fedt-tilstopninger).</li>
      <li>Svupper i 30 sekunder — dæk overløb til med våd klud.</li>
      <li>Skru vandlås under vasken af og tøm den (sæt spand under).</li>
      <li>Brug aldrig stærke afløbsrensemidler (Plumbo o.l.) hvis du har gamle galvaniserede rør — det kan æde dem op.</li>
    </ol>

    <h2>Stoppet toilet</h2>
    <p>
      Brug en svupper — ikke afløbsrenser, det kan ødelægge keramikken. Hvis svupperen ikke virker
      efter 5 minutter, så ring til VVS. Forsøg <em>ikke</em> at skylle gentagne gange — toilettet
      kan flyde over.
    </p>

    <h2>Hvad du IKKE skal gøre</h2>
    <ul>
      <li>Forsøg ikke at lodde eller fikse rør selv — kun autoriserede må arbejde på vandinstallationen.</li>
      <li>Tør ikke vandet væk og glem skaden — fugt i vægge kan give skimmelsvamp inden for 2–4 uger.</li>
      <li>Skift ikke til billig akut-VVS uden CVR — du har ingen garanti, og forsikringen dækker måske ikke arbejdet.</li>
    </ul>
  </BlogArticleLayout>
);

export default VvsAkut;