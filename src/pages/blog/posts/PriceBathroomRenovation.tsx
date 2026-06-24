import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "badevaerelse-renovering-pris-2026",
  keywords: "badeværelsesrenovering pris 2026, nyt badeværelse pris, totalrenovering badeværelse",
  faq: [
    { q: "Hvad koster en badeværelsesrenovering?", a: "Standard 5 m² badeværelse: 95.000–225.000 kr. inkl. moms. Premium med specialfliser: 250.000–450.000 kr." },
    { q: "Hvor lang tid tager det?", a: "3–6 uger fra nedrivning til ibrugtagning. Tørretid på vådrumsmembran tager 5–7 dage." },
    { q: "Hvad koster det pr. m²?", a: "Standard: 18.500–42.500 kr./m² inkl. alle håndværkere og materialer." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — arbejdsløn på alle håndværkere er fradragsberettiget (op til 12.900 kr./person/år)." },
  ],
  sections: [
    { heading: "Pris-bod for 5 m² standard badeværelse", list: ["Nedrivning + bortkørsel: 12.000–22.000 kr.","Murer + vådrumsmembran: 18.000–32.000 kr.","Fliser (inkl. arbejde): 25.000–55.000 kr.","VVS (rør + sanitet): 22.000–48.000 kr.","Elektriker: 8.500–18.500 kr.","Maler + finish: 4.500–9.500 kr.","Sanitet (bruseniche, toilet, vask): 12.000–35.000 kr.","TOTAL: 102.000–219.500 kr."] },
    { heading: "Sådan sparer du 20–40%", list: ["Vælg standardstørrelse-fliser (30×60).","Behold eksisterende afløb og rørføring.","Køb sanitet i tilbud selv.","Få totalentreprise i stedet for fagentreprise.","Indhent 3 tilbud — typisk 40% spredning."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flisemontoer-pris-pr-m2-2026">Pris på flisemontør</Link></li>
        <li key="l1"><Link to="/blog/fjern-skimmel-paa-fuger-badevaerelse">Skimmel på fuger i badeværelset</Link></li>
        <li key="l2"><Link to="/tilbud">Få 3 tilbud på badeværelse</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
