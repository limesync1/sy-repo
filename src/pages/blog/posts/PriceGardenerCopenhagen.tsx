import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "havemand-pris-koebenhavn-2026",
  keywords:
    "havemand pris København 2026, haveservice københavn pris, gartner pris kbh, anlægsgartner københavn, hækklipning københavn pris, plæneklipning københavn",
  faq: [
    { q: "Hvad koster en havemand i København pr. time?", a: "395–595 kr./time inkl. moms i 2026. Mester/anlægsgartner: 545–695 kr. Svend/havemand: 395–495 kr. Indre By + Frederiksberg ligger i toppen, Vestegnen i bunden af spændet. Min. 2–3 timer pr. besøg er normalt." },
    { q: "Hvad koster fast haveservice pr. måned?", a: "Lille have (150 m²): 1.200–2.200 kr./md. for hækklipning + plæne + ukrudt 2× pr. md. i sæsonen. Mellem have (300 m²): 2.400–3.800 kr./md. Stor have (500+ m²): 3.800–6.500 kr./md. Vintervedligehold (snerydning) ofte separat aftale." },
    { q: "Hvad koster hækklipning?", a: "Almindelig liguster/bøg op til 2 m højde: 65–125 kr./lbm. (begge sider + top). Høj hæk (2–3 m): 95–185 kr./lbm. Thuja/stedsegrøn: 85–145 kr./lbm. + bortskaffelse 350–650 kr./trailer. Min. opstart 1.200–1.800 kr." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al havevedligehold i helårsbolig giver 25% retur på arbejdslønnen op til 12.900 kr./person/år i 2026. Et par kan tilsammen trække 25.800 kr. Affaldsbortskaffelse og planter er ikke fradragsberettiget, kun arbejdsløn." },
    { q: "Hvad koster anlæg af ny have?", a: "Komplet havedesign + anlæg, 300 m² have: 145.000–285.000 kr. Heraf typisk 25–35% arbejdsløn (BoligJob på den del). Lille terrasse + beplantning: 35.000–85.000 kr. Få 3 tilbud — spredning er 30–50%." },
    { q: "Bydels-priser i KBH — er der forskel?", a: "Ja. Indre By + Frederiksberg + Hellerup: 25–35% dyrere end Vestegnen pga. besværlig adgang (smalle gader, parkering, ingen plads til affaldscontainer). Bestil samme havemand sammen med naboen for 10–20% rabat hver." },
    { q: "Hvor ofte skal hæk klippes?", a: "Almindelige løvfældende: 1–2× pr. år (typisk juni + august). Stedsegrøn (thuja, taks): 1× pr. år, sidst i august. Hurtigvoksende (Leylands cypres): 2–3× pr. år. Bestil halvårligt — det er billigere end ad hoc." },
    { q: "Plæneklipning — pris pr. gang?", a: "Lille plæne <150 m²: 295–445 kr./gang. 150–300 m²: 445–745 kr. 300–500 m²: 745–1.250 kr. Inkl. kantning. Faste abonnementer hver 2.–3. uge er typisk 20–30% billigere end ad hoc." },
  ],
  sections: [
    { paragraphs: [
      "København har de højeste haveservice-priser i landet — typisk 15–25% over landsgennemsnittet. Det handler om to ting: små grunde med besværlig adgang (smalle baghaver, ingen plads til container), og at mange firmaer skal parkere + køre rabatten ind af regningen.",
      "Her er hele 2026-prisbilledet for haveservice i København: timepriser pr. bydel, hvad du betaler for de mest bestilte opgaver, og hvordan du sparer 20–30% på et fast abonnement.",
    ]},
    { heading: "Timepris pr. bydel inkl. moms (2026)", list: [
      "Indre By + Frederiksberg: 545–695 kr./time",
      "Østerbro + Nørrebro + Vesterbro: 495–625 kr./time",
      "Hellerup + Gentofte + Charlottenlund: 545–695 kr./time",
      "Lyngby + Virum + Holte: 495–625 kr./time",
      "Amager + Valby + Vanløse: 445–575 kr./time",
      "Vestegnen (Glostrup, Hvidovre, Albertslund): 395–525 kr./time",
    ]},
    { heading: "Faste priser på typiske KBH-opgaver", list: [
      "Hækklipning liguster 2 m, 25 lbm.: 2.250–3.850 kr. inkl. opstart + bortskaffelse",
      "Plæne 200 m² + kantning: 545–845 kr./gang",
      "Komplet forårsklargøring 250 m² have: 2.850–5.500 kr.",
      "Beskæring af 1 stort træ (op til 8 m): 2.800–6.500 kr.",
      "Vinterklargøring + opbinding: 1.450–3.500 kr.",
      "Nyanlæg af bed 5 m² inkl. planter: 4.500–9.500 kr.",
    ]},
    { heading: "Fast abonnement vs. ad hoc — hvad sparer du?", paragraphs: [
      "Et typisk eksempel: parcelhus i Valby med 300 m² have, hæk på 30 lbm., lille terrasse.",
    ], list: [
      "Ad hoc gennem sæsonen (april–oktober): 18.500–28.500 kr./år",
      "Fast abonnement 2× pr. md. (april–oktober): 14.500–22.500 kr./år",
      "Besparelse: ca. 20–25% — fordi der er kun ét opstartsgebyr pr. besøg",
      "Plus BoligJob-fradrag: yderligere ca. 4.000–5.500 kr. retur",
    ]},
    { heading: "Reel pris efter BoligJob (par i KBH)", list: [
      "Hækklipning 25 lbm.: 3.450 kr. → ca. 2.900 kr. efter fradrag",
      "Fast haveservice 18.000 kr./år: ca. 14.500 kr. efter fradrag",
      "Loft pr. par: 25.800 kr./år fradragsberettiget",
    ]},
    { heading: "Sådan sparer du 20–30%", ordered: [
      "Bestil fast abonnement — kun ét opstartsgebyr pr. besøg.",
      "Saml hæk + plæne + ukrudt i ét besøg pr. måned.",
      "Bestil sammen med 1–2 naboer — havemanden giver typisk 10–20% rabat hver.",
      "Aftal årligt timeantal frem for ad hoc — du får 10–15% bedre pris.",
      "Brug BoligJob hvert år — bed havemanden specificere arbejdsløn separat.",
      "Få 3 tilbud — spredning typisk 30–45% på samme have.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/haveservice-pris-aarhus-2026">Sammenlign med Aarhus-priser</Link></li>
        <li key="l1"><Link to="/blog/havemand-vs-anlaegsgartner">Havemand vs. anlægsgartner — forskel</Link></li>
        <li key="l2"><Link to="/blog/have-aarshjul-haveservice">Have-årshjul — hvad gøres hvornår</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026</Link></li>
        <li key="l4"><Link to="/haveservice/koebenhavn">Find havemand i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
