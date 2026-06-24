import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fjern-blodpletter-fra-toej",
  keywords: "blodpletter, fjern blod, vask, rengøring, plet",
  faq: [
    { q: "Hvorfor må man ikke bruge varmt vand på blod?", a: "Blod indeholder proteiner der koagulerer ved 40°+ og binder sig til fibrene. Brug altid koldt vand på blodpletter — også gamle." },
    { q: "Virker brintoverilte på blod?", a: "Ja, fremragende. 3% brintoverilte direkte på pletten boble protein-bindingen op. Test først på en skjult plet — bleger let på farvet tøj." },
    { q: "Hvad med blodplet på en madras?", a: "Bland 2 spsk brintoverilte, 1 spsk opvaskemiddel og 1 tsk salt. Smør på pletten, lad virke 30 min, dup op med fugtig klud. Lad tørre helt før sengetøj på igen." },
    { q: "Kan man fjerne gamle, indtørrede blodpletter?", a: "Ja, men det kræver flere behandlinger. Læg i blød 2–4 timer i koldt vand + 4 spsk brintoverilte pr. liter, derefter vask på laveste tilladte temperatur." },
    { q: "Virker tørt salt?", a: "På friske pletter ja — drys et tykt lag salt over, lad det suge 15 min, ryst af, skyl koldt. Bedst på lyse stoffer." },
  ],
  sections: [
    { heading: "Førstehjælp — friske blodpletter", ordered: [
      "Brug iskoldt vand — aldrig varmt.",
      "Skyl bagfra gennem stoffet — ikke ind i.",
      "Drys salt eller maizena på, lad suge.",
      "Skyl, gnid lidt galdesæbe ind, vask koldt."
    ]},
    { heading: "Gamle eller indtørrede blodpletter", ordered: [
      "Læg i blød i koldt vand i 1–2 timer for at blødgøre.",
      "Tilsæt 4 spsk brintoverilte 3% pr. liter, lad stå yderligere 1 time.",
      "Gnid forsigtigt ind med tandbørste.",
      "Vask på 30°. Tjek inden tørretumbler."
    ]},
    { heading: "Specielle overflader", list: [
      "Madras: brintoverilte + opvaskemiddel + salt. Dup op, ikke våd.",
      "Sofa: kun lokalrens, ellers ringe i stoffet.",
      "Tæppe: koldt vand + ammoniak (1 tsk:0,5 l vand), skyl godt.",
      "Læder: tør op straks, undgå vand — brug læderrens."
    ]},
  ]
});

export default Post;
