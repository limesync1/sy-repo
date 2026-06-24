import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "maler-koebenhavn-pris-2026",
  keywords:
    "maler København pris 2026, malerpris kbh, malermester pris københavn, hvad koster en maler kbh, male lejlighed pris københavn",
  faq: [
    { q: "Hvad koster en maler i København pr. time?", a: "525–745 kr./time inkl. moms. Mester ligger typisk 645–745 kr., svend 525–625 kr. Til specialopgaver (stuk, kalkning, restaurering) regn med 745–895 kr./time." },
    { q: "Hvad koster en 80 m² lejlighed malet?", a: "Vægge + loft 2 lag (klargøring + maling): 22.000–38.500 kr. inkl. moms. Med lister, døre, karme og vinduer: 32.000–55.000 kr. Komplet boligklargøring inkl. spartling og afrensning: 38.000–68.500 kr." },
    { q: "Hvad koster det at male én stue (25 m²) i KBH?", a: "Kun vægge 1 lag: 4.500–7.500 kr. Vægge + loft 2 lag: 8.500–14.500 kr. Inkl. lister og karme: 12.500–18.500 kr." },
    { q: "Er København dyrere end provinsen?", a: "Ja — 15–25% dyrere end resten af landet, pga. høj efterspørgsel, dyre lokaler og parkering. Forskellen er mindre på små opgaver (én stue) end på store (hele lejligheden)." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al indvendig maling i helårsbolig giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år i 2026. Et par kan dele udgiften og hver tage fradrag (op til 25.800 kr.). Maling og materialer er ikke fradragsberettigede." },
    { q: "Hvor mange lag skal jeg betale for?", a: "Standard er 2 lag på nyspartlede flader og 1–2 lag på allerede malede flader. Mørke vægge eller nikotinplettede lofter kræver oftest grunder + 2 lag = 3 lag i alt. Få det specificeret i tilbuddet." },
    { q: "Hvad koster spartling og forarbejde?", a: "Let spartling (skruehuller, små revner): inkluderet i prisen. Hel spartling af væg + slibning: 65–125 kr./m² ekstra. Afrensning af gammel tapet: 75–125 kr./m². Det er ofte 30–50% af samlet pris ved ældre lejligheder." },
  ],
  sections: [
    { paragraphs: [
      "København er det dyreste sted i landet at få malet, men også der hvor konkurrencen mellem malere er størst. Forskellen mellem 3 tilbud på samme lejlighed kan let være 30–40% — så det betaler sig at indhente flere.",
      "Her er de aktuelle KBH-priser pr. m², pr. time og pr. bydel, samt en realistisk samlet pris for at male en typisk lejlighed eller stue. Vi har også taget BoligJob-fradraget med, så du ser den faktiske nettoudgift.",
    ]},
    { heading: "Pris pr. m² inkl. moms (København 2026)", list: [
      "Vægge, 2 lag plastmaling: 105–155 kr./m²",
      "Loft, 2 lag: 125–175 kr./m²",
      "Lister og fodlister: 75–115 kr./lbm.",
      "Indvendige døre (begge sider): 950–1.450 kr./stk.",
      "Karme og false: 295–495 kr./stk.",
      "Vinduer (sprosse-vinduer dyrere): 695–1.995 kr./stk.",
      "Spartling (hel væg): 65–125 kr./m² ekstra",
      "Afrensning af tapet: 75–125 kr./m²",
    ]},
    { heading: "Pris pr. bydel (timepris inkl. moms)", list: [
      "Indre By + Frederiksberg: 645–745 kr./time",
      "Vesterbro / Nørrebro / Østerbro: 595–695 kr./time",
      "Hellerup + Charlottenlund + Gentofte: 645–745 kr./time",
      "Lyngby + Virum: 615–715 kr./time",
      "Amager + Valby + Vanløse: 575–675 kr./time",
      "Vestegnen (Glostrup, Albertslund, Hvidovre): 525–625 kr./time",
    ]},
    { heading: "Samlet pris på typiske KBH-opgaver", list: [
      "Male én stue 25 m² (vægge + loft 2 lag): 8.500–14.500 kr.",
      "Male soveværelse 14 m² + lister: 6.500–11.500 kr.",
      "Male 80 m² lejlighed (vægge + loft): 22.000–38.500 kr.",
      "Male 80 m² komplet (med lister, døre, karme): 32.000–55.000 kr.",
      "Hovedrenovering 80 m² m. spartling/afrensning: 45.000–72.000 kr.",
      "Facade parcelhus 110 m² (2 lag): 38.000–68.500 kr. (stillads inkluderet)",
    ]},
    { heading: "Reel pris efter BoligJob (par i KBH)", paragraphs: [
      "Et par kan hver trække op til 12.900 kr./år for arbejdsløn. Typisk er 70–80% af malerregningen arbejdsløn (resten maling, spartelmasse, sandpapir, afdækning)."
    ], list: [
      "Male én stue 25 m²: 11.500 kr. → ca. 9.700 kr. efter fradrag",
      "Male 80 m² lejlighed: 32.000 kr. → ca. 27.200 kr. efter fradrag",
      "Hovedrenovering 80 m²: 58.000 kr. → ca. 49.300 kr. efter fradrag",
      "Loft pr. par: 25.800 kr./år fradragsberettiget",
    ]},
    { heading: "Sådan undgår du overraskelser i malerregningen", ordered: [
      "Få et opmålingsbesøg — undgå fast pris baseret kun på fotos eller m²-tal pr. telefon.",
      "Få tilbuddet specificeret pr. rum og pr. flade (vægge, loft, lister, døre). Ikke 'hele lejligheden 28.000 kr.'.",
      "Aftal antal lag (1, 2, eller grunder + 2). Mørke farver kræver ofte 3 lag — ekstra pris.",
      "Spørg om afdækning af gulve og møbler er inkluderet. Det bør være standard.",
      "Få at vide hvem der står for rengøring og afhentning af affald.",
      "Bed om 5-årig garanti på maling efter AB-Forbruger (gælder vedhæftning, ikke slid).",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-male-stue-2026">Hvad koster det at male en stue?</Link></li>
        <li key="l1"><Link to="/blog/saadan-vaelger-du-maler">Sådan vælger du den rette maler</Link></li>
        <li key="l2"><Link to="/blog/maler-aarhus-pris-2026">Sammenlign med priser i Aarhus</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026 — komplet guide</Link></li>
        <li key="l4"><Link to="/maler/koebenhavn">Find maler i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
