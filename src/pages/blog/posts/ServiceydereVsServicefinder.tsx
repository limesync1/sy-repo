import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-servicefinder",
  keywords: "serviceydere vs servicefinder, servicefinder alternativ, håndværkerplatform sammenligning",
  faq: [
    { q: "Hvad er forskellen på Serviceydere og Servicefinder?", a: "Servicefinder fokuserer på håndværkertilbud med leads-model (firmaer betaler for leads). Serviceydere er en åben markedsplads hvor du som kunde får fast pris og fri firmavalg uden lead-gebyr." },
    { q: "Er det gratis at indhente tilbud?", a: "Ja, hos Serviceydere er det 100% gratis at indhente og sammenligne tilbud. Du betaler kun firmaet du vælger." },
    { q: "Hvilken giver flest tilbud?", a: "Serviceydere giver typisk 3–5 tilbud pr. opgave på 24–48 timer. Servicefinder kan tage længere tid pga. lead-modellen hvor færre firmaer reagerer." },
    { q: "Hvad med kvalitetssikring?", a: "Begge har anmeldelser og verificering, men Serviceydere kræver CVR, ansvarsforsikring og brancheforeningsmedlemskab for top-rated tier." },
  ],
  sections: [
    { heading: "Sammenligning på hovedpunkter", list: [
      "Pris-model: Serviceydere = gratis. Servicefinder = firmaer betaler leads.",
      "Kategorier: Serviceydere dækker 9 brancher. Servicefinder primært håndværk.",
      "Svartid: Serviceydere typisk 24–48 t. Servicefinder 2–5 dage.",
      "BoligJob-fradrag: begge platforme understøtter indberetning.",
    ]},
    { heading: "Hvornår vælger du hvilken?", paragraphs: [
      "Vælg Serviceydere når du vil have hurtige, sammenlignelige fast pris-tilbud og dække flere typer ydelser (fx både havemand og maler) hos samme platform.",
      <>Se også vores <a href="/priser/haandvaerker">håndværker prisguide</a> for at sætte tilbud i kontekst.</>,
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
      <a href="/blog/diy-vs-haandvaerker">DIY vs. håndværker — hvornår betaler det sig?</a>,
      <a href="/priser/haandvaerker">Håndværker prisguide 2026</a>,
    ]},
  ],
});
export default Post;