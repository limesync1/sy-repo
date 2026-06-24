import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const AlgaeTreatment = defineBlogPost({
  slug: "algebehandling-tag-og-facade",
  keywords:
    "algebehandling tag, algebehandling pris, softwash facade, tag rensning, algedræber, eternittag",
  faq: [
    { q: "Hvad koster algebehandling af tag i 2026?", a: "Typisk 35–60 kr. pr. m² for softwash + algedræber. Et standard parcelhustag (120 m²) koster 4.500–7.500 kr. Højtryksrensning er billigere (25–40 kr./m²) men slider mere på taget." },
    { q: "Hvor længe holder en algebehandling?", a: "Softwash + langtidsvirkende algedræber holder typisk 3–5 år. Højtryksrensning uden efterbehandling holder kun 1–2 år, da algerne kommer hurtigt tilbage." },
    { q: "Kan jeg selv algebehandle taget?", a: "Du kan købe algedræber i byggemarkedet og sprøjte ned fra jorden — men resultatet er ofte ujævnt, og adgang til taget kræver lift eller stillads. Til store flader er det sjældent en god DIY-opgave." },
    { q: "Er algebehandling fradragsberettiget?", a: "Ja — arbejdslønnen er omfattet af BoligJob-ordningen, så længe firmaet er momsregistreret og du betaler elektronisk. Algedræber-produktet er ikke fradragsberettiget." },
    { q: "Må jeg algebehandle uden tilladelse?", a: "Til private boliger kræves ingen tilladelse. Men brug godkendte produkter (P-mærket) og afdæk regnvandsafløb, så algedræberen ikke skader vandløb." },
    { q: "Hvornår på året skal det laves?", a: "April–oktober ved temperaturer over 5 °C og uden frost natten efter. Forår eller tidligt efterår giver bedst effekt." },
    { q: "Skader algebehandling planterne i bedet under taget?", a: "Med korrekt afdækning og biologiske produkter er risikoen lille. Spuler du med højtryk uden afdækning, kan klorholdige rester skade prydplanter." },
  ],
  sections: [
    {
      paragraphs: [
        "Grønne og sorte striber på taget er ikke bare et æstetisk problem — alger og mos holder fugt mod tagstenene, og over tid giver det frostsprængninger og kortere levetid. Her er hvad det koster, hvilken metode du skal vælge, og hvornår du skal slå til.",
      ],
    },
    {
      heading: "Hvornår skal taget algebehandles?",
      list: [
        "Synlige grønne/sorte striber, især på nord- og østvendte flader",
        "Mos i bunden af tagstenene eller mellem fugerne",
        "Tagrender med jord/grus fra nedbrudt mos",
        "Tagstenene har mistet glans og virker matte",
        "Sidste behandling er mere end 4–5 år gammel",
      ],
    },
    {
      heading: "Pris pr. m² (2026)",
      list: [
        "Softwash + algedræber: 35–60 kr./m²",
        "Højtryksrensning (uden efterbehandling): 25–40 kr./m²",
        "Imprægnering oveni: +25–45 kr./m²",
        "Tagrenderens som tillæg: 30–60 kr./lbm",
        "Stillads ved kompliceret tag: 3.000–12.000 kr.",
        "Facadebehandling: 30–55 kr./m²",
      ],
      paragraphs: [
        "Et standard parcelhustag på 120 m² koster typisk 4.500–7.500 kr. for softwash. Tilføj imprægnering, og du lander på 7.500–13.000 kr. — men forventet levetid stiger fra 3–5 år til 6–10 år. ",
      ],
      body: (
        <p>
          Se også <Link to="/blog/algebehandling-pris-pr-m2-2026">algebehandling pris pr. m² 2026</Link>,{" "}
          <Link to="/blog/algebehandling-hvor-ofte">algebehandling — hvor ofte</Link> og{" "}
          <Link to="/blog/hvad-koster-tagrensning-2026">tagrensning pris 2026</Link>.
        </p>
      ),
    },
    {
      heading: "Softwash vs. højtryksrensning",
      list: [
        "Softwash: Lavt tryk + biologisk algedræber. Skånsom, langtidsvirkende, lidt dyrere",
        "Højtryksrensning: Hurtig synlig effekt, men slider på overfladen og kræver efterbehandling",
        "Tegl/betontagsten: Softwash er førstevalg",
        "Eternit/fibercement: KUN softwash — højtryk kan frigive farlige fibre",
        "Stål-/aluminiumstag: Skånsom afvask med blødt vand og specialprodukt",
      ],
    },
    {
      heading: "Trin for trin: en typisk behandling",
      ordered: [
        "Forundersøgelse — er tagstenene intakte? Skal defekte sten skiftes først?",
        "Afdækning af tagrender, regnvandsbrønde, planter og terrasse",
        "Påføring af biologisk algedræber med lavt tryk",
        "Skånsom afrensning (softwash) eller passiv 'self-clean' over 6–12 måneder",
        "Eventuel imprægnering for at forlænge effekten",
        "Oprydning og fotodokumentation før/efter",
      ],
    },
    {
      heading: "Faldgruber",
      list: [
        "Højtryksrensning på gammelt eternittag — kan frigøre sundhedsskadelige fibre",
        "'For-godt-til-at-være-sandt' priser uden softwash — typisk bare højtryk uden efterbehandling",
        "Behandling i lave temperaturer (< 5 °C) eller umiddelbart før regn — produktet virker dårligt",
        "Manglende afdækning af regnvandsbrønde — kan skade vandmiljøet",
        "Brug af klorbaserede produkter på grønne tage eller nær fiskedam",
      ],
    },
    {
      heading: "Algebehandling af facade",
      paragraphs: [
        "Murede og pudsede facader algebehandles på samme måde. Sørg for at facaden er intakt med tætte fuger — ellers presses vand ind og giver fugtskader. Pris for typisk facade: 30–55 kr./m². På pudsede facader kombineres ofte med en let efterimprægnering.",
      ],
      body: (
        <p>
          Hænger algerne sammen med fugtskader i muren, så læs også{" "}
          <Link to="/blog/murer-revner-og-fugtskader">murer — revner og fugtskader</Link> og overvej en{" "}
          <Link to="/blog/hvad-koster-facaderens">facaderens</Link> samtidig.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/algebehandling-pris-pr-m2-2026">Algebehandling pris pr. m² 2026</Link></li>
          <li><Link to="/blog/algebehandling-hvor-ofte">Algebehandling — hvor ofte</Link></li>
          <li><Link to="/blog/hvad-koster-tagrensning-2026">Tagrensning pris 2026</Link></li>
          <li><Link to="/blog/tagrender-vedligehold-og-rens">Tagrender — vedligehold og rens</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default AlgaeTreatment;