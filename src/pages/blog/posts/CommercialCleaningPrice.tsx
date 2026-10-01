import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "erhvervsrengoering-pris",
  keywords: "erhvervsrengøring pris, kontorrengøring pris, rengøring af kontor pris pr m2, erhvervsrengøring timepris, rengøringsaftale virksomhed",
  faq: [
    { q: "Hvad koster erhvervsrengøring i timen?", a: "Typisk 325–475 kr. ekskl. moms pr. time i 2026. I hovedstadsområdet ligger prisen i den høje ende." },
    { q: "Hvad koster kontorrengøring pr. m²?", a: "Ved ugentlig rengøring ligger prisen ofte på 6–14 kr. pr. m² pr. måned ekskl. moms, afhængigt af hvor ofte der gøres rent og hvor mange toiletter og køkkener der er." },
    { q: "Er fast månedspris eller timepris bedst?", a: "Fast månedspris giver budgetsikkerhed og er normalt for faste aftaler. Timepris passer bedre til enkeltopgaver som hovedrengøring." },
    { q: "Hvad bør en rengøringsaftale indeholde?", a: "Opgaveliste pr. lokale, frekvens, adgangsforhold, hvem der leverer rengøringsmidler, opsigelsesvarsel og hvordan kvaliteten kontrolleres." },
  ],
  sections: [
    { paragraphs: ["Prisen på erhvervsrengøring afhænger mest af tre ting: hvor stort arealet er, hvor ofte der skal gøres rent, og hvor mange våde rum (toiletter og køkkener) der er. Her er de typiske prisniveauer i 2026, alle ekskl. moms."] },
    { heading: "Typiske priser 2026", list: [
      "Timepris: 325–475 kr.",
      "Lille kontor (100 m²), 1× om ugen: 1.200–2.200 kr./md.",
      "Mellemstort kontor (300 m²), 2× om ugen: 4.500–8.000 kr./md.",
      "Daglig rengøring (500 m²): 11.000–19.000 kr./md.",
      "Hovedrengøring: 25–45 kr. pr. m²",
      "Vinduespudsning som tilvalg: 8–20 kr. pr. vindue",
    ] },
    { heading: "Det trækker prisen op", list: [
      "Mange toiletter, køkkener eller kantine",
      "Rengøring uden for normal arbejdstid",
      "Særlige krav, fx klinik eller fødevarer",
      "Svær adgang eller parkering",
    ] },
    { heading: "Sådan sammenligner du tilbud", ordered: [
      "Bed alle firmaer om at prissætte samme opgaveliste.",
      "Omregn til pris pr. måned og pris pr. besøg.",
      "Spørg hvordan kvaliteten tjekkes, og hvem du kontakter ved fejl.",
      "Tjek opsigelsesvarsel og prisregulering.",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/priser/rengoering">Prisguide: rengøring</Link></li>
        <li><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du rengøringsfirma</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud på rengøring</Link></li>
      </ul>
    ) },
  ],
});
