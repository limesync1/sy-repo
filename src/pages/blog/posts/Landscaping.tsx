import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("anlaegsgartner-terrasse-og-have")!;

const Landscaping = () => (
  <BlogArticleLayout
    post={post}
    keywords="anlægsgartner pris, ny terrasse pris, fliseterrasse, træterrasse, anlæg af have"
    faq={[
      { q: "Hvad koster en ny fliseterrasse?", a: "Typisk 1.200–2.200 kr. pr. m² inkl. flise, bærelag, opretning og lægning. Special-fliser (granit, klinker) ligger højere på 2.500–4.000 kr. pr. m²." },
      { q: "Holder en træterrasse længere end fliser?", a: "Nej. En fliseterrasse holder typisk 30–50 år, mens en standard træterrasse i trykimprægneret fyr holder 12–20 år. Hårdttræ som ipe eller cumaru holder længere (25–40 år)." },
      { q: "Skal jeg have byggetilladelse til terrasse?", a: "Generelt nej — terrasser under 30 cm høje uden tag er fritaget. Hævede terrasser, overdækninger og pergolaer kan kræve tilladelse. Tjek altid med kommunen." },
    ]}
  >
    <h2>1. Begynd med funktionen, ikke æstetikken</h2>
    <p>
      Skal terrassen bruges til solnedgang, til grill, til leg eller til alle dele? Antal personer
      ved bordet (typisk 1,2 m² pr. person) afgør størrelsen. Skygge fra hus og træer afgør
      placeringen.
    </p>

    <h2>2. Fliser, træ eller komposit?</h2>
    <ul>
      <li><strong>Beton-/granitfliser:</strong> Lang levetid, lav vedligehold, ensartet udseende.</li>
      <li><strong>Trykimprægneret fyr:</strong> Billigt, varmt at gå på, kræver olie hvert 2.–3. år.</li>
      <li><strong>Hårdttræ (ipe, cumaru):</strong> Smukt, holder 30+ år, men dyrt og tungt at lægge.</li>
      <li><strong>Komposit:</strong> Vedligeholdsfrit, ensartet, men kan blive varmt i sol og virker mindre "ægte".</li>
    </ul>

    <h2>3. Realistiske priser for hele haven (2026)</h2>
    <ul>
      <li>Fliseterrasse (30 m²): 35.000–65.000 kr.</li>
      <li>Træterrasse (30 m²): 28.000–50.000 kr.</li>
      <li>Anlæg af bede med planter (10 m²): 7.000–18.000 kr.</li>
      <li>Hækplantning (10 lbm liguster): 2.500–4.500 kr. inkl. jord og plantning.</li>
      <li>Drænarbejde i lerjord: 500–900 kr./lbm.</li>
    </ul>

    <h2>4. Process — fra første møde til færdig have</h2>
    <ol>
      <li>Indledende besøg + opmåling (gratis).</li>
      <li>Skitseforslag og tilbud — gerne 2–3 firmaer.</li>
      <li>Detailplan med plantevalg, fliser, drænløsning og tidsplan.</li>
      <li>Anlægsperiode — typisk 1–3 uger for almindelig parcelhushave.</li>
      <li>Aflevering med plejevejledning og opfølgende besøg efter 1 år.</li>
    </ol>

    <h2>5. Faldgruber</h2>
    <ul>
      <li>For lidt fald (terrassen skal hælde ~2 % væk fra huset).</li>
      <li>For tyndt bærelag — flisen sætter sig efter første frost.</li>
      <li>Planter der vokser sig for store i forhold til bedet.</li>
      <li>Manglende dræn i lerjord — leder til våde sokler og fugtskader.</li>
    </ul>
  </BlogArticleLayout>
);

export default Landscaping;