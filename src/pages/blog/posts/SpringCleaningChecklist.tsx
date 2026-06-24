import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "tjekliste-hovedrengoering-foraar",
  keywords: "hovedrengøring forår, foraarsrengoering tjekliste, dybderens hjem, rengøring rum for rum",
  faq: [
    { q: "Hvor lang tid tager en hovedrengøring?", a: "90 m² bolig: 8–14 timer for 1 person eller 1 dag for 2 personer. Rengøringsfirma: 4–7 timer for et hold." },
    { q: "Hvad koster en professionel hovedrengøring?", a: "85–145 kr./m² inkl. moms — eller 2.700–5.500 kr. for en 90 m² bolig. BoligJob-berettiget." },
    { q: "Hvilken rækkefølge skal jeg gøre det i?", a: "Altid top-til-bund og bagest-til-yderst. Lofter → vægge → vinduer → møbler → gulve. Et rum ad gangen." },
    { q: "Hvor ofte skal hovedrengøring?", a: "Forår (marts–april) og efterår (oktober). Lette dybderens hver 3.–4. måned holder hovedrengøringen lettere." },
  ],
  sections: [
    { heading: "Køkken (60–90 min)", list: [
      "Ovn — pyrolyse eller specialrens.",
      "Emhætte og filter — opvaskemaskine.",
      "Køleskab tømmes, vaskes, ny natron i bunden.",
      "Vandhane afkalkes.",
      "Skabe tømmes, tørres af top og bund.",
      "Lofter og overskabe for fedt.",
      "Gulv vaskes, lister tørres af.",
    ]},
    { heading: "Badeværelse (45–75 min)", list: [
      "Afkalkning af vandhane, bruser, glasvægge.",
      "Fuger skrubbes, skimmel behandles.",
      "Toilet — også bag og under.",
      "Spejl, lamper, ventilation støvsuges.",
      "Underskab tørres af, gulv vaskes.",
    ]},
    { heading: "Stue og soveværelse (60 min pr. rum)", list: [
      "Lofter og lister støvsuges.",
      "Vinduer pudses ud + ind, karme tørres.",
      "Sofa/madras støvsuges + plet-renses.",
      "Bag og under møbler.",
      "Lamper, billeder, paneler.",
      "Gulv — vaskes eller plejes.",
    ]},
    { heading: "Glemte zoner (30–45 min)", list: [
      "Bag køleskab, vaskemaskine, tørretumbler.",
      "Ventilationsrister og udsugning.",
      "Indgangsdør og dørkarm udvendigt.",
      "Postkasse, dørhåndtag, lyskontakter.",
      "Altan, terrasse, havemøbler.",
      "Kælderrum og loft — støvsugning + gulv.",
    ]},
  ],
});

export default Post;