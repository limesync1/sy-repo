import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rengoering-koebenhavn-pris-2026",
  keywords:
    "rengøring København pris, rengøringshjælp kbh pris, rengøringsfirma københavn pris, billig rengøring københavn, fast rengøringshjælp københavn",
  faq: [
    { q: "Hvad koster fast rengøringshjælp i København?", a: "345–425 kr./time inkl. moms før BoligJob-fradrag. Efter 25% fradrag på arbejdslønnen ender du typisk på 260–320 kr./time. Indre By og Frederiksberg ligger i den dyre ende, vestegnen i den billige." },
    { q: "Hvad koster engangsrengøring af 90 m² i KBH?", a: "1.495–2.495 kr. for 4–6 timers grundig rengøring inkl. moms. Hovedrengøring med vinduer + skabe indvendigt: 2.295–3.495 kr. Flytterengøring 90 m²: 2.995–4.795 kr. inkl. afleveringsgaranti." },
    { q: "Er der minimum-tid pr. besøg?", a: "Ja — næsten alle firmaer kører på minimum 2 timer eller 695–895 kr. pr. udkald. Det dækker transport og opstart. Vil du have 1 time/uge, kan du i stedet købe 2 timer hver 14. dag." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — almindelig privatrengøring i din helårsbolig giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år i 2026. Et par på samme adresse kan dele udgiften og hver tage fradrag." },
    { q: "Hvad er forskellen på et stort firma og et lokalt KBH-firma?", a: "Store kæder har faste procedurer, vikar ved sygdom og online booking, men er ofte 10–20% dyrere. Lokale firmaer i KBH har samme medarbejder hver gang og er ofte mere fleksible — men har sjældent vikar ved ferie." },
    { q: "Hvor lang opsigelse har et rengøringsabonnement?", a: "Standard er 1 måneds opsigelse til den sidste i måneden. Nogle firmaer binder dig 3 måneder. Tjek altid kontrakten — og undgå tilbud med 6 eller 12 måneders binding." },
    { q: "Kan jeg få vinduer pudset oveni rengøringen?", a: "Mange firmaer pudser indvendigt mod 295–495 kr. ekstra pr. besøg. Udvendige vinduer kræver oftest en separat vinduespudser — typisk 695–1.495 kr. for en almindelig KBH-lejlighed." },
  ],
  sections: [
    { paragraphs: [
      "København er den dyreste rengøringsby i landet — typisk 15–25% over landsgennemsnittet. Den gode nyhed: BoligJob-fradraget gør den reelle udgift mere overskuelig, og konkurrencen blandt firmaer er hård nok til at du kan presse prisen 5–15% ned i et tilbud.",
      "Her får du de aktuelle KBH-priser fordelt på bydel, pakkepriser for typiske lejligheder og huse, og hvad du konkret betaler efter BoligJob-fradraget.",
    ]},
    { heading: "Pris pr. bydel/zone (timepris inkl. moms 2026)", list: [
      "Indre By + Frederiksberg: 395–425 kr./time",
      "Vesterbro / Nørrebro / Østerbro: 365–405 kr./time",
      "Amager (Islands Brygge, Sundby): 355–395 kr./time",
      "Hellerup + Charlottenlund: 385–425 kr./time",
      "Lyngby + Gentofte: 375–415 kr./time",
      "Valby + Vanløse + Brønshøj: 345–385 kr./time",
      "Vestegnen (Glostrup, Albertslund, Hvidovre): 325–375 kr./time",
    ]},
    { heading: "Faste pakkepriser (90 m² hjem)", list: [
      "2 t hver 14. dag: 1.580–1.700 kr./md.",
      "2 t ugentligt: 3.160–3.400 kr./md.",
      "3 t ugentligt: 4.350–5.100 kr./md.",
      "Engangs-hovedrengøring 90 m²: 2.295–3.495 kr.",
      "Flytterengøring 90 m² m. afleveringsgaranti: 2.995–4.795 kr.",
      "Erhverv (kontor 200 m² 3 gange/uge): 8.500–14.500 kr./md.",
    ]},
    { heading: "Reel pris efter BoligJob (par i KBH)", paragraphs: [
      "Et par på samme adresse kan hver trække 12.900 kr./år for arbejdsløn. Det meste af din rengøringsregning ER arbejdsløn (typisk 85–90%, resten er moms/transport)."
    ], list: [
      "2 t hver 14. dag, KBH: 1.700 kr./md → ca. 1.350 kr./md efter fradrag",
      "2 t ugentligt, KBH: 3.400 kr./md → ca. 2.700 kr./md efter fradrag",
      "3 t ugentligt, KBH: 5.100 kr./md → ca. 4.050 kr./md efter fradrag",
      "Loft pr. par: 25.800 kr./år (svarer til ~2.150 kr./md fradragsberettiget)",
    ]},
    { heading: "Sådan får du den bedste pris i København", ordered: [
      "Indhent 3 tilbud — KBH-markedet er konkurrencepræget, og priserne kan svinge 25–30% på samme opgave.",
      "Bed altid om CVR-nummer og forsikringsbevis. Uden CVR intet BoligJob-fradrag.",
      "Forhandl prisen ned 5–10% mod 6 måneders binding — mange firmaer accepterer det.",
      "Spørg om medarbejderkontinuitet — fast person hver gang giver bedre kvalitet end skiftende vikarer.",
      "Bed om at få listet specifikt hvad der gøres ved hvert besøg (badeværelse, køkken, gulve, støv, vinduer indvendig).",
      "Undgå abonnementer med mere end 3 måneders binding — markedet skifter for hurtigt.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/privatrengoering-pris-pr-time">Privatrengøring pris pr. time — landsdækkende</Link></li>
        <li key="l1"><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du det rigtige rengøringsfirma</Link></li>
        <li key="l2"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026 — komplet guide</Link></li>
        <li key="l3"><Link to="/blog/hvad-koster-flytterengoering-2026">Pris på flytterengøring 2026</Link></li>
        <li key="l4"><Link to="/rengoering/koebenhavn">Find rengøring i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
