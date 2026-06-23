import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("vinduespudser-eller-selv")!;

const WindowCleanerOrDIY = () => (
  <BlogArticleLayout
    post={post}
    keywords="vinduespudser pris, vinduespudsning pris pr vindue, vinduespudser abonnement, gør det selv vinduespudsning"
    faq={[
      { q: "Hvad koster en vinduespudser pr. vindue?", a: "Typisk 18–35 kr. pr. vindue inkl. moms ved fast abonnement, og 40–60 kr. pr. vindue ved engangsbesøg. Højhuse og svært tilgængelige vinduer koster mere." },
      { q: "Hvor ofte bør vinduerne pudses?", a: "I byen typisk hver 4.–6. uge, på landet eller i forstæder hver 8.–12. uge. Vinduer mod trafikerede veje bliver hurtigere snavsede end mod baghaven." },
      { q: "Er vinduespudsning fradragsberettiget?", a: "Ja — udvendig og indvendig vinduespudsning er omfattet af BoligJob-ordningen, så længe arbejdet er udført af en momsregistreret virksomhed og betalt elektronisk." },
    ]}
  >
    <h2>Hvad koster det egentlig?</h2>
    <p>
      Et typisk parcelhus med 20 vinduer betaler 400–700 kr. pr. besøg ved fast abonnement (hver
      6. uge). Det svarer til ca. 3.500–5.000 kr. om året. En lejlighed med 6–8 vinduer ligger på
      150–250 kr. pr. besøg.
    </p>

    <h2>Selvgør-prisen</h2>
    <ul>
      <li>God vinduesvasker + gummiskraber: 250 kr. (engangsudgift).</li>
      <li>Stige eller teleskopstang: 400–1.200 kr.</li>
      <li>Vinduespudsemiddel pr. år: ~150 kr.</li>
      <li>Tidsforbrug: 2–4 timer pr. omgang for et hus med 20 vinduer.</li>
    </ul>

    <h2>Hvornår betaler det sig at få professionelt pudset?</h2>
    <p>
      Hvis din tid er værd mere end 150 kr./time, eller hvis du har høje vinduer der kræver stige,
      betaler det sig næsten altid at få det udført professionelt. Tilføj at en professionel
      vinduespudser bruger osmosevand og specialudstyr — resultatet er stribefrit og holder længere.
    </p>

    <h2>Tjekliste til engangstilbud</h2>
    <ul>
      <li>Antal vinduer (vinduesfag — ikke ruder).</li>
      <li>Inde + ude, eller kun ude?</li>
      <li>Karme og rammer med?</li>
      <li>Skal myggenet/vinduessprosser pudses særskilt?</li>
      <li>Adgangsforhold — havemøbler/buske der skal flyttes?</li>
    </ul>

    <h2>Tip: Fast abonnement er billigere</h2>
    <p>
      Et fast abonnement (typisk hver 6.–8. uge) er ofte 30–40 % billigere pr. vindue end engangsbesøg,
      fordi pudseren har en fast rute. Bind dig ikke længere end 12 måneder, og sørg for at
      opsigelsesvarslet er max 1 måned.
    </p>
  </BlogArticleLayout>
);

export default WindowCleanerOrDIY;