import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fjern-roedvinspletter-fra-toej",
  keywords: "rødvinspletter, vinpletter, fjern rødvin, pletter, rengøring",
  faq: [
    { q: "Virker hvidvin på rødvinspletter?", a: "Ja — hvidvin neutraliserer farvepigmenterne. Hæld lidt hvidvin på pletten med det samme og dup forsigtigt. Bedst som førstehjælp før vask." },
    { q: "Kan man fjerne gamle rødvinspletter?", a: "Ja, men det er sværere. Læg tøjet i blød i lunken vand med brintoverilte (3%) og opvaskemiddel i 30–60 min, og vask som normalt." },
    { q: "Må jeg bruge salt på rødvinsplet?", a: "Salt suger lidt, men kan også fiksere pletten på syntetiske stoffer. Brug det kun som nødløsning på naturmaterialer som hør og bomuld." },
    { q: "Hvad virker bedst på sofaen?", a: "Dup pletten op med klud + koldt vand, derefter natron-pasta. Lad det tørre, støvsug op. Undgå at gnubbe — det presser farven dybere." },
    { q: "Kan kemisk rens fjerne gammel rødvin?", a: "Ofte ja, hvis renseriet får tøjet inden for 1–2 uger. Sig altid hvad pletten er — det styrer valg af opløsningsmiddel." },
  ],
  sections: [
    { heading: "Førstehjælp — gør dette inden for 5 minutter", ordered: [
      "Dup (ikke gnub) pletten op med en ren, hvid klud.",
      "Hæld koldt vand bagfra gennem pletten, så den skylles ud — ikke ind i stoffet.",
      "Hvis du har hvidvin: hæld et lille skvæt direkte på pletten, dup op.",
      "Drys et tykt lag salt eller natron over og lad det suge i 10 minutter.",
      "Skyl igen i koldt vand inden vask."
    ]},
    { heading: "De 5 metoder der virker", paragraphs: [
      "Mange råd på nettet er hjemmesnakkede. Her er metoderne der faktisk dokumenteret virker — testet på bomuld og bordtekstil i 2026."
    ], ordered: [
      "Brintoverilte (3%) + opvaskemiddel: bland 1:1, gnid forsigtigt ind, lad virke 30 min, vask som normalt. Bedst på hvidt og lyst.",
      "Galdesæbe: gnubbes ind, lad virke 15–30 min, vask. Virker også på indtørrede pletter.",
      "Natron + koldt vand til pasta: smør over, lad tørre, børst af. Bedst på møbler og tæpper.",
      "Hvidvin + salt: gammel klassiker, kun fersk plet, kun naturmaterialer.",
      "Kogende vand fra højde (60–80 cm): kun bomuld og hør, spænd stoffet over en skål."
    ]},
    { heading: "Tøj du IKKE skal bruge varmt vand på", list: [
      "Uld — krymper og filter.",
      "Silke — farverne løber.",
      "Acetat/viskose — fibrene kollapser.",
      "Alt med pailletter, broderi eller print."
    ]},
    { heading: "Hvis pletten er gammel", paragraphs: [
      "Læg tøjet i blød i lunken vand (30°) med 4 spsk brintoverilte (3%) + 2 spsk opvaskemiddel pr. liter vand. Lad det stå 1–4 timer afhængigt af pletten. Vask derefter på højst tilladte program.",
      "På uld og silke: gå direkte til kemisk rens. Hjemmebehandling ødelægger typisk fibrene."
    ]},
  ]
});

export default Post;
