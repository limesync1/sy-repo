import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haveservice-pris-aarhus-2026",
  keywords:
    "haveservice pris Aarhus 2026, gartner aarhus pris, havemand aarhus, hækklipning aarhus pris, plæneklipning aarhus, anlægsgartner aarhus",
  faq: [
    { q: "Hvad koster en havemand i Aarhus pr. time?", a: "345–545 kr./time inkl. moms i 2026. Mester/anlægsgartner: 495–625 kr. Svend/havemand: 345–445 kr. Indre Aarhus + Risskov + Højbjerg ligger i toppen, oplandsbyer som Hinnerup, Hørning og Solbjerg i bunden." },
    { q: "Hvad koster fast haveservice pr. måned?", a: "Lille have (150 m²): 1.100–1.950 kr./md. for hækklipning + plæne + ukrudt 2× pr. md. i sæsonen. Mellem have (300 m²): 2.150–3.450 kr./md. Stor have (500+ m²): 3.450–5.850 kr./md." },
    { q: "Hvad koster hækklipning i Aarhus?", a: "Liguster/bøg op til 2 m: 55–115 kr./lbm. (begge sider + top). Høj hæk (2–3 m): 85–165 kr./lbm. Thuja/stedsegrøn: 75–125 kr./lbm. Min. opstart 950–1.500 kr. + bortskaffelse 350–650 kr./trailer." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al havevedligehold i helårsbolig giver 25% retur på arbejdslønnen op til 12.900 kr./person/år. Et par kan tilsammen trække 25.800 kr. Materialer (planter, jord, sten) tæller ikke." },
    { q: "Er Aarhus billigere end København?", a: "Ja — typisk 10–18% billigere end Indre KBH. Forskellen er mindre på små opgaver (1–2 timer hækklipning) og større på årsabonnementer, hvor parkering + adgang i KBH driver prisen op." },
    { q: "Hvad koster anlæg af ny have?", a: "Komplet havedesign + anlæg, 300 m²: 125.000–245.000 kr. Lille terrasse + beplantning: 30.000–75.000 kr. Heraf typisk 25–35% arbejdsløn (BoligJob på den del). Hent 3 tilbud — spredning er 30–50%." },
    { q: "Hvor ofte skal man have havemand?", a: "Klassisk parcelhushave 250–350 m²: 1× pr. 14 dage (april–oktober) + 1–2 hækklipninger pr. år. Stor have 500+ m²: ugentlig i højsæson. Fast abonnement giver 15–25% rabat vs. ad hoc-besøg." },
    { q: "Hvad koster plæneklipning + kantning?", a: "<150 m²: 275–395 kr./gang. 150–300 m²: 395–695 kr. 300–500 m²: 695–1.150 kr. Fast aftale hver 2.–3. uge: 20–30% billigere end enkeltbestilling." },
  ],
  sections: [
    { paragraphs: [
      "Aarhus-haver er typisk større end de københavnske og lettere tilgængelige — det giver 10–18% lavere haveservice-priser i 2026. Men der er stor forskel mellem Indre Aarhus, Risskov og oplandsbyer som Hinnerup eller Solbjerg.",
      "Her er hele prisbilledet: timepriser pr. område, faste priser på de mest bestilte opgaver, og hvordan du sparer 20–30% på et fast abonnement.",
    ]},
    { heading: "Timepris pr. område inkl. moms (2026)", list: [
      "Indre Aarhus + Aarhus C: 495–625 kr./time",
      "Risskov + Skåde + Højbjerg: 475–595 kr./time",
      "Vejlby + Brabrand + Viby: 425–545 kr./time",
      "Tranbjerg + Lystrup + Skødstrup: 395–495 kr./time",
      "Hinnerup + Hørning + Solbjerg: 345–445 kr./time",
    ]},
    { heading: "Faste priser på typiske Aarhus-opgaver", list: [
      "Hækklipning liguster 2 m, 30 lbm.: 2.100–3.650 kr. inkl. opstart + bortskaffelse",
      "Plæne 250 m² + kantning: 495–795 kr./gang",
      "Komplet forårsklargøring 300 m² have: 2.450–4.850 kr.",
      "Beskæring af 1 stort træ (op til 8 m): 2.500–5.850 kr.",
      "Vinterklargøring + opbinding: 1.350–3.250 kr.",
      "Nyanlæg af bed 5 m² inkl. planter: 4.100–8.500 kr.",
    ]},
    { heading: "Fast abonnement — eksempel parcelhus i Risskov", paragraphs: [
      "Parcelhus 300 m² have, hæk 35 lbm., lille terrasse, 2 frugttræer:",
    ], list: [
      "Ad hoc gennem sæsonen (april–oktober): 16.500–24.500 kr./år",
      "Fast abonnement 2× pr. md.: 13.000–19.500 kr./år",
      "Besparelse ca. 20–25%",
      "Plus BoligJob-fradrag: yderligere ca. 3.500–5.000 kr. retur",
    ]},
    { heading: "Reel pris efter BoligJob (par i Aarhus)", list: [
      "Hækklipning 30 lbm.: 2.950 kr. → ca. 2.450 kr. efter fradrag",
      "Fast haveservice 15.500 kr./år: ca. 12.500 kr. efter fradrag",
      "Loft pr. par: 25.800 kr./år fradragsberettiget",
    ]},
    { heading: "Sådan sparer du 20–30%", ordered: [
      "Bestil fast abonnement — undgå opstartsgebyr pr. besøg.",
      "Saml alle haveopgaver i 1 månedligt besøg.",
      "Bestil sammen med naboer — typisk 10–20% rabat hver.",
      "Aftal årligt timeantal frem for løs takst.",
      "Brug BoligJob hvert år — bed om specificeret faktura.",
      "Få 3 tilbud — spredning typisk 25–40%.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/havemand-pris-koebenhavn-2026">Sammenlign med København-priser</Link></li>
        <li key="l1"><Link to="/blog/haveservice-odense-pris-2026">Sammenlign med Odense-priser</Link></li>
        <li key="l2"><Link to="/blog/havemand-vs-anlaegsgartner">Havemand vs. anlægsgartner — forskel</Link></li>
        <li key="l3"><Link to="/blog/have-aarshjul-haveservice">Have-årshjul — hvad gøres hvornår</Link></li>
        <li key="l4"><Link to="/haveservice/aarhus">Find havemand i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
