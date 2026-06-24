import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "billig-vs-dyr-flyttefirma",
  keywords: "billig vs dyr flyttefirma, hvad får man for pengene flyttefirma, billigste flyttefirma faldgruber",
  faq: [
    { q: "Er billigste flyttefirma altid værst?", a: "Nej, men kig efter rød flag: ingen forsikring, ingen besigtigelse, kun kontant betaling, ingen CVR. De typiske spareområder er tid, antal mand og udstyrskvalitet." },
    { q: "Hvad bør være inkluderet i prisen?", a: "Forsikring (min. 100.000 kr.), tæpper og remme, etagetillæg, kørsel under 50 km, dækning af gulv og kanter." },
    { q: "Hvor stor er forskellen i praksis?", a: "På en almindelig 3-vær. lejlighedsflytning: billig 2.800–3.500 kr., gennemsnit 4.500–5.500 kr., premium 7.000–9.000 kr." },
    { q: "Hvornår er premium det værd?", a: "Ved klaverer, kunst, glas, antikviteter eller flytninger med kort tidsfrist. Ved standard flytninger giver gennemsnit-niveau bedste valuta." },
  ],
  sections: [
    { heading: "Hvad sparer det billige firma på?", list: [
      "Antal mand (2 mand på job der kræver 3).",
      "Udstyr (ingen møbeltæpper, dårlige remme).",
      "Tid (presser opgaven og lader skader ske).",
      "Forsikring (ingen eller minimal dækning).",
      "Hjælpemidler (ingen elevator-bæreseler, sækkevogn).",
    ]},
    { heading: "Rød flag — undgå disse", list: [
      "Tilbud uden besigtigelse over 5.000 kr.",
      "Kun kontant betaling.",
      "Ingen CVR-nummer på tilbuddet.",
      "Manglende forsikringsbevis.",
      "Anmeldelser under 3,5/5 eller meget få.",
    ]},
    { heading: "Det gyldne mellemniveau", paragraphs: [
      <>For 95% af kunder er et mellem-prisniveau (4.500–6.500 kr. for almindelig lejlighedsflytning) det rigtige valg. Indhent 3–5 tilbud via <a href="/priser/flyttehjaelp">flytteprisguiden</a> for at sammenligne.</>,
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/selvflytning-vs-flyttefirma">Selvflytning vs. flyttefirma</a>,
      <a href="/blog/tjekliste-til-flyttedag">Flytte-tjekliste</a>,
      <a href="/priser/flyttehjaelp">Flyttehjælp prisguide 2026</a>,
    ]},
  ],
});
export default Post;