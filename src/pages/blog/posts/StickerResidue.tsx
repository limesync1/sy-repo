import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fjern-klistermaerker-og-limrester",
  keywords: "fjern klistermærker, limrester glas, klister tape rester, fjerne mærkat plast, klistermærker bil, lim på træ, fjerne label",
  faq: [
    { q: "Hvad er det bedste universalmiddel?", a: "Madolie eller bagepapir-spray (WD-40 til hårde overflader). Olien opløser limens harpiks uden at ridse." },
    { q: "Virker hårtørrer?", a: "Ja — varm limen i 30–60 sekunder så den bliver blød, og pil mærket af i én bevægelse. Bedst på glas, plast og metal." },
    { q: "Hvad gør jeg på tøj?", a: "Frys plagget i 2 timer, knæk limen af, og dup resten med eucalyptusolie eller acetone (kun på bomuld). Vask som normalt." },
  ],
  sections: [
    { paragraphs: ["Vælg metode efter overflade — det er forskellen på et rent resultat og en ridse."] },
    { heading: "Glas, keramik og porcelæn", paragraphs: [
      "Madolie eller eucalyptusolie i 10 minutter, så skrabes af med plastik-skraber. Restfedt fjernes med opvaskemiddel.",
    ] },
    { heading: "Plast (også sarte typer)", list: [
      "Madolie + plastik-skraber (sikkert)",
      "Hårtørrer på medium varme + langsom afpilning",
      "Aldrig: acetone, sprit eller WD-40 — kan opløse plastet",
    ] },
    { heading: "Træ (lakeret eller olieret)", paragraphs: [
      "Varm med hårtørrer. Restlim fjernes med en dråbe olivenolie. Undgå sprit og acetone — de fjerner lak.",
    ] },
    { heading: "Metal og biler", list: [
      "Hårtørrer + plastik-skraber",
      "WD-40 eller tjærefjerner til rest",
      "Til billak: brug specialprodukt (3M Adhesive Remover)",
      "Voks bilen bagefter — lakken er beskyttelseslag svækket",
    ] },
    { heading: "Tøj", ordered: [
      "Frys plagget i pose i 2 timer.",
      "Knæk de hårde limklumper af.",
      "Dup resten med eucalyptusolie eller (på bomuld) acetone.",
      "Vask ved 40 °C med opvaskemiddel direkte på pletten.",
    ] },
    { heading: "Universalmidler du kan bruge", list: [
      "Eucalyptusolie (apotek) — virker på alt",
      "Madolie (oliven, raps) — billigst",
      "Goo Gone / Pin Cleaner — kraftigt",
      "Bagepapir-spray / WD-40 — kun hårde overflader",
    ] },
  ],
});