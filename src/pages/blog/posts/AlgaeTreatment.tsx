import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("algebehandling-tag-og-facade")!;

const AlgaeTreatment = () => (
  <BlogArticleLayout
    post={post}
    keywords="algebehandling tag, algebehandling pris, softwash facade, tag rensning, algedræber"
    faq={[
      { q: "Hvad koster algebehandling af tag?", a: "Typisk 35–60 kr. pr. m² for softwash + algedræber. Et standard parcelhustag (120 m²) koster derfor 4.500–7.500 kr. Højtryksrensning er billigere (25–40 kr./m²) men slider mere på taget." },
      { q: "Hvor længe holder en algebehandling?", a: "En grundig softwash + langtidsvirkende algedræber holder typisk 3–5 år. Højtryksrensning uden efterbehandling holder kun 1–2 år." },
      { q: "Kan jeg selv algebehandle taget?", a: "Du kan købe algedræber i byggemarkedet og sprøjte ned fra jorden — men resultatet er ofte ujævnt, og adgang til taget kræver lift eller stillads. Til store flader er det sjældent en god DIY-opgave." },
    ]}
  >
    <h2>Hvornår skal taget algebehandles?</h2>
    <p>
      Hvis du kan se grønne eller sorte misfarvninger på tagsten, eternit eller fibercement, er det
      tid. Alger og mos holder fugt mod taget — over tid fører det til frostsprængninger og kortere
      levetid på tagstenene.
    </p>

    <h2>Softwash vs. højtryksrensning</h2>
    <ul>
      <li><strong>Softwash:</strong> Lavt tryk + biologisk algedræber. Skånsom mod taget, langtidsvirkende, dyrere.</li>
      <li><strong>Højtryksrensning:</strong> Effektivt visuelt resultat med det samme — men slider på overfladen, og algerne kommer hurtigt igen, hvis ikke der efterbehandles.</li>
    </ul>
    <p>
      Til <em>tegl</em> og <em>betontagsten</em> anbefales typisk softwash. Til <em>eternit</em> bør
      du være ekstra varsom — fibrene kan blive frigjort, og taget skal vurderes inden behandling.
    </p>

    <h2>Process for en typisk behandling</h2>
    <ol>
      <li>Forundersøgelse — er tagstenene intakte? Skal evt. defekte sten skiftes først?</li>
      <li>Afdækning af tagrender, planter og terrasse.</li>
      <li>Påføring af biologisk algedræber.</li>
      <li>Skånsom afrensning (softwash) eller passiv "self-clean" over 6–12 måneder.</li>
      <li>Imprægnering (valgfrit, øger levetiden).</li>
    </ol>

    <h2>Faldgruber</h2>
    <ul>
      <li>Højtryksrensning på gammelt eternit — kan frigøre sundhedsskadelige fibre.</li>
      <li>"For-godt-til-at-være-sandt" priser uden softwash — typisk bare højtryk uden efterbehandling.</li>
      <li>Behandling i lave temperaturer (&lt; 5 °C) — produktet virker dårligt.</li>
    </ul>

    <h2>Algebehandling af facade</h2>
    <p>
      Murede og pudsede facader algebehandles på samme måde som taget. Pas dog på, at vand ikke
      trænger ind ved vinduer og fuger — facaden skal være intakt, før behandling giver mening.
      Pris for typisk facade: 30–55 kr./m².
    </p>
  </BlogArticleLayout>
);

export default AlgaeTreatment;