import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "klargoer-haven-til-vinter",
  keywords: "klargør have vinter, vinterklargøring have, frostsikring, efterårs tjekliste have",
  faq: [
    { q: "Hvornår skal haven vinterklargøres?", a: "Slut oktober til medio november — inden første nattefrost. Vand i rør og udendørs haner skal tømmes inden temperaturen kommer under 0 °C." },
    { q: "Hvad sker der hvis jeg ikke gør det?", a: "Frostskadede vandrør (5.000–15.000 kr.), dræbte buske, frosne havemøbler, ødelagte redskaber, oversvømmet kælder fra tilstoppede tagrender." },
    { q: "Skal plænen klippes en sidste gang?", a: "Ja — kort (3–4 cm) inden den lægger sig i dvale. Lang græs giver svampesygdomme under sneen." },
    { q: "Hvad koster en gartner til vinterklargøring?", a: "1.800–4.500 kr. for typisk parcelhushave. BoligJob-berettiget — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Vand og frostsikring (kritisk)", list: [
      "Luk for udendørs vand fra indvendig stophane.",
      "Åbn udendørs haner så restvandet kan løbe ud.",
      "Tøm haveslanger helt og rul dem ind.",
      "Tøm regnvandstønder eller dræk dem under 1/3.",
      "Tjek at brønddæksler ikke står fyldt med blade.",
    ]},
    { heading: "Plæne og bede", list: [
      "Klip plænen sidste gang (3–4 cm).",
      "Riv blade af — kompostér eller læg under buske.",
      "Pluk visne bær og frugter fra træer (forhindrer svamp).",
      "Beskær frugttræer ikke nu — vent til februar.",
      "Læg ekstra muld om frostfølsomme planter.",
    ]},
    { heading: "Terrasse og møbler", list: [
      "Vask havemøbler, dæk til eller læg i skur.",
      "Tøm puder ind — ellers mug.",
      "Olie træterrasse efter vask.",
      "Pak grill og parasol væk.",
    ]},
    { heading: "Redskaber og maskiner", list: [
      "Tøm benzin ud af plæneklipper og hækkeklipper.",
      "Slib og oliér have-saks og -greb.",
      "Sørg for tørt opbevaring (rust).",
      "Tjek snerydningsudstyr — er det klar til frost?",
    ]},
    { heading: "Tag og tagrender", list: [
      "Rens tagrender for blade.",
      "Tjek nedløb løber frit.",
      "Se efter løse tagsten efter efterårsstorme.",
    ]},
  ],
});

export default Post;