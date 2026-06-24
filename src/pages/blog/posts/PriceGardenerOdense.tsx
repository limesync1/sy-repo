import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haveservice-odense-pris-2026",
  keywords:
    "haveservice Odense pris 2026, havemand fyn, gartner odense pris, hækklipning odense, plæneklipning odense pris, anlægsgartner odense",
  faq: [
    { q: "Hvad koster en havemand i Odense pr. time?", a: "325–495 kr./time inkl. moms i 2026. Mester/anlægsgartner: 445–575 kr. Svend/havemand: 325–425 kr. Indre Odense + Hjallese + Bellinge ligger i toppen, mindre fynske byer som Aarslev og Otterup i bunden." },
    { q: "Hvad koster fast haveservice pr. måned?", a: "Lille have (150 m²): 950–1.750 kr./md. for hækklipning + plæne + ukrudt 2× pr. md. Mellem have (300 m²): 1.850–3.150 kr./md. Stor have (500+ m²): 3.150–5.250 kr./md." },
    { q: "Hvad koster hækklipning i Odense?", a: "Liguster/bøg op til 2 m: 45–95 kr./lbm. (begge sider + top). Høj hæk (2–3 m): 75–145 kr./lbm. Thuja/stedsegrøn: 65–115 kr./lbm. Min. opstart 850–1.350 kr. + bortskaffelse 300–550 kr./trailer." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — havevedligehold giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år i 2026. Et par kan trække 25.800 kr. Planter, jord og sten er ikke fradragsberettiget — kun arbejdsløn." },
    { q: "Er Odense billigere end Aarhus og København?", a: "Ja — typisk 15–25% billigere end Aarhus og 20–30% billigere end Indre KBH. Lavere lønninger og lettere adgang (større grunde, mere parkering) er hovedforklaringen." },
    { q: "Hvad koster nyanlæg af have?", a: "Komplet havedesign + anlæg, 300 m²: 110.000–215.000 kr. Lille terrasse + beplantning: 28.000–65.000 kr. Heraf typisk 25–35% arbejdsløn (BoligJob på den del). Hent 3 tilbud." },
    { q: "Hvad koster plæneklipning?", a: "<150 m²: 245–375 kr./gang. 150–300 m²: 375–595 kr. 300–500 m²: 595–995 kr. Fast aftale hver 2.–3. uge giver 20–30% rabat vs. ad hoc." },
    { q: "Klares oplandet eller kun Odense by?", a: "De fleste havemandsfirmaer dækker hele Odense Kommune + nabokommuner (Nordfyn, Faaborg-Midtfyn, Kerteminde, Nyborg vest). Kørsel over 15 km tillægges typisk 6–10 kr./km eller indregnes i en højere opstart." },
  ],
  sections: [
    { paragraphs: [
      "Fynske haver er gennemsnitligt 15–25% billigere at vedligeholde end Aarhus/KBH-haver i 2026. Det skyldes både lavere fynske lønninger og lettere adgangsforhold — typisk større grunde, parkering ved indgangsdøren og mindre trafik.",
      "Her er hele prisbilledet for haveservice i Odense og på Fyn: timepriser pr. område, faste priser på de mest bestilte opgaver, og hvordan du sparer 20–30% med et fast abonnement.",
    ]},
    { heading: "Timepris pr. område inkl. moms (2026)", list: [
      "Odense C + Hunderup + Skibhus: 445–575 kr./time",
      "Hjallese + Bellinge + Sanderum: 395–525 kr./time",
      "Stige + Munkebo + Otterup: 365–475 kr./time",
      "Aarslev + Kerteminde + Nyborg: 345–445 kr./time",
      "Mindre fynske byer: 325–425 kr./time",
    ]},
    { heading: "Faste priser på typiske Odense-opgaver", list: [
      "Hækklipning liguster 2 m, 30 lbm.: 1.850–3.250 kr. inkl. opstart + bortskaffelse",
      "Plæne 250 m² + kantning: 445–745 kr./gang",
      "Komplet forårsklargøring 300 m² have: 2.150–4.450 kr.",
      "Beskæring af 1 stort træ (op til 8 m): 2.250–5.250 kr.",
      "Vinterklargøring + opbinding: 1.200–2.950 kr.",
      "Nyanlæg af bed 5 m² inkl. planter: 3.650–7.850 kr.",
    ]},
    { heading: "Fast abonnement — eksempel parcelhus i Bellinge", paragraphs: [
      "Parcelhus 350 m² have, hæk 40 lbm., terrasse, 3 frugttræer:",
    ], list: [
      "Ad hoc gennem sæsonen (april–oktober): 14.500–21.500 kr./år",
      "Fast abonnement 2× pr. md.: 11.500–17.250 kr./år",
      "Besparelse ca. 20–25%",
      "Plus BoligJob: yderligere ca. 3.250–4.500 kr. retur",
    ]},
    { heading: "Reel pris efter BoligJob (par i Odense)", list: [
      "Hækklipning 30 lbm.: 2.650 kr. → ca. 2.200 kr. efter fradrag",
      "Fast haveservice 13.500 kr./år: ca. 10.900 kr. efter fradrag",
      "Loft pr. par: 25.800 kr./år fradragsberettiget",
    ]},
    { heading: "Sådan sparer du 20–30%", ordered: [
      "Bestil fast abonnement — kun ét opstartsgebyr pr. besøg.",
      "Saml hæk + plæne + ukrudt i samme månedlige besøg.",
      "Bestil sammen med naboer — 10–20% rabat hver.",
      "Aftal årligt timeantal i stedet for ad hoc.",
      "Brug BoligJob hvert år — bed om specificeret faktura.",
      "Få 3 tilbud — spredning typisk 25–40%.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/havemand-pris-koebenhavn-2026">Sammenlign med København-priser</Link></li>
        <li key="l1"><Link to="/blog/haveservice-pris-aarhus-2026">Sammenlign med Aarhus-priser</Link></li>
        <li key="l2"><Link to="/blog/havemand-vs-anlaegsgartner">Havemand vs. anlægsgartner — forskel</Link></li>
        <li key="l3"><Link to="/blog/have-aarshjul-haveservice">Have-årshjul — hvad gøres hvornår</Link></li>
        <li key="l4"><Link to="/haveservice/odense">Find havemand i Odense</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
