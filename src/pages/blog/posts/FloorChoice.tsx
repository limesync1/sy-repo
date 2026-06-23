import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("gulvlaegger-vinyl-laminat-eller-traegulv")!;

const FloorChoice = () => (
  <BlogArticleLayout
    post={post}
    keywords="vælg gulv, vinyl vs laminat, trægulv pris, gulvlægger pris pr m2, klikgulv"
    faq={[
      { q: "Hvad er billigst pr. m²?", a: "Laminat er typisk billigst (150–400 kr./m² for selve gulvet). Vinyl ligger på 250–600 kr./m², massivt trægulv på 600–1.500 kr./m², og fliser på 300–1.200 kr./m² + lægning." },
      { q: "Hvor meget koster det at få lagt?", a: "Gulvlægger tager typisk 175–300 kr./m² for klikgulv (laminat/vinyl) og 350–650 kr./m² for massivt trægulv. Fliser koster 600–1.200 kr./m² i lægning." },
      { q: "Hvad holder længst?", a: "Massivt trægulv holder 50–100 år og kan slibes flere gange. Laminat holder 15–25 år (kan ikke slibes). Vinyl holder 20–30 år. Fliser holder 50+ år." },
    ]}
  >
    <h2>Sammenligning på pris og egenskaber</h2>
    <p>
      Det rigtige gulv afhænger af tre ting: hvor meget slid det får, om der er risiko for vand, og
      hvad du synes om udseendet under dine fødder.
    </p>

    <h2>Laminat</h2>
    <p>
      Trækopi af træ med slidstærk overflade. Billigt, hurtigt at lægge, og findes i tusindvis af
      dekorationer. Tåler dog ikke stående vand — ikke ideelt til badeværelse og sjældent
      anbefalet i køkken med åbent layout.
    </p>

    <h2>Vinyl (LVT / SPC)</h2>
    <p>
      Den store stigning de seneste år. Vandtæt, varmt at gå på, dæmper lyd og findes nu i meget
      realistiske trælook. Perfekt til køkken, entré og badeværelse (med vådrumsgodkendelse).
      Dyrere end laminat, men mere alsidigt.
    </p>

    <h2>Massivt trægulv</h2>
    <p>
      Det "rigtige" trægulv. Kan slibes 5–10 gange og holder generationer. Patinerer smukt over
      årene, og giver en varmere og blødere fornemmelse end laminat/vinyl. Til gengæld dyrere,
      sværere at lægge og kræver mere pleje.
    </p>

    <h2>Lamelparket</h2>
    <p>
      "Halv-vejen" mellem laminat og massivt træ — en slidlag af ægte træ på krydsfinér. Kan slibes
      1–2 gange, mere stabilt end massivt træ, og kan typisk lægges direkte ovenpå gulvvarme.
    </p>

    <h2>Fliser</h2>
    <p>
      Mest holdbart og bedst med gulvvarme — men koldt at gå på, og hård lyd. Standardvalg i
      badeværelse og bryggers, mere sjældent i opholdsrum.
    </p>

    <h2>Tjekliste før du booker gulvlægger</h2>
    <ol>
      <li>Opmål rummet og tilføj 10 % spild.</li>
      <li>Tjek underlaget — er gulvet plant? Krummer kræver afretning.</li>
      <li>Beslut afslutning ved døre, paneler og overgange.</li>
      <li>Få skriftligt tilbud med materialer, lægning og oprydning.</li>
      <li>Spørg om garanti — typisk 5 år på selve lægningen.</li>
    </ol>
  </BlogArticleLayout>
);

export default FloorChoice;