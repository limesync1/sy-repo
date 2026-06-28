import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-happyhelper",
  keywords: "serviceydere vs happyhelper, happyhelper alternativ, rengøringsplatform sammenligning, bedste serviceplatform danmark",
  faq: [
    { q: "Hvad er den største forskel på Serviceydere og Happyhelper?", a: "Serviceydere er en bred markedsplads for alle serviceydere (rengøring, håndværk, flytning, have m.fl.) med fast pris-tilbud. Happyhelper fokuserer primært på timebaseret rengøring." },
    { q: "Hvilken type opgaver kan jeg få løst hvor?", a: "Serviceydere er en bred markedsplads, der dækker rengøring, håndværk, flytning, have og en række specialfag på tværs af hele Danmark. Happyhelper er primært fokuseret på rengøring i de største byer." },
    { q: "Får jeg BoligJob-fradrag samme sted?", a: "Ja — begge platforme håndterer indberetningen automatisk når du betaler digitalt. Serviceydere dækker både service- og håndværkerfradraget." },
    { q: "Hvilken er billigst?", a: "Priserne afgøres af det enkelte firma, ikke platformen. Serviceydere har bredere konkurrence og typisk 3–5 tilbud pr. opgave — det presser prisen ned." },
  ],
  sections: [
    { heading: "Hurtig sammenligning", list: [
      "Serviceydere: 9 kategorier, fast pris-tilbud, hele Danmark.",
      "Happyhelper: primært rengøring, timepris, største byer.",
      "Serviceydere: 3–5 konkurrerende tilbud pr. opgave.",
      "Happyhelper: book direkte uden tilbudsfase.",
    ]},
    { heading: "Hvornår vælger du Serviceydere?", paragraphs: [
      "Når du vil sammenligne tilbud og få fast pris frem for åben timepris — særligt på engangsopgaver som flytterengøring, hovedrengøring, malerarbejde eller havereparation.",
      <>Læs også vores <a href="/priser/rengoering">prisguide for rengøring 2026</a> for at se realistiske priser før du booker.</>,
    ]},
    { heading: "Hvornår vælger du Happyhelper?", paragraphs: [
      "Når du vil have fast ugentlig/14-dags rengøring med samme person, og bor i København eller Aarhus hvor udvalget er størst.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/serviceydere-vs-servicefinder">Serviceydere vs. Servicefinder</a>,
      <a href="/blog/fast-pris-vs-timepris">Fast pris vs. timepris — hvad er bedst?</a>,
      <a href="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du rengøringsfirma</a>,
    ]},
  ],
});
export default Post;