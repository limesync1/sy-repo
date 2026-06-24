import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rengoering-aarhus-pris-2026",
  keywords:
    "rengøring Aarhus pris, rengøringshjælp aarhus pris, rengøringsfirma aarhus pris, billig rengøring aarhus, fast rengøring aarhus",
  faq: [
    { q: "Hvad koster rengøringshjælp i Aarhus?", a: "295–375 kr./time inkl. moms før BoligJob-fradrag. Aarhus ligger typisk 10–20% under København, men 5–10% over Aalborg og Odense. Efter 25% BoligJob-fradrag på arbejdslønnen reelt 225–285 kr./time." },
    { q: "Hvad koster engangsrengøring (90 m²) i Aarhus?", a: "1.195–2.095 kr. for 4–6 timer inkl. moms. Hovedrengøring med vinduer + skabe indvendigt: 1.995–2.795 kr. Flytterengøring med afleveringsgaranti: 2.495–3.995 kr." },
    { q: "Hvilke områder dækker firmaerne?", a: "Stort set hele Aarhus Kommune: Aarhus C, V, N, Risskov, Højbjerg, Brabrand, Lystrup, Beder-Malling, Tilst, Trige, Skanderborg-grænsen. Længere ud (Hinnerup, Hørning) lægges ofte 95–195 kr./udkald i kørsel." },
    { q: "Er der minimum-tid pr. besøg?", a: "Ja — næsten alle firmaer i Aarhus kører på minimum 2 timer eller 595–795 kr. pr. udkald. Det dækker transport og opstart." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdslønnen, op til 12.900 kr./person/år i 2026. Et par kan dele udgiften og hver tage fradrag. Krav: CVR-registreret firma og digital betaling (MobilePay, kort, bank)." },
    { q: "Kan jeg få samme rengøringsperson hver gang?", a: "Ja — bed eksplicit om 'fast medarbejder' når du indhenter tilbud. De fleste seriøse firmaer i Aarhus tilbyder det, og kvaliteten bliver markant bedre end ved skiftende vikarer." },
    { q: "Hvad koster vinduespudsning i Aarhus oveni?", a: "Indvendige vinduer som tillæg: 245–445 kr./besøg. Udvendige vinduer (separat vinduespudser): 595–1.295 kr. for almindeligt parcelhus." },
  ],
  sections: [
    { paragraphs: [
      "Aarhus er den næstdyreste rengøringsby i landet — typisk 295–375 kr./time, hvilket er ca. 15% under København men 5–10% over Aalborg og Odense. Konkurrencen blandt firmaer er sund, og du kan presse prisen 5–15% ned i et seriøst tilbud, især hvis du binder dig på et abonnement.",
      "Her er de aktuelle Aarhus-priser pr. bydel, pakkepriser for typiske boliger, og hvad den reelle udgift bliver efter BoligJob-fradraget.",
    ]},
    { heading: "Pris pr. bydel (timepris inkl. moms 2026)", list: [
      "Aarhus C + Latinerkvarteret: 345–375 kr./time",
      "Frederiksbjerg + Trøjborg: 335–365 kr./time",
      "Risskov + Skåde + Marselisborg: 325–365 kr./time",
      "Højbjerg + Holme + Viby: 305–345 kr./time",
      "Brabrand + Tilst + Hasle: 295–335 kr./time",
      "Lystrup + Beder + Malling: 295–325 kr./time",
      "Hinnerup / Hørning (kørsel +): 295–325 kr./time + 95–195 kr.",
    ]},
    { heading: "Pakkepriser månedligt (90 m² hjem)", list: [
      "2 t hver 14. dag: 1.180–1.500 kr./md.",
      "2 t ugentligt: 2.360–3.000 kr./md.",
      "3 t ugentligt: 3.540–4.500 kr./md.",
      "Engangs-hovedrengøring: 1.995–2.795 kr.",
      "Flytterengøring m. afleveringsgaranti: 2.495–3.995 kr.",
      "Erhverv (kontor 200 m² 3x/uge): 7.500–12.500 kr./md.",
    ]},
    { heading: "Reel pris efter BoligJob (par i Aarhus)", paragraphs: [
      "Et par på samme adresse kan hver trække op til 12.900 kr./år for arbejdsløn. Typisk 85–90% af din rengøringsregning er arbejdsløn (resten moms/transport)."
    ], list: [
      "2 t hver 14. dag, Aarhus C: 1.500 kr./md → ca. 1.185 kr./md efter fradrag",
      "2 t ugentligt, Aarhus C: 3.000 kr./md → ca. 2.370 kr./md efter fradrag",
      "3 t ugentligt, Aarhus C: 4.500 kr./md → ca. 3.555 kr./md efter fradrag",
      "Loft pr. par: 25.800 kr./år (svarer til ~2.150 kr./md fradragsberettiget)",
    ]},
    { heading: "Sådan får du den bedste pris i Aarhus", ordered: [
      "Indhent 3 tilbud — markedet er konkurrencepræget og prisspændet er 25–30% på samme opgave.",
      "Bed altid om CVR-nummer og forsikringsbevis. Uden CVR intet BoligJob-fradrag.",
      "Forhandl 5–10% rabat mod 6 måneders binding — mange Aarhus-firmaer accepterer det.",
      "Spørg om medarbejderkontinuitet — fast person hver gang giver markant bedre kvalitet.",
      "Få listet specifikt hvad der gøres pr. besøg (badeværelse, køkken, gulve, støv, vinduer indvendig).",
      "Undgå abonnementer med over 3 måneders binding.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/rengoering-koebenhavn-pris-2026">Sammenlign med priser i København</Link></li>
        <li key="l1"><Link to="/blog/privatrengoering-pris-pr-time">Privatrengøring pris pr. time — landsdækkende</Link></li>
        <li key="l2"><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du det rigtige rengøringsfirma</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026 — komplet guide</Link></li>
        <li key="l4"><Link to="/rengoering/aarhus">Find rengøring i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
