import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "maler-aarhus-pris-2026",
  keywords:
    "maler Aarhus pris 2026, maler pris kvm aarhus, malermester aarhus pris, hvad koster en maler aarhus, male lejlighed aarhus",
  faq: [
    { q: "Hvad koster en maler i Aarhus pr. time?", a: "495–695 kr./time inkl. moms — ca. 10–15% billigere end København. Mester ligger 595–695 kr., svend 495–595 kr. Specialopgaver (stuk, kalkning): 695–795 kr." },
    { q: "Hvad koster 80 m² malet i Aarhus?", a: "Vægge + loft 2 lag: 18.500–32.500 kr. Med lister, døre og karme: 26.500–46.500 kr. Komplet renovering med spartling og afrensning: 34.000–58.000 kr." },
    { q: "Hvad koster det at male én stue (25 m²)?", a: "Kun vægge 1 lag: 3.500–6.500 kr. Vægge + loft 2 lag: 6.500–11.500 kr. Inkl. lister og karme: 9.500–14.500 kr." },
    { q: "Hvad koster facademaling i Aarhus?", a: "145–245 kr./m² inkl. moms for selve malingen. Stillads tillægges 12.000–28.000 kr. for parcelhus. Komplet facade på 110 m² hus: 28.000–58.000 kr. inkl. stillads." },
    { q: "Er Aarhus billigere end København?", a: "Ja — typisk 10–20% billigere. Forskellen er størst på timepris (-100 kr./time), mindre på m²-priser hvor materialer udgør en stor del." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al indvendig maling i helårsbolig giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år. Maling og spartelmasse er ikke fradragsberettigede." },
    { q: "Hvor mange lag skal jeg betale for?", a: "Standard er 2 lag på nyspartlede flader. Mørke vægge og nikotinplettede lofter kræver ofte grunder + 2 lag = 3 lag. Få det specificeret i tilbuddet." },
  ],
  sections: [
    { paragraphs: [
      "Aarhus er den billigste storby at få malet i Danmark — 10–20% under København, men stadig 5–10% over de mindre jyske byer. Konkurrencen mellem malermestre er sund, så 3 tilbud på samme opgave kan svinge 25–35% i pris.",
      "Her er de aktuelle 2026-priser pr. m² og pr. time, fordelt på Aarhus-bydele, samt realistiske totalpriser for typiske opgaver. Tag BoligJob-fradraget med, så ser du den reelle nettoudgift.",
    ]},
    { heading: "Pris pr. m² inkl. moms (Aarhus 2026)", list: [
      "Vægge, 2 lag plastmaling: 95–145 kr./m²",
      "Loft, 2 lag: 115–165 kr./m²",
      "Facade (mineralsk maling): 145–245 kr./m²",
      "Lister og fodlister: 65–105 kr./lbm.",
      "Indvendige døre (begge sider): 850–1.345 kr./stk.",
      "Karme og false: 245–445 kr./stk.",
      "Spartling (hel væg): 55–115 kr./m² ekstra",
      "Afrensning af tapet: 65–115 kr./m²",
    ]},
    { heading: "Pris pr. bydel (timepris inkl. moms)", list: [
      "Aarhus C + Frederiksbjerg: 595–695 kr./time",
      "Risskov + Skåde + Marselisborg: 545–645 kr./time",
      "Højbjerg + Holme + Viby: 525–595 kr./time",
      "Brabrand + Tilst + Hasle: 495–575 kr./time",
      "Lystrup + Beder + Malling: 495–575 kr./time",
      "Hinnerup / Hørning (kørsel +): 495–595 kr./time + 95–195 kr.",
    ]},
    { heading: "Samlet pris på typiske Aarhus-opgaver", list: [
      "Male én stue 25 m² (vægge + loft 2 lag): 6.500–11.500 kr.",
      "Male soveværelse 14 m² + lister: 5.500–9.500 kr.",
      "Male 80 m² lejlighed (vægge + loft): 18.500–32.500 kr.",
      "Male 80 m² komplet (lister, døre, karme): 26.500–46.500 kr.",
      "Hovedrenovering 80 m² m. spartling: 34.000–58.000 kr.",
      "Facade parcelhus 110 m² (2 lag inkl. stillads): 28.000–58.000 kr.",
    ]},
    { heading: "Reel pris efter BoligJob (par i Aarhus)", paragraphs: [
      "Et par kan hver trække op til 12.900 kr./år. Typisk er 70–80% af malerregningen arbejdsløn (resten maling, sandpapir, afdækning)."
    ], list: [
      "Male én stue 25 m²: 9.500 kr. → ca. 8.000 kr. efter fradrag",
      "Male 80 m² lejlighed: 26.500 kr. → ca. 22.500 kr. efter fradrag",
      "Hovedrenovering 80 m²: 46.000 kr. → ca. 39.100 kr. efter fradrag",
      "Loft pr. par: 25.800 kr./år fradragsberettiget",
    ]},
    { heading: "Sådan undgår du overraskelser", ordered: [
      "Få et opmålingsbesøg — undgå fast pris baseret kun på fotos.",
      "Få tilbuddet specificeret pr. rum og pr. flade.",
      "Aftal antal lag — mørke farver kræver ofte 3 lag.",
      "Spørg om afdækning af gulve og møbler er inkluderet.",
      "Få at vide hvem der står for affald og rengøring.",
      "Bed om 5-årig garanti efter AB-Forbruger.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-male-stue-2026">Hvad koster det at male en stue?</Link></li>
        <li key="l1"><Link to="/blog/forberedelse-foer-maleren-kommer">Forberedelse før maleren kommer</Link></li>
        <li key="l2"><Link to="/blog/maler-koebenhavn-pris-2026">Sammenlign med priser i København</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026</Link></li>
        <li key="l4"><Link to="/maler/aarhus">Find maler i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
