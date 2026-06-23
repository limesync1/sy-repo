import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("rotter-i-haven-hvad-goer-jeg")!;

const RatsInGarden = () => (
  <BlogArticleLayout
    post={post}
    keywords="rotter haven, rotter anmeldelse, skadedyrsbekæmpelse pris, rotter symptomer, rotter forebyggelse"
    faq={[
      { q: "Skal jeg anmelde rotter?", a: "Ja — du har anmeldelsespligt til kommunen. Anmeldelse er gratis og bekæmpelse udført af kommunen er også gratis. Brug kommunens hjemmeside eller selvbetjeningen på borger.dk." },
      { q: "Hvad koster en privat skadedyrsbekæmper?", a: "Akutbesøg fra privat firma koster typisk 1.500–3.500 kr. Mange husforsikringer dækker bekæmpelse — tjek din police inden du bestiller." },
      { q: "Hvad tiltrækker rotter?", a: "Fuglefoder på jorden, kompost med madrester, åbne skraldespande, fodervand til kæledyr, og kloakproblemer. Fjern fødekilden, og populationen falder hurtigt." },
    ]}
  >
    <h2>1. Symptomer — er det faktisk rotter?</h2>
    <ul>
      <li>Sorte, aflange ekskrementer (15–20 mm) — typisk i klynger.</li>
      <li>Gnavspor på træ, plastik og elkabler.</li>
      <li>Lugt af ammoniak omkring redepladser.</li>
      <li>Hul i jorden 5–10 cm i diameter, ofte langs hegn eller fundament.</li>
      <li>Stier i græsset hvor de bevæger sig fast.</li>
    </ul>

    <h2>2. Anmeld til kommunen — i dag</h2>
    <p>
      Du <em>skal</em> anmelde rotter — det er din pligt som ejer eller lejer. Gå ind på din
      kommunes hjemmeside eller borger.dk. Kommunen sender autoriseret bekæmper inden for få dage,
      og det er gratis.
    </p>

    <h2>3. Fjern fødekilden</h2>
    <p>
      Bekæmpelse virker kun, hvis maden er væk. Fjern fuglefoder fra jorden (brug kun foderhuse
      hængt op &gt; 1 m over jord), luk komposten med rottesikret låg, ryd op under terrassen, og
      sørg for at skraldespande er lukket.
    </p>

    <h2>4. Tjek for kloakproblemer</h2>
    <p>
      Rotter kommer ofte op gennem defekte kloakrør. Hvis du gentagne gange har rotter eller har
      ældre kloak (&gt; 30 år), bør du få en kloakkamera-undersøgelse. Defekte stik kan typisk
      udbedres for 8.000–25.000 kr. — og er ofte dækket af husforsikringen.
    </p>

    <h2>5. Forebyggelse</h2>
    <ul>
      <li>Vandlås på kloak (rottespærre) i nyere huse — overvej eftermontering.</li>
      <li>Hold græsset kort og buske trimmet — rotter elsker dækning.</li>
      <li>Bræddesæt om bunden af kompost og brændestabel.</li>
      <li>Lap revner i fundament og sokkel — selv små huller giver adgang.</li>
    </ul>

    <h2>6. Hvornår skal du hyre privat firma?</h2>
    <p>
      Hvis kommunens bekæmper ikke har løst problemet inden for 2–3 besøg, eller hvis du har akut
      behov uden for åbningstid, kan privat firma være vejen frem. Tjek forsikringen først.
    </p>
  </BlogArticleLayout>
);

export default RatsInGarden;