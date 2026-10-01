import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "haekklipning-pris-pr-meter",
  keywords: "hækklipning pris, hækklipning pris pr meter, klippe hæk pris, gartner hæk pris",
  faq: [
    { q: "Hvad koster hækklipning pr. meter?", a: "Typisk 30–80 kr. pr. løbende meter inkl. moms for en almindelig hæk op til 2 meter, afhængigt af højde, bredde og bortkørsel." },
    { q: "Hvornår skal hækken klippes?", a: "De fleste hække klippes i juni og igen i august/september. Undgå klipning i fuglenes yngletid, hvis der er reder." },
    { q: "Er bortkørsel af afklip inkluderet?", a: "Ikke altid. Bortkørsel koster typisk 200–500 kr. pr. læs, så spørg om det i tilbuddet." },
  ],
  sections: [
    { paragraphs: ["Hækklipning er en af de opgaver, flest haveejere får hjælp til. Prisen afhænger især af hækkens højde, bredde og om afklippet skal køres væk."] },
    { heading: "Typiske priser 2026", list: [
      "Lav hæk (under 1,5 m): 30–50 kr. pr. meter",
      "Mellemhøj hæk (1,5–2,5 m): 45–80 kr. pr. meter",
      "Høj hæk (over 2,5 m, kræver lift/stillads): 80–150 kr. pr. meter",
      "Kraftig nedskæring: ofte timepris 350–550 kr.",
    ] },
    { heading: "Sådan sparer du penge", list: [
      "Bestil to faste klipninger om året — det er billigere end én kraftig nedskæring",
      "Kombinér med græsslåning på samme besøg",
      "Brug servicefradraget for havearbejde",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/blog/haveabonnement-pris">Haveabonnement pris</Link></li>
        <li><Link to="/priser/haveservice">Prisguide: haveservice</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud på hækklipning</Link></li>
      </ul>
    ) },
  ],
});
