import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "rengoering-af-aluminium",
  keywords: "rengøring af aluminium, polering aluminium, mat aluminium, aluminium oxidering, alu havemøbler rens, alu vinduer pudses, alu felge",
  faq: [
    { q: "Hvorfor bliver aluminium mat?", a: "Aluminium iltes naturligt og danner et tyndt lag aluminiumoxid. Det beskytter mod videre korrosion, men gør overfladen mat og grå." },
    { q: "Må jeg bruge stålsvamp?", a: "Nej. Stålsvamp efterlader jernpartikler der ruster på aluminium. Brug specielle alu-svampe eller microfiber." },
    { q: "Tåler aluminium opvaskemaskine?", a: "Nej. Vaskepulver er basisk og misfarver aluminium permanent — det bliver gråt og fnugget. Vask altid i hånden." },
  ],
  sections: [
    { paragraphs: ["Aluminium kræver mild, syrlig rens — aldrig basisk eller skurende. Den rigtige metode afhænger af om overfladen er anodiseret, polerede eller børstet."] },
    { heading: "Daglig rens (alle typer)", paragraphs: ["Lunkent vand + opvaskemiddel + blød klud. Skyl, tør straks af. Stående vand efterlader pletter."] },
    { heading: "Mat eller ilte alu — opfriske glansen", ordered: [
      "Lav en pasta af 2 spsk citronsyre + lidt vand.",
      "Smør på, lad virke 5 minutter.",
      "Gnid med blød klud i én retning (med korn).",
      "Skyl, tør, polér med en dråbe olie.",
    ] },
    { heading: "Havemøbler i aluminium", list: [
      "Brun sæbe + lunkent vand til normal rens",
      "Eddike + vand 50/50 mod alger og grøn belægning",
      "Bilvoks 1 gang årligt beskytter mod oxidering",
    ] },
    { heading: "Gryder og pander", paragraphs: [
      "Brændt fond: kog vand + 1 spsk natron + 1 tsk eddike i panden i 5 min. Skrub med træ-spatel. Indersiden af alu-gryder må aldrig poleres — det fjerner non-stick patina.",
    ] },
    { heading: "Aluminium-vinduer og facader", paragraphs: [
      "Pudses som almindelige vinduer (eddike + vand + mikrofiber). Skyl rammen efter — eddike i længere tid kan plette."  ,
    ] },
    { heading: "Felge i aluminium", list: [
      "Almindelig felgrens (pH-neutral) til daglig",
      "Bremsestøv: dedikeret felgrens med jernopløser",
      "Aldrig basiske midler — ætser klar lak på lakerede felge",
    ] },
    { heading: "Det skal du undgå", list: [
      "Klorbaseret rens",
      "Stærke baser (ovnrens, ammoniak)",
      "Stålsvamp og skurepulver",
      "Opvaskemaskine",
    ] },
  ],
});