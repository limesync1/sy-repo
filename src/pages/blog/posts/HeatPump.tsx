import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "varmepumpe-installation-priser-2026",
  keywords:
    "varmepumpe pris 2026, luft til vand varmepumpe, luft til luft varmepumpe, varmepumpe tilskud, bygningspuljen 2026, installation varmepumpe, SCOP, energibesparelse varmepumpe",
  faq: [
    { q: "Hvad koster en luft-til-vand varmepumpe i 2026 inkl. installation?", a: "Typisk 95.000–155.000 kr. inkl. moms og installation for et almindeligt parcelhus (130–180 m²) før eventuelt tilskud. Med Bygningspuljen kan nettoudgiften lande på 65.000–115.000 kr." },
    { q: "Hvad koster luft-til-luft?", a: "18.000–35.000 kr. inkl. moms og installation for én indedel. Multisplit med 2–3 indedele: 38.000–65.000 kr." },
    { q: "Hvor meget kan jeg spare på varmeregningen?", a: "Skift fra oliefyr eller naturgas til luft-til-vand sparer typisk 40–55 % af varmeudgiften. Skift fra elvarme: 60–70 %. På et hus med 25.000 kr. i varmeregning bliver det 10.000–17.000 kr. årligt." },
    { q: "Findes der tilskud i 2026?", a: "Ja — Bygningspuljen 2026 giver fortsat tilskud til skift fra olie, gas eller elvarme. Beløbet er typisk 20.000–35.000 kr. afhængig af husstandens energiklasse og pulje-runde. Søg FØR installation påbegyndes." },
    { q: "Hvad er SCOP, og hvorfor er det vigtigt?", a: "SCOP (Seasonal Coefficient of Performance) er den sæsonbestemte virkningsgrad — altså hvor meget varme du får pr. kWh strøm over et helt år. SCOP 4,0 = du betaler 1 kWh og får 4 kWh varme. Krav nu: minimum SCOP 4,0 for tilskud." },
    { q: "Hvor lang tid tager installationen?", a: "Luft-til-luft: 4–6 timer. Luft-til-vand med eksisterende centralvarme: 1–2 dage. Skift fra oliefyr inkl. afmontering og nyt rør: 2–4 dage." },
    { q: "Skal jeg have ny eltavle?", a: "Ofte ja. Luft-til-vand kræver typisk en ny dedikeret gruppe på 3×16A eller 3×25A. Hvis tavlen er fyldt, koster en udvidelse 4.500–9.000 kr. — det skal med i tilbuddet." },
    { q: "Hvad er tilbagebetalingstiden?", a: "Luft-til-vand med tilskud: 6–10 år ved skift fra olie/gas. Luft-til-luft som supplement til elvarme: 3–6 år. Varmepumpen holder typisk 15–20 år." },
  ],
  sections: [
    {
      paragraphs: [
        "En varmepumpe er den enkeltinvestering der typisk sparer mest CO₂ og flest kroner pr. krone investeret i en dansk bolig. Valget mellem luft-til-luft og luft-til-vand handler om bygningens varmesystem — ikke om bygningens størrelse.",
      ],
    },
    {
      heading: "Luft-til-vand vs. luft-til-luft (2026-priser)",
      list: [
        "Luft-til-vand: bolig med radiatorer eller gulvvarme, leverer varmt vand, 95.000–155.000 kr.",
        "Luft-til-luft: bolig med elvarme eller som supplement, intet varmt vand, 18.000–35.000 kr.",
        "Multisplit (2–3 rum): 38.000–65.000 kr.",
        "Hybrid (varmepumpe + gaskedel): 75.000–120.000 kr.",
        "Årlig besparelse: 10.000–22.000 kr. (vand) / 5.000–12.000 kr. (luft)",
        "Tilbagebetalingstid: 7–12 år (vand) / 3–6 år (luft)",
      ],
    },
    {
      heading: "Hvad indgår i et godt tilbud?",
      ordered: [
        "Energiberegning baseret på din konkrete bolig (ikke et standardark)",
        "Dimensionering med SCOP-tal, ikke kun COP",
        "Demontering og bortskaffelse af gammelt fyr/olietank",
        "Ny dedikeret eltavle-gruppe + tilslutning til varmtvandsbeholder",
        "Lyddæmpningsfundament og afløb til kondensvand",
        "Idriftsættelse og indregulering af kurver",
        "Garanti: 5 år på arbejde, 6–10 år på kompressor",
      ],
    },
    {
      heading: "Bygningspuljen 2026 — sådan søger du",
      list: [
        "Tjek dit energimærke (skal være C, D, E, F eller G for fuldt tilskud)",
        "Find en VE-godkendt installatør (kun deres tilbud kan bruges)",
        "Søg via SparEnergi.dk inden arbejdet bestilles",
        "Vent på reservation før kontrakten underskrives",
        "Arbejdet skal være færdigt inden for 12 mdr. fra tilsagn",
        "Slutudbetaling sker efter dokumentation (faktura + slutopgørelse)",
      ],
      paragraphs: [
        "Se også vores fulde ",
      ],
      body: (
        <p>
          <Link to="/blog/varmepumpe-pris-installation">prisguide for varmepumpe-installation</Link> og <Link to="/blog/energimaerke-forklaring">forklaring af energimærket</Link>.
        </p>
      ),
    },
    {
      heading: "Typiske faldgruber",
      list: [
        "Underdimensioneret pumpe der kører konstant på spids og slides på halv levetid",
        "Overdimensioneret pumpe der korttidstakter sig selv ihjel",
        "Glemt VE-godkendelse → intet tilskud",
        "Manglende lyddæmpning → klager fra naboer",
        "Radiatorer for små til lavtemperatur-drift (kræver typisk 35–45 °C)",
      ],
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/varmepumpe-pris-installation">Varmepumpe — pris og installation</Link></li>
          <li><Link to="/blog/energimaerke-forklaring">Energimærket forklaret</Link></li>
          <li><Link to="/blog/termografering-bolig">Termografering af bolig</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});
