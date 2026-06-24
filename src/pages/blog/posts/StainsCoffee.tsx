import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fjern-kaffepletter-fra-toej",
  keywords: "kaffepletter, fjern kaffe, plet, vask, rengøring",
  faq: [
    { q: "Hvor hurtigt skal jeg være med en kaffeplet?", a: "Helst inden for 5 minutter. Friske kaffepletter kan ofte skylles helt ud med koldt vand alene. Efter 1 time begynder tanniner at binde sig til fibrene." },
    { q: "Virker mælkekaffe og sort kaffe ens?", a: "Nej — mælkekaffe har også fedt, så brug opvaskemiddel. Sort kaffe behandles primært med koldt vand og blødgøring (brintoverilte)." },
    { q: "Hvad med kaffepletter på tøj efter vask og tørretumbler?", a: "Tørretumbleren fikserer pletten. Læg tøjet i blød 2 timer i brintoverilte + opvaskemiddel, og prøv at vaske igen — men vær forberedt på at den måske ikke går helt af." },
    { q: "Kan man fjerne kaffepletter fra lyse møbler?", a: "Ja: dup op straks, lav natronpasta (3:1 natron:vand), smør på, lad tørre 30 min, støvsug. Følg op med en fugtig mikrofiberklud." },
    { q: "Hvilken vasketemperatur?", a: "60° på bomuld, 30–40° på syntetisk. Højere temperatur giver bedre resultat på rene kaffepletter — men ikke på blandinger med mælk eller sukker." },
  ],
  sections: [
    { heading: "Sådan fjerner du friske kaffepletter", ordered: [
      "Dup pletten op med ren klud — gnid ikke.",
      "Skyl bagfra med koldt vand.",
      "Hvis kaffen havde mælk: gnid lidt opvaskemiddel ind, lad virke 10 min.",
      "Vask som normalt på højst tilladte temperatur.",
      "Tjek pletten FØR du putter tøjet i tørretumbleren — varme fikserer rester."
    ]},
    { heading: "Sådan fjerner du gamle kaffepletter", ordered: [
      "Læg tøjet i blød i lunken vand med 3 spsk brintoverilte + 1 spsk opvaskemiddel pr. liter.",
      "Lad stå 1–3 timer.",
      "Gnid forsigtigt ind i pletten med en blød tandbørste.",
      "Vask på højest mulige temperatur for materialet."
    ]},
    { heading: "Det skal du undgå", list: [
      "Varmt vand på friske pletter — fikserer farven.",
      "Tørretumbler før du ved pletten er væk.",
      "Salt: virker næsten ikke på kaffe.",
      "Klor på farvet tøj — bleger pletten OG stoffet."
    ]},
  ]
});

export default Post;
