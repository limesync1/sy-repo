import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rens-af-sofa-stof-laeder-microfiber",
  keywords: "rens sofa, rengøring sofa, læder sofa, microfiber, pletter sofa",
  faq: [
    { q: "Kan man vaske sofabetræk i maskine?", a: "Kun hvis producenten siger det (tjek mærket: W = vand, S = solvent, WS = begge, X = kun støvsug). Vask altid kølig og uden centrifugering." },
    { q: "Hvad er bedst på en stofsofa?", a: "Damprenser hvis stoffet tåler det. Ellers: skum-rens med rengøringsmiddel + brintoverilte, dup på, lad tørre, støvsug." },
    { q: "Hvordan renser jeg en lædersofa?", a: "Tør med fugtig (ikke våd) klud + neutral sæbe, derefter læderbalsam hver 3.–6. måned. Aldrig sprit, eddike eller ammoniak." },
    { q: "Mikrofiber-sofa med pletter?", a: "Brug ren sprit (isopropanol) på blød svamp, gnid forsigtigt, lad tørre. Børst med tør børste når den er tør — det rejser fibrene." },
    { q: "Hvor ofte skal en sofa renses?", a: "Støvsug ugentligt. Dybderens 1–2× årligt. Læderpleje hver 3.–6. måned. Pletrens straks." },
  ],
  sections: [
    { heading: "Find ud af hvad din sofa tåler", paragraphs: [
      "Inden du gør noget: tjek mærket under en hynde eller på en flap. Bogstaverne er afgørende:",
    ], list: [
      "W = vand-baseret rensning OK.",
      "S = kun solvent-baseret (kemikalier som perchlorethylen).",
      "WS = begge OK.",
      "X = kun støvsug og let børstning — aldrig vand eller solvent.",
    ]},
    { heading: "Stofsofa — ugentlig + årlig", ordered: [
      "Støvsug grundigt med møbel-mundstykke, også under hynder og ind i sprækker.",
      "Pletbehandl friske pletter straks (se Plet-tabel).",
      "1–2× årligt: damprens eller skumrens hele sofaen.",
      "Lad tørre 4–12 timer med god udluftning.",
    ]},
    { heading: "Lædersofa", ordered: [
      "Støvsug med blødt mundstykke.",
      "Tør med blød klud fugtet i lunken vand med lidt neutral sæbe.",
      "Tør efter med tør klud.",
      "Hver 3.–6. måned: påfør læderbalsam eller -creme.",
      "Undgå direkte sollys — udtørrer og afblegere lædret.",
    ]},
    { heading: "Mikrofiber-sofa", ordered: [
      "Støvsug ugentligt med blødt mundstykke.",
      "Pletter: ren sprit på blød svamp, gnid forsigtigt.",
      "Lad tørre helt (10–30 min).",
      "Børst med tør børste — det rejser fibrene og fjerner sprit-skygger.",
    ]},
    { heading: "Plet-tabel", list: [
      "Kaffe/te: dup op, koldt vand + lidt opvaskemiddel.",
      "Rødvin: dup op, natronpasta, lad tørre, støvsug.",
      "Fedt/olie: drys talkum/maizena, lad suge 15 min, børst af, dup med opvaskemiddel.",
      "Kuglepen: lidt sprit på vatpind (kun stof — IKKE læder).",
      "Tyggegummi: ispose ovenpå, skrab af når frosset.",
    ]},
  ]
});

export default Post;
