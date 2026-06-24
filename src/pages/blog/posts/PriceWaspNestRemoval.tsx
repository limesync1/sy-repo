import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "hvepsebo-fjernelse-pris-2026",
  keywords: "hvepsebo fjernelse pris, fjern hvepsebo, hvepsebo i loft",
  faq: [
    { q: "Hvad koster fjernelse af hvepsebo?", a: "595–1.295 kr. inkl. moms for almindelig fjernelse. Stort eller højt placeret bo 1.395–2.495 kr." },
    { q: "Dækker forsikringen?", a: "Som regel ja — bygnings- eller indboforsikring dækker ofte fjernelse af hvepsebo i bygning. Tjek din police." },
    { q: "Kan jeg fjerne det selv?", a: "Lille bo (under 10 cm) tidligt om morgenen — ja. Stort bo, allergiker i hjemmet eller bo over 3 m: livsfarligt, ring fagmand." },
    { q: "Hvor hurtigt kan de komme?", a: "Akut firma typisk 24–72 timer. I højsæson (august) op til 5–7 dage." },
  ],
  sections: [
    { heading: "Pris afhængigt af placering", list: ["Loftsbjælke / låge / under tag: 595–895 kr.","Inde i hulrum (kræver demontering): 1.295–2.495 kr.","Tag/skorsten (kræver lift): 1.495–2.995 kr.","Tilgængelig hule i jord: 595–995 kr."] },
    { heading: "Sådan undgår du nye boer", list: ["Tæt huller i facader inden april.","Hæng kunst-hvepsebo op (skræmmer dronning bort).","Fjern faldfrugt fra haven.","Spray æbleeddike i potentielle lukkesteder."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/skadedyr">Find skadedyrsbekæmper</Link></li>
        <li key="l1"><Link to="/tilbud">Få 3 tilbud</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
