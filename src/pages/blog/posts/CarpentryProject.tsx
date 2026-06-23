import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("tomrerprojekt-hjemme-trin-for-trin")!;

const CarpentryProject = () => (
  <BlogArticleLayout
    post={post}
    keywords="tømrer projekt, tømrer pris, byggetilladelse, tilbygning tømrer, ab forbruger kontrakt"
    faq={[
      { q: "Hvad koster en tømrer i timen?", a: "Faglært tømrer koster typisk 525–675 kr. pr. time inkl. moms i 2026. Akkordpriser bruges ofte på større opgaver." },
      { q: "Hvornår skal jeg have byggetilladelse?", a: "Til tilbygninger, nye boligenheder og ændringer af bærende konstruktioner. Mindre carporte (under 50 m²) og udhuse (under 35 m²) er typisk fritaget, men skal stadig anmeldes. Tjek altid kommunens hjemmeside." },
      { q: "Hvad er AB-Forbruger?", a: "AB-Forbruger er standardvilkår mellem håndværker og forbruger. Det giver bl.a. 5 års garanti, 1- og 5-års gennemgang og klare regler for tilbud, betaling og forsinkelse. Aftal altid at AB-Forbruger gælder på større opgaver." },
    ]}
  >
    <h2>Trin 1 — definér projektet</h2>
    <p>
      Skriv ned: hvad skal laves, hvilke mål (m², antal), hvilke materialer du foretrækker, og hvilken
      kvalitet (standard, mellem, høj). Lav skitser eller find inspirationsbilleder. Jo skarpere
      brief, jo skarpere tilbud.
    </p>

    <h2>Trin 2 — afklar tilladelser</h2>
    <p>
      Ring til kommunens byggesagsafdeling eller brug Bygnings- og Boligregistret (BBR). Tilbygninger,
      ny anvendelse (fx beboelse på loft), nye bærende vægge og ændringer af facaden kræver typisk
      tilladelse — sagsbehandlingstid 6–12 uger.
    </p>

    <h2>Trin 3 — indhent 2–3 tilbud</h2>
    <p>
      Send samme detaljerede beskrivelse til 2–3 tømrere. Bed om opdelt tilbud:
      arbejdsløn, materialer, ekstrabyggepladsudgifter (container, stillads, strøm), og en tidsplan.
      Ved store opgaver: bed om referencer fra lignende projekter.
    </p>

    <h2>Trin 4 — kontrakt</h2>
    <ul>
      <li>Skriv opgavebeskrivelse + tegninger ind som bilag.</li>
      <li>Betalingsplan i rater (fx 25 % opstart, 50 % efter halvvejs-syn, 25 % efter aflevering).</li>
      <li>Dagbod ved forsinkelse uden gyldig grund.</li>
      <li>Henvisning til AB-Forbruger.</li>
      <li>Forsikringer (entreprise og ansvar).</li>
    </ul>

    <h2>Trin 5 — byggemøder under arbejdet</h2>
    <p>
      Aftal ugentlige korte byggemøder (15 min) hvor I gennemgår fremdrift, ændringsønsker og
      eventuelle uforudsete forhold. Alt aftalt skriftligt — sms eller mail tæller.
    </p>

    <h2>Trin 6 — afleveringsforretning</h2>
    <p>
      Når opgaven er færdig holdes en afleveringsforretning: I går rundt sammen og noterer
      eventuelle fejl/mangler i en mangelliste. Tømreren får en frist (typisk 14 dage) til at
      udbedre dem. Sidste rate udbetales først, når mangelliste er afsluttet.
    </p>

    <h2>Trin 7 — 1- og 5-års gennemgang</h2>
    <p>
      Ved AB-Forbruger har du ret til en 1-års og 5-års gennemgang. Brug den! Ofte dukker små
      sætningsskader, fugespringere eller utætheder først op efter et år.
    </p>

    <h2>Røde flag</h2>
    <ul>
      <li>Vil have hele beløbet forud eller stort forskud (&gt; 30 %).</li>
      <li>Ingen skriftligt tilbud, eller tilbud uden materialeliste.</li>
      <li>Kan ikke fremvise CVR + erhvervsansvarsforsikring.</li>
      <li>Insisterer på "sort" arbejde — du mister både garanti og forsikringsdækning.</li>
    </ul>
  </BlogArticleLayout>
);

export default CarpentryProject;