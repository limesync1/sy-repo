import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("tjekliste-til-flyttedag")!;

const MovingDayChecklist = () => (
  <BlogArticleLayout
    post={post}
    keywords="flytning tjekliste, flyttedag tips, flytteforberedelse, adresseflyt, opsigelse el vand internet, flytteguide danmark"
    faq={[
      { q: "Hvornår skal jeg melde adresseflyt?", a: "Senest 5 dage efter du er flyttet. Gør det digitalt på borger.dk — så bliver dine oplysninger automatisk opdateret hos myndighederne." },
      { q: "Hvad skal jeg gøre med el, vand og varme?", a: "Aflæs målere selv på flyttedagen og send tallene til både den gamle og nye leverandør samme dag. Tag billeder af målerstanden som dokumentation." },
      { q: "Skal jeg være hjemme under hele flytningen?", a: "Ja, både ved af- og pålæsning. Du skal kunne vise hvor ting skal stå, godkende eventuelle skader, og underskrive transportdokument ved afslutning." },
    ]}
  >
    <h2>8 uger før: planlæg og book</h2>
    <ul>
      <li>Bestil flyttefirma — sammenlign 3 tilbud, særligt vigtigt ved overgangsdatoer (1. og 15.) i sommermånederne.</li>
      <li>Sig op: lejebolig, internet, alarm, abonnementer du kun bruger lokalt (fitness, parkering).</li>
      <li>Bestil opbevaring hvis du har overlap.</li>
      <li>Bestil parkeringstilladelse eller -reservation på begge adresser (kommunens hjemmeside).</li>
    </ul>

    <h2>4 uger før: pak og frasortér</h2>
    <ul>
      <li>Start med ting du sjældent bruger: bøger, sæsontøj, pynt, gæsteværelse.</li>
      <li>Sælg/giv væk det du ikke vil have med — DBA, loppemarkeder, genbrug.</li>
      <li>Bestil flyttekasser. Tommelfingerregel: ca. 1 kasse pr. m² bolig.</li>
      <li>Bestil postomadressering på <em>borger.dk</em>.</li>
      <li>Skift forsikringer: indbo- og husejerforsikring til den nye adresse.</li>
    </ul>

    <h2>1 uge før: praktiske detaljer</h2>
    <ul>
      <li>Aflæs målere — tag billeder af både el-, vand- og varmemåler.</li>
      <li>Tøm køle/fryser. Optø 24 timer før.</li>
      <li>Saml en "førstedagskasse": kaffe, kop, toiletpapir, opladere, lommelygte, værktøjssæt, sengetøj, håndklæder.</li>
      <li>Marker kasser med rum (køkken, soveværelse, bad) — ikke kun indhold. Det gør udpakning meget hurtigere.</li>
      <li>Bekræft tid og mødested med flyttefirmaet.</li>
    </ul>

    <h2>Selve flyttedagen</h2>
    <ol>
      <li>Vær på adressen 30 min. før flyttefolkene.</li>
      <li>Vis rundt — hvad skal med, hvad skal blive.</li>
      <li>Aflæs målere igen, send til ny og gammel leverandør samme dag.</li>
      <li>Gå sidste runde: skuffer, skabe, kælderrum, loft — tjek de er tomme.</li>
      <li>Tag billeder af tomt rum (dokumentation til udlejer).</li>
      <li>Aflever nøgler ifølge aftalen.</li>
      <li>På den nye adresse: tjek målerstand og noter den.</li>
      <li>Inden flyttefolkene kører: tjek for skader, underskriv transportdokument.</li>
    </ol>

    <h2>Den første uge</h2>
    <ul>
      <li>Meld flytning på <em>borger.dk</em> (senest 5 dage efter).</li>
      <li>Tjek at posten kommer korrekt. Følg op på omadressering.</li>
      <li>Lær naboer, affaldssortering og parkering at kende.</li>
      <li>Test alle el-installationer, vandhaner og varme.</li>
      <li>Find lokal læge og evt. tandlæge — flyt journal.</li>
      <li>Opdater adresse: bank, arbejde, abonnementer, online-konti.</li>
    </ul>

    <h2>Hvad mange glemmer</h2>
    <ul>
      <li>Returnere router og TV-boks til den gamle internetudbyder.</li>
      <li>Skifte forsikringsselskab i tide — der er sjældent automatisk overflytning.</li>
      <li>Tjekke om hårde hvidevarer skal afmonteres af autoriseret fagmand (vaske/opvaskemaskine).</li>
      <li>Bookning af tid hos varmemester ved tilbagelevering af lejlighed.</li>
    </ul>
  </BlogArticleLayout>
);

export default MovingDayChecklist;