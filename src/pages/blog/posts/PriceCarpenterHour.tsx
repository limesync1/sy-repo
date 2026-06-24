import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "toemrer-timepris-2026",
  keywords:
    "tømrer timepris 2026, tømrer pris pr time, tømrer pris, tømrermester pris, tømrerregning hvad koster",
  faq: [
    { q: "Hvad koster en tømrer pr. time i 2026?", a: "495–745 kr./time inkl. moms. Mester ligger typisk 595–745 kr., svend uden mester på 495–595 kr. Til specialopgaver (trapper, parket, tagopretning) kan timeprisen ramme 795 kr." },
    { q: "Er der altid minimumsudkald?", a: "Ja — næsten alle tømrere fakturerer minimum 1 times kørsel + 1 times arbejde, eller en samlet startpris på 895–1.495 kr. Det gælder også selvom opgaven kun tager 20 minutter." },
    { q: "Skal jeg vælge fast pris eller timepris?", a: "Fast pris på alt, der er defineret på forhånd (vinduesudskift, terrasse, indvendige døre). Timepris kun ved fejlfinding, småreparationer eller arbejde, hvor omfanget reelt ikke kan opmåles før opstart." },
    { q: "Er tømrerarbejde BoligJob-berettiget i 2026?", a: "Ja — al tømrerservice på helårsbolig giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år. Materialer er ikke fradragsberettigede." },
    { q: "Hvad betaler jeg ekstra for weekend og aften?", a: "Aften (efter 16/17): 25–50% tillæg. Weekend: 50–100% tillæg. Helligdage og nat: 100% tillæg. Akut udkald (lækket tag, brækket karm) faktureres oftest med fast akut-takst på 1.495–2.495 kr." },
    { q: "Hvor meget kan jeg spare ved at samle opgaver?", a: "10–25%, hvis du samler 3–5 timers arbejde i ét besøg — kørsel og opstart betales kun én gang. Få listet alle småting (en defekt karm, et hængsel, en list) til samme besøg." },
    { q: "Hvad skal stå i tilbuddet for at undgå ekstraregninger?", a: "Materialeliste med mærke + antal, fast pris eller maks-timer, hvem fjerner affald, hvem stiller stillads, og hvilke uforudsete forhold der udløser ekstra-regning. Se BAT-reglerne." },
  ],
  sections: [
    { paragraphs: [
      "En tømrer er én af de håndværkere du før eller siden får brug for — og hvor prisen kan svinge mest. Det handler ikke kun om timepris, men også om kørsel, minimumstid, og om opgaven faktureres på timer eller fast pris.",
      "Her er de aktuelle 2026-priser fordelt på region, hvad du bør betale for typiske opgaver, og hvordan du regner det reelle timeforbrug ud, så du kan sammenligne tilbud æble-til-æble.",
    ]},
    { heading: "Regionale timepriser inkl. moms (2026)", list: [
      "København + nordsjælland: 645–745 kr./time",
      "Storkøbenhavn + vestegnen: 595–695 kr./time",
      "Aarhus + Aarhus-omegn: 595–695 kr./time",
      "Odense + Aalborg: 565–665 kr./time",
      "Trekantområdet + Sønderjylland: 525–625 kr./time",
      "Mindre byer og provins: 495–595 kr./time",
    ]},
    { heading: "Typiske faste priser (materialer + arbejde)", list: [
      "Skifte 1 vindue 120x120 cm: 4.500–8.500 kr.",
      "Lægge ny terrasse 20 m² (trykimprægneret): 18.000–32.000 kr.",
      "Lægge terrasse i hårdttræ 20 m²: 32.000–58.000 kr.",
      "Nye indvendige døre inkl. montering: 1.800–3.500 kr./stk.",
      "Skifte tagrende 10 m (zink): 6.500–11.500 kr.",
      "Renovere udhæng + sternbræt (hus): 18.000–38.000 kr.",
      "Bygge carport 15 m² uden tag: 22.000–38.000 kr.",
      "Akut tagreparation (storm): 4.500–12.500 kr.",
    ]},
    { heading: "Svend, mester eller firma — hvad skal du vælge?", paragraphs: [
      "Til simple reparationer (en defekt karm, et hængsel, en liste) er en selvstændig svend ofte 20–30% billigere end et stort firma — og fuldt OK, så længe han har CVR og ansvarsforsikring.",
      "Til større opgaver med koordinering (køkken, badeværelse, tilbygning) får du både svend og mester på regningen, men du får også styring, garanti og 1-års gennemgang efter AB-Forbruger. Det er ofte pengene værd."
    ], list: [
      "Selvstændig svend: 495–595 kr./time. Bedst til småopgaver.",
      "Mestervirksomhed (uden underentreprise): 595–745 kr./time.",
      "Stort firma med projektleder: 695–895 kr./time, men giver styring og garanti.",
    ]},
    { heading: "Sådan undgår du overraskelser på regningen", ordered: [
      "Få altid et skriftligt tilbud — også på små opgaver. Det skal indeholde timepris, anslået timeforbrug og materialeliste.",
      "Spørg eksplicit hvad der udløser ekstra-regning (rådne fag, skjult skader, forkert tegning).",
      "Få oplyst kørselstakst og minimumstid. Køres der 40 minutter t/r, betaler du 40 min ekstra arbejde.",
      "Bed om at materialer faktureres til indkøbspris + max 15% avance. Mange tager 30–50%.",
      "Aftal hvem der står for affaldsbortskaffelse — det kan let blive 950–2.500 kr. ekstra.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/goer-det-selv-vs-haandvaerker">Hvornår skal du hyre håndværker — og hvornår selv?</Link></li>
        <li key="l1"><Link to="/blog/fast-pris-eller-timepris-haandvaerker">Fast pris eller timepris — hvad er bedst?</Link></li>
        <li key="l2"><Link to="/blog/koekken-montering-pris-2026">Pris på køkkenmontering 2026</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026 — komplet guide</Link></li>
        <li key="l4"><Link to="/toemrer">Find tømrer i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
