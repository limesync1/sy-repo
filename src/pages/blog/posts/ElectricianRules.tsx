import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("hvornaar-skal-du-have-autoriseret-elektriker")!;

const ElectricianRules = () => (
  <BlogArticleLayout
    post={post}
    keywords="autoriseret elektriker, gør det selv el, el-arbejde regler, elektriker pris, sikkerhedsstyrelsen"
    faq={[
      { q: "Hvad må jeg selv lave af el-arbejde?", a: "I 2026 må du selv skifte stikkontakter og afbrydere på samme sted, montere lamper med kabel og stik, samt tilslutte hvidevarer med stik. Alt andet kræver autoriseret elektriker." },
      { q: "Hvad koster en elektriker i timen?", a: "Typisk 550–750 kr. pr. time inkl. moms. Akut udkald aften/weekend ligger på 900–1.500 kr./time + udkaldsgebyr." },
      { q: "Hvad sker der hvis jeg laver ulovligt el-arbejde?", a: "Du risikerer bøde, og hvis der opstår brand- eller personskade kan forsikringen afvise dækning. Ved salg af boligen skal ulovligt arbejde lovliggøres af elektriker." },
    ]}
  >
    <h2>Hvad du SELV må lave (2026)</h2>
    <ul>
      <li>Skifte stikkontakter og afbrydere — på samme sted, samme type, hvis den er afbrudt på gruppen.</li>
      <li>Montere lamper med fast tilslutning, så længe du bruger almindelig lampetilslutning (DCL-stik).</li>
      <li>Tilslutte hvidevarer med stik.</li>
      <li>Skifte sikringer (men ikke ændre på gruppen eller HPFI).</li>
    </ul>

    <h2>Hvad der KRÆVER autoriseret elektriker</h2>
    <ul>
      <li>Trække nye kabler i væg, loft eller gulv.</li>
      <li>Etablere nye stik, afbrydere eller lampeudtag.</li>
      <li>Ændre på el-tavlen — nye grupper, HPFI, sikringer.</li>
      <li>El i badeværelser (zone 0–2).</li>
      <li>El til udestue, garage, skur eller udendørs belysning fastmonteret.</li>
      <li>Solceller, ladestander til elbil og varmepumper.</li>
    </ul>

    <h2>Sådan tjekker du, at en elektriker er autoriseret</h2>
    <p>
      Slå firmaet op på <em>el-sikker.dk</em> eller hos Sikkerhedsstyrelsen. Autorisationen er
      personlig — det er ikke nok at firmaet ”bruger en autoriseret”. Bed om autorisationsnummer
      skriftligt i tilbuddet.
    </p>

    <h2>Sikkerhedstjekliste til boligen</h2>
    <ol>
      <li>HPFI-relæ skal testes 2 gange om året (tryk på testknap — det skal slå fra).</li>
      <li>Ingen gamle skrubrune Bakelit-afbrydere — de er ofte fra før 1950 og kan være farlige.</li>
      <li>Brune mærker eller lugt af brændt plast omkring stikkontakter = ring til elektriker straks.</li>
      <li>Forlængerledninger må kun bruges midlertidigt — aldrig i serie ("daisy-chain").</li>
    </ol>

    <h2>Hvornår er det akut?</h2>
    <p>
      Ring akut, hvis HPFI gentagne gange slår fra, hvis du lugter brændt plast, hvis stikkontakter
      er varme at røre ved, eller hvis du får stød fra en hvidevare. Sluk for gruppen og vent på
      elektrikeren — brug ikke installationen.
    </p>

    <h2>BoligJob og el-arbejde</h2>
    <p>
      Almindeligt el-vedligehold (skift af afbrydere, lampeudtag, mindre reparationer) er
      fradragsberettiget. Nybyg, om- og tilbygninger er ikke. Spørg elektrikeren om opgaven kan
      faktureres som fradragsberettiget vedligehold.
    </p>
  </BlogArticleLayout>
);

export default ElectricianRules;