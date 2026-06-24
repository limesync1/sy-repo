import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-aarhus-pris",
  keywords:
    "flyttefirma Aarhus pris, flytning Aarhus, flyttefirma billig aarhus, flyttehjælp aarhus pris, flytte 3 værelses aarhus pris",
  faq: [
    { q: "Hvad koster et flyttefirma i Aarhus for en 2-værelses?", a: "3.000–5.500 kr. inkl. moms — typisk 15–20% under København. Med pakning af køkken og montering: 4.500–8.000 kr. Trappetillæg på høje etager uden elevator: 1.000–3.000 kr. ekstra." },
    { q: "Hvad koster det for 3-værelses og villa?", a: "3-vær. (65–95 m²): 4.800–8.500 kr. Villa (125+ m²): 8.000–18.000 kr. afh. volumen og afstand. Med pakning og montering kan villa-flytninger ramme 22.000 kr." },
    { q: "Hvor meget koster trappetillæg i Aarhus C?", a: "Højere etager (4+) uden elevator: 1.000–3.000 kr. Smalle middelaldergader hvor lastbilen ikke kan holde tæt på: 750–2.500 kr. Trange opgange i Latinerkvarteret kan kræve møbelhejs på 3.500–8.500 kr." },
    { q: "Er Aarhus billigere end København?", a: "Ja — typisk 15–25% billigere for samme boligstørrelse. Forskellen er størst på 3+ værelses og villa-flytninger hvor parkering, P-dispensation og dyrere lokaler i KBH driver prisen op." },
    { q: "Hvornår skal jeg booke flyttefirma i Aarhus?", a: "Mindst 3–5 uger før almindelig flytning. Månedsskifte (specielt 1. august og 1. september pga. studiestart) er ofte udsolgt 6–8 uger i forvejen — book så snart du har boligkontrakten." },
    { q: "Er flytning BoligJob-berettiget?", a: "Selve flytningen er IKKE fradragsberettiget. Men pakning, montering og flytterengøring ER — så bed flyttefirmaet om at specificere det på fakturaen for at få 25% retur på de poster." },
    { q: "Hvad koster forsikring under flytningen?", a: "Standard ansvarsforsikring inkluderet (dækker firmaets fejl). Vil du dække alle skader (også egne fejl, ridser, brækage): 295–795 kr. tillæg. Værdifuld bohave (kunst, klaver): forsikres separat hos eget selskab." },
  ],
  sections: [
    { paragraphs: [
      "Aarhus er Danmarks næststørste flyttemarked og priserne har stabiliseret sig 15–25% under København i 2026. Til gengæld er sommeren ekstrem — månedsskifte juli-september er ofte udsolgt 6+ uger frem pga. studiestart.",
      "Her er konkrete 2026-priser fordelt på bydel og boligstørrelse, de tillæg du oftest overser (smalle middelaldergader, manglende elevator, P-dispensation), og en tjekliste til at få det bedste tilbud.",
    ]},
    { heading: "Pris efter bydel og boligstørrelse", list: [
      "Aarhus C 1-vær. (under 40 m²): 1.995–3.500 kr.",
      "Aarhus C 2-vær.: 3.500–5.500 kr.",
      "Aarhus C 3-vær. (med trapper): 5.500–9.500 kr.",
      "Risskov / Skåde 3-vær. villa-lejlighed: 5.500–9.500 kr.",
      "Højbjerg / Holme villa (125+ m²): 8.000–16.000 kr.",
      "Brabrand / Hasle parcelhus: 7.500–14.500 kr.",
      "Tilst / Lystrup / Beder villa: 7.000–13.000 kr.",
      "Til/fra Sjælland (KBH): +4.500–8.500 kr.",
    ]},
    { heading: "Typiske tillæg i Aarhus", list: [
      "Smal middelaldergade i midtbyen: 750–2.500 kr.",
      "Manglende elevator (4+ etager): 1.000–3.000 kr.",
      "Møbelhejs (Latinerkvarteret, smal opgang): 3.500–8.500 kr.",
      "Parkering uden P-zone/dispensation: 200–500 kr.",
      "Klaver/flygel: 1.200–3.500 kr.",
      "Pakning af køkken: 2.000–4.500 kr.",
      "Komplet pakning hele bolig: 4.500–9.500 kr.",
      "Bortskaffelse/genbrug: 850–2.500 kr.",
    ]},
    { heading: "Hvad du bør bede om i tilbuddet", ordered: [
      "Fast pris (ikke timepris) på selve flytningen — så undgår du regnskab på dagen.",
      "Antal flyttefolk og biler specificeret (2-vær. = 2 mand, 1 bil; villa = 3–4 mand, 2 biler).",
      "Specifik tidsplan med starttidspunkt og forventet sluttid.",
      "Hvad ansvarsforsikringen dækker — og hvad ekstra dækning koster.",
      "BoligJob-berettigede poster (pakning, montering, flytterengøring) specificeret separat på fakturaen.",
      "Hvem der står for tomme flyttekasser/affald efter flytning.",
    ]},
    { heading: "Spar penge på flytningen i Aarhus", list: [
      "Flyt midt på måneden — typisk 15–25% billigere end den 1.",
      "Pak selv (køkken, bøger, tøj). Sparer 2.500–4.500 kr.",
      "Adskil selv senge, hylder, IKEA-skabe.",
      "Sortér og smid ud før flytningen — mindre volumen = lavere pris.",
      "Indhent 3 tilbud, ikke 2.",
      "Tjek hver post i fakturaen — typiske fejl: dobbelt-faktureret kørsel, ekstra mandetid.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flyttefirma-koebenhavn-pris">Sammenlign med København-priser</Link></li>
        <li key="l1"><Link to="/blog/flyttefirma-odense-pris-2026">Odense-priser</Link></li>
        <li key="l2"><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li key="l3"><Link to="/blog/hvad-koster-flytterengoering-2026">Hvad koster flytterengøring?</Link></li>
        <li key="l4"><Link to="/flyttehjaelp/aarhus">Find flyttefirma i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
