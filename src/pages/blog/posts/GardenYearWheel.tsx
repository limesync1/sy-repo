import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("aarshjul-for-haveservice")!;

const GardenYearWheel = () => (
  <BlogArticleLayout
    post={post}
    keywords="haveservice årshjul, havekalender, hækklipning tidspunkt, gødning græsplæne, beskæring frugttræer"
    faq={[
      { q: "Hvor ofte skal hækken klippes?", a: "Liguster og bøgehække klippes 2 gange årligt — sankt hans (juni) og igen i sensommeren (august). Thuja og hurtigvoksende arter klippes evt. 3 gange." },
      { q: "Hvornår skal frugttræer beskæres?", a: "Æble og pære beskæres i februar–marts mens træet stadig er i hvile. Stenfrugt (kirsebær, blomme) beskæres derimod først EFTER blomstring (juli) for at undgå svampesygdomme." },
      { q: "Kan jeg få fradrag på haveservice?", a: "Ja — almindelig vedligeholdelse som græsslåning, hækklipning, lugning og beskæring er fradragsberettiget under BoligJob-ordningen." },
    ]}
  >
    <h2>Januar–februar — planlæg og beskær</h2>
    <ul>
      <li>Beskær æble- og pæretræer mens de er i hvile.</li>
      <li>Beskær sommerblomstrende roser og buske.</li>
      <li>Bestil haveservice til foråret — gode firmaer bookes op i februar.</li>
    </ul>

    <h2>Marts — opstart</h2>
    <ul>
      <li>Riv plænen for mos og fjern visne blade.</li>
      <li>Sæt læhegn og plantestøtter op.</li>
      <li>Forspiring af sommerblomster og grøntsager indendørs.</li>
    </ul>

    <h2>April — gødning og første klip</h2>
    <ul>
      <li>Første græsslåning når plænen er 7–8 cm høj.</li>
      <li>NPK-gødning til plæne og bede.</li>
      <li>Plant frilandsgrønt (kartofler, ærter, gulerødder).</li>
    </ul>

    <h2>Maj — udplantning</h2>
    <ul>
      <li>Efter isheligene (12.–15. maj) kan frostfølsomme planter ud.</li>
      <li>Klip plænen ugentligt, vand ved tørke.</li>
      <li>Luk hækken af ved fugle der yngler — vent med klipning til juni.</li>
    </ul>

    <h2>Juni — hækklipning #1</h2>
    <ul>
      <li>Liguster, bøg og avnbøg klippes omkring sankt hans.</li>
      <li>Beskær stenfrugt (kirsebær, blomme) efter blomstring.</li>
      <li>Saml jordbær og hindbær.</li>
    </ul>

    <h2>Juli–august — pleje og høst</h2>
    <ul>
      <li>Vand i tørre perioder — hellere meget én gang ugentligt end lidt hver dag.</li>
      <li>Klip plænen højere (5–6 cm) for at undgå udtørring.</li>
      <li>August: anden hækklipning + topdressing af plænen.</li>
    </ul>

    <h2>September — efterårsklargøring</h2>
    <ul>
      <li>Sidste gødning af plænen (kalium for vinterhårdførhed).</li>
      <li>Plant løg (tulipan, narcis, krokus) før første frost.</li>
      <li>Beskær sommerblomstrende stauder.</li>
    </ul>

    <h2>Oktober–november — løvfald og vintersikring</h2>
    <ul>
      <li>Riv blade af plænen ugentligt — blade der ligger kvæler græsset.</li>
      <li>Dræn vandslanger og luk udvendige vandhaner.</li>
      <li>Vintersikr følsomme planter (figen, oliven) med fiberdug eller halm.</li>
    </ul>

    <h2>December — ro</h2>
    <p>
      Ryd sneen fra hække og buske så grenene ikke knækker. Brug ikke vejsalt — det dræber græs og
      planter. Eneste haveopgave: nyd udsigten.
    </p>
  </BlogArticleLayout>
);

export default GardenYearWheel;