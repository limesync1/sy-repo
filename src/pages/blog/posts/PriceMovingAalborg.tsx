import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-aalborg-pris-2026",
  keywords:
    "flyttefirma Aalborg pris 2026, flytning nordjylland, flyttehjælp aalborg pris, billig flyttefirma aalborg, flytte 3 værelses aalborg",
  faq: [
    { q: "Hvad koster et flyttefirma i Aalborg?", a: "2-vær. 2.500–4.500 kr., 3-vær. 4.200–8.000 kr., villa 7.000–15.500 kr. inkl. moms. Nordjylland er typisk 20–30% billigere end København for samme boligstørrelse." },
    { q: "Er Nordjylland billigere end Sjælland?", a: "Ja — 20–30% billigere end København. Aalborg ligger på niveau med Odense og er Danmarks billigste storby at flytte i. Forskellen er størst på villa-flytninger." },
    { q: "Dækker firmaerne hele regionen?", a: "Ja — Aalborg by, Nørresundby, Hjørring, Frederikshavn, Brønderslev, Skagen, Pandrup, Aabybro. Længere ud (Thy, Mors) lægges typisk 295–795 kr. i kørselstillæg pr. udkald." },
    { q: "Er pakning inkluderet?", a: "Nej — pakning er altid et tillæg. Køkken: 1.500–3.500 kr. Komplet bolig: 3.500–7.500 kr. Bed om at få det specificeret separat — pakning er BoligJob-berettiget (25% retur)." },
    { q: "Hvornår skal jeg booke?", a: "3–4 uger før almindelig flytning. Månedsskifte (1. august/september med studiestart på AAU) er ofte udsolgt 4–6 uger frem." },
    { q: "Er flytning BoligJob-berettiget?", a: "Selve flytningen er IKKE fradragsberettiget. Men pakning, montering og flytterengøring ER. Bed firmaet specificere det på fakturaen for at få 25% retur på arbejdslønnen." },
    { q: "Hvad koster det at flytte til/fra Sjælland?", a: "Tillæg på 4.000–8.000 kr. afhængig af volumen og brodistance. Storebæltsbroen er hovedudgiften. Komplet villa-flytning Aalborg→KBH: 18.000–28.000 kr." },
  ],
  sections: [
    { paragraphs: [
      "Aalborg er sammen med Odense Danmarks billigste storby at flytte i — typisk 20–30% under København. Konkurrencen mellem nordjyske firmaer er sund og du kan presse 5–15% af prisen med 3 tilbud.",
      "Her er konkrete 2026-priser pr. boligstørrelse, de typiske tillæg, og en tjekliste til at undgå overraskelser på regningen.",
    ]},
    { heading: "Pris pr. boligstørrelse (inkl. moms 2026)", list: [
      "1-vær. (under 40 m²): 1.795–3.200 kr.",
      "2-vær. (40–65 m²): 2.500–4.500 kr.",
      "3-vær. (65–95 m²): 4.200–8.000 kr.",
      "4-vær. (95–125 m²): 6.000–11.500 kr.",
      "Villa 125–175 m²: 9.000–14.500 kr.",
      "Villa 175+ m²: 12.000–17.500 kr.",
      "Til/fra Sjælland (KBH): +4.000–8.000 kr.",
      "Til/fra Aarhus: +1.500–3.000 kr.",
    ]},
    { heading: "Typiske tillæg i Aalborg", list: [
      "Trappetillæg fra 4. etage uden elevator: 750–2.500 kr.",
      "Smal opgang i Aalborg midtby: 500–1.500 kr.",
      "Pakning af køkken: 1.500–3.500 kr.",
      "Komplet pakning: 3.500–7.500 kr.",
      "Adskillelse/montering af møbler: 800–2.500 kr.",
      "Klaver/flygel: 1.200–3.500 kr.",
      "Bortskaffelse af affald: 850–2.200 kr.",
      "Opmagasinering pr. md.: 395–1.295 kr.",
    ]},
    { heading: "Hvad skal stå i tilbuddet?", ordered: [
      "Fast pris på selve flytningen — ikke timepris.",
      "Antal flyttefolk og biler (2-vær. = 2 mand, 1 bil; villa = 3–4 mand, 2 biler).",
      "Tidsplan med starttidspunkt og forventet sluttid.",
      "Hvad ansvarsforsikringen dækker, og pris på udvidet dækning.",
      "BoligJob-berettigede poster (pakning, montering, flytterengøring) specificeret separat.",
      "Bortskaffelse af tomme flyttekasser og affald.",
    ]},
    { heading: "Spar penge på flytningen i Aalborg", list: [
      "Flyt midt på måneden — 15–25% billigere end den 1.",
      "Pak selv (køkken, bøger, tøj) — sparer 1.800–3.500 kr.",
      "Adskil selv senge, IKEA-skabe og hylder.",
      "Sortér og smid ud før flytningen — mindre volumen = lavere pris.",
      "Indhent 3 tilbud, ikke 2.",
      "Få pakning og evt. flytterengøring på BoligJob-fradraget (25% retur).",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flyttefirma-koebenhavn-pris">Flyttefirma København pris</Link></li>
        <li key="l1"><Link to="/blog/flyttefirma-aarhus-pris">Flyttefirma Aarhus pris</Link></li>
        <li key="l2"><Link to="/blog/flyttefirma-odense-pris-2026">Flyttefirma Odense pris</Link></li>
        <li key="l3"><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li key="l4"><Link to="/flyttehjaelp/aalborg">Find flyttefirma i Aalborg</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
