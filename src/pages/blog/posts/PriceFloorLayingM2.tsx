import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "gulvlaegning-pris-pr-m2-2026",
  keywords:
    "gulvlægning pris pr m2 2026, parket pris pr m2, laminat pris pr m2, vinyl gulv pris, plankegulv pris",
  faq: [
    { q: "Hvad koster gulvlægning pr. m² i 2026?", a: "Laminat 195–345 kr./m², vinyl/LVT 245–445 kr./m², lamelparket 395–695 kr./m², massivt plankegulv 595–1.250 kr./m². Komplet pris inkl. arbejde, underlag og kantlister." },
    { q: "Hvor stor del af prisen er materialer?", a: "60–75% materialer + 25–40% arbejdsløn ved laminat og vinyl. På parket nærmer det sig 50/50, fordi læggetiden er højere og selve træet ofte er dyrt. Massivt plankegulv: op mod 70% materialer." },
    { q: "Hvad koster afretning?", a: "Selvnivellerende støbning: 165–285 kr./m² (krav ved klikgulve hvor underlaget er ujævnt). Tørafretning med plader: 95–185 kr./m². Spørg om dit underlag kræver det — det er ofte en post folk overser." },
    { q: "Skal jeg fjerne det gamle gulv selv?", a: "Du sparer typisk 65–125 kr./m² ved at gøre det selv. Inkl. bortkørsel koster gulvlæggeren typisk 95–165 kr./m². Tæpper er nemmest selv, klinker/fliser kræver maskine." },
    { q: "Hvor mange gange kan parket slibes?", a: "Lamel-parket (3,5 mm slidlag): 1–2 gange. Massiv plankegulv (15–22 mm): 4–7 gange. Det gør plankegulv markant billigere set over 50 år, selvom købsprisen er højere." },
    { q: "Hvad er forskellen på parket og laminat?", a: "Parket er ægte træ (slidlag). Laminat er en plade med fotoprint og slidlag i plast — ingen reel træfølelse, men 50–70% billigere og mere ridsefast. Vinyl/LVT er en hybrid: vandtæt, blødere fornemmelse, holdbart." },
    { q: "Er gulvlægning BoligJob-berettiget?", a: "Ja — arbejdslønnen giver 25% retur, op til 12.900 kr./person/år i 2026. Materialer og fragtomkostninger er ikke fradragsberettigede." },
  ],
  sections: [
    { paragraphs: [
      "Gulv er en af de største enkeltinvesteringer i boligen, og prisen pr. m² svinger fra 195 kr. for billig laminat til over 1.500 kr. for massivt plankegulv. Det betyder, at samme 60 m² stue kan koste alt fra 11.700 kr. til 90.000 kr.",
      "Her er de aktuelle 2026-priser pr. m² fordelt på gulvtype, hvad du SKAL regne med i tillæg (afretning, fjernelse af gammelt gulv, lister), og hvad du sparer på BoligJob-fradraget.",
    ]},
    { heading: "Pris pr. m² komplet inkl. moms (2026)", list: [
      "Laminat (klikgulv, basis): 195–295 kr./m²",
      "Laminat (premium, vandtæt): 295–345 kr./m²",
      "Vinyl/LVT (klik): 245–395 kr./m²",
      "Vinyl/LVT (limet, premium): 395–445 kr./m²",
      "Lamel-parket (eg/ask): 395–695 kr./m²",
      "Massivt plankegulv (eg/fyr): 595–1.250 kr./m²",
      "Mosaikparket: 695–1.450 kr./m²",
      "Stort-format flisefliser (klinker): 595–1.295 kr./m²",
    ]},
    { heading: "Tillæg du skal regne med", list: [
      "Afretning (selvnivellerende): 165–285 kr./m²",
      "Tørafretning med plader: 95–185 kr./m²",
      "Fjernelse af gammelt gulv: 95–165 kr./m² (inkl. bortkørsel)",
      "Kantlister/fodlister: 65–110 kr./lbm.",
      "Overgangsskinner mellem rum: 195–495 kr./stk.",
      "Flytning af møbler: 1.500–4.000 kr. pr. opgave",
      "Tilpasning omkring radiatorrør: 195–395 kr./rør",
    ]},
    { heading: "Total-eksempel: 60 m² stue + entré (2026)", paragraphs: [
      "Sammenligning af 4 gulvtyper på samme rum, inkl. fjernelse af gammelt gulv, afretning og lister."
    ], list: [
      "Laminat (basis): 60 m² × 295 + afretning + lister ≈ 21.500–28.500 kr.",
      "Vinyl/LVT (premium): 60 m² × 395 + afretning + lister ≈ 28.500–36.500 kr.",
      "Lamel-parket (eg): 60 m² × 595 + afretning + lister ≈ 41.500–52.500 kr.",
      "Massivt plankegulv (eg): 60 m² × 895 + afretning + lister ≈ 60.500–78.500 kr.",
    ]},
    { heading: "Levetid og økonomi over 30 år", paragraphs: [
      "Plankegulv koster mest at lægge, men kan slibes 4–7 gange og holder 50–100 år. Laminat skal udskiftes efter 15–20 år. Set over 30 år er plankegulv ofte billigere end laminat.",
    ], list: [
      "Laminat: 15–20 år. Skal udskiftes 2 gange på 30 år.",
      "Vinyl/LVT: 20–30 år. Udskiftes 1 gang.",
      "Lamel-parket: 25–40 år. Slibes 1–2 gange.",
      "Plankegulv: 50–100 år. Slibes 4–7 gange. Bedste TCO.",
    ]},
    { heading: "Sådan undgår du overraskelser i gulvregningen", ordered: [
      "Få tilbud med opmåling — undgå tilbud baseret kun på m²-tal pr. telefon.",
      "Få specificeret hvad der er inkluderet: afretning, lister, fjernelse af gammelt gulv, bortkørsel.",
      "Spørg om underlaget kræver afretning (typisk JA i ældre boliger).",
      "Aftal præcis hvilket produkt der bruges (mærke + serie + tykkelse på slidlag).",
      "Få 5-årig garanti efter AB-Forbruger på lægningen.",
      "Få separat faktura med arbejdsløn specificeret for BoligJob-fradrag.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvor-mange-gange-slibe-traegulv">Hvor mange gange kan trægulv slibes?</Link></li>
        <li key="l1"><Link to="/blog/gulvslibning-pris-pr-m2-2026">Pris på gulvslibning pr. m²</Link></li>
        <li key="l2"><Link to="/blog/flisemontoer-pris-pr-m2-2026">Pris på flisemontør</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026</Link></li>
        <li key="l4"><Link to="/gulvlaegger">Find gulvlægger</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
