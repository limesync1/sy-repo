import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-odense-pris-2026",
  keywords:
    "flyttefirma Odense pris 2026, flytning fyn pris, flyttehjælp odense pris, billig flyttefirma odense, flytte 3 værelses odense",
  faq: [
    { q: "Hvad koster et flyttefirma i Odense?", a: "2-vær. 2.800–4.800 kr., 3-vær. 4.500–8.500 kr., villa 7.500–16.500 kr. inkl. moms. Fyn er typisk 20–30% billigere end København for samme boligstørrelse." },
    { q: "Er Fyn billigere end Sjælland?", a: "Ja — typisk 20–30% billigere end København pga. lavere driftsomkostninger, ingen P-dispensation og mere fleksible aflæsningsforhold. Forskellen er størst på villa-flytninger." },
    { q: "Hvornår skal jeg booke?", a: "3–4 uger før almindelig flytning. Månedsskifte (specielt 1. august med studiestart på SDU) er ofte udsolgt 6 uger frem. Book straks når du har boligkontrakten." },
    { q: "Hvilke områder dækker firmaerne?", a: "Hele Odense Kommune + Munkebo, Otterup, Nyborg, Middelfart, Svendborg, Faaborg. Længere ud lægges typisk 195–495 kr. i kørselstillæg pr. udkald." },
    { q: "Hvad koster pakning som tillæg?", a: "Køkken: 1.800–3.800 kr. Komplet bolig (alt undtagen tøj): 4.000–8.500 kr. Bed om at få det specificeret separat — pakning er BoligJob-berettiget (25% retur)." },
    { q: "Er flytning BoligJob-berettiget?", a: "Selve flytningen er IKKE fradragsberettiget. Men pakning, montering og flytterengøring ER. Bed flyttefirmaet specificere disse poster på fakturaen — så får du 25% retur på arbejdslønnen." },
    { q: "Hvad koster forsikring?", a: "Standard ansvarsforsikring inkluderet (firmaets fejl). Udvidet dækning (alle skader, ridser, brækage): 295–795 kr. tillæg. Værdifuldt indbo: forsikres separat i eget indboforsikring." },
  ],
  sections: [
    { paragraphs: [
      "Odense er et af Danmarks billigste flyttemarkeder — typisk 20–30% under København for samme boligstørrelse. Konkurrencen er sund og du kan presse 5–15% af prisen ved at indhente 3 tilbud.",
      "Her er konkrete 2026-priser pr. boligstørrelse, de typiske tillæg, og en tjekliste til at undgå overraskelser på regningen.",
    ]},
    { heading: "Pris pr. boligstørrelse (inkl. moms 2026)", list: [
      "1-vær. (under 40 m²): 1.995–3.500 kr.",
      "2-vær. (40–65 m²): 2.800–4.800 kr.",
      "3-vær. (65–95 m²): 4.500–8.500 kr.",
      "4-vær. (95–125 m²): 6.500–12.500 kr.",
      "Villa 125–175 m²: 9.500–15.500 kr.",
      "Villa 175+ m²: 12.500–18.500 kr.",
      "Til/fra Sjælland (KBH): +3.500–7.500 kr.",
      "Til/fra Jylland (Aarhus): +1.500–3.500 kr.",
    ]},
    { heading: "Typiske tillæg i Odense", list: [
      "Trappetillæg fra 4. etage uden elevator: 750–2.500 kr.",
      "Smal opgang i bymidten: 500–1.500 kr.",
      "Pakning af køkken: 1.800–3.800 kr.",
      "Komplet pakning: 4.000–8.500 kr.",
      "Adskillelse/montering af møbler: 800–2.500 kr.",
      "Klaver/flygel: 1.200–3.500 kr.",
      "Bortskaffelse af affald/storskrald: 850–2.200 kr.",
      "Opmagasinering pr. md.: 495–1.495 kr.",
    ]},
    { heading: "Hvad skal stå i tilbuddet?", ordered: [
      "Fast pris på selve flytningen — ikke timepris.",
      "Antal flyttefolk og biler (2-vær. = 2 mand, 1 bil; villa = 3–4 mand, 2 biler).",
      "Specifik tidsplan med starttidspunkt og forventet sluttid.",
      "Hvad ansvarsforsikringen dækker.",
      "BoligJob-berettigede poster (pakning, montering, flytterengøring) specificeret separat.",
      "Bortskaffelse af tomme flyttekasser og affald.",
    ]},
    { heading: "Spar penge på flytningen i Odense", list: [
      "Flyt midt på måneden — 15–25% billigere end den 1.",
      "Pak selv (køkken, bøger, tøj) — sparer 2.000–4.000 kr.",
      "Adskil selv senge, IKEA-skabe og hylder.",
      "Sortér og smid ud før flytningen.",
      "Indhent 3 tilbud, ikke 2.",
      "Få pakning specificeret separat for BoligJob-fradrag.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flyttefirma-koebenhavn-pris">Flyttefirma København pris</Link></li>
        <li key="l1"><Link to="/blog/flyttefirma-aarhus-pris">Flyttefirma Aarhus pris</Link></li>
        <li key="l2"><Link to="/blog/flyttefirma-aalborg-pris-2026">Flyttefirma Aalborg pris</Link></li>
        <li key="l3"><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li key="l4"><Link to="/flyttehjaelp/odense">Find flyttefirma i Odense</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
