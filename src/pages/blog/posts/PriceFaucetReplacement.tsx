import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "vvs-vandhane-skift-pris-2026",
  keywords: "vvs vandhane skift pris 2026, ny vandhane pris, brusearmatur skift pris",
  faq: [
    { q: "Hvad koster det at få skiftet en vandhane?", a: "Køkkenhane 895–1.795 kr., håndvaskhane 695–1.395 kr., brusearmatur 1.295–2.495 kr. inkl. arbejde (uden armatur)." },
    { q: "Indgår armaturet i prisen?", a: "Nej — typisk ikke. Standardarmatur koster 595–2.495 kr. Designarmatur op til 6.500 kr." },
    { q: "Skal jeg lukke for vandet?", a: "VVS'eren gør det. Du skal kunne vise hvor stophanen er." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn op til 12.900 kr./person." },
  ],
  sections: [
    { heading: "Priser inkl. arbejde (uden armatur)", list: ["Håndvaskhane: 695–1.395 kr.","Køkkenarmatur: 895–1.795 kr.","Brusearmatur (standard): 1.295–2.495 kr.","Brusearmatur (termostat): 1.495–2.995 kr.","Udendørs frostsikker hane: 1.495–3.500 kr."] },
    { heading: "Spar penge ved at samle opgaver", list: ["1 udkald + 3 vandhaner: spar 25–40%.","Køb selv armaturet (sparer 15–25% vs. håndværker-pris).","Få fast pris i stedet for timepris.","Saml med andet VVS-arbejde."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/vvs-akut-foer-installatoeren-kommer">VVS-akut før installatøren kommer</Link></li>
        <li key="l1"><Link to="/blog/tilstoppet-afloeb-selv-eller-vvs">Pris på tilstoppet afløb</Link></li>
        <li key="l2"><Link to="/vvs">Find VVS i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
