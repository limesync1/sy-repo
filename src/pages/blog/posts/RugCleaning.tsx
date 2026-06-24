import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rens-af-taepper-og-gulvtaepper",
  keywords: "rens tæppe, rengøring tæpper, gulvtæppe, pletter, rens uldtæppe",
  faq: [
    { q: "Kan jeg vaske et tæppe i maskine?", a: "Kun små tæpper, og kun hvis mærket tillader det. Skånevask, lav temperatur (30°), uden centrifugering. Læg fladt til tørre." },
    { q: "Hvordan renser jeg et stort uldtæppe?", a: "Støvsug grundigt, pletbehandl, og overvej professionel tæpperens 1× årligt. Hjemme: damprens kun hvis mærket tillader det." },
    { q: "Hvad gør jeg ved en rødvinsplet på tæppet?", a: "Dup op straks med klud (gnid IKKE), skyl med koldt vand, derefter natronpasta. Lad tørre, støvsug af." },
    { q: "Hvor ofte skal et tæppe støvsuges?", a: "1–2× ugentligt i normalt brugte rum, daglig i entré og under spisebord. Vendes/roteres hver 3. måned." },
    { q: "Lugter tæppet af kæledyr?", a: "Drys natron tykt over, lad ligge 8+ timer, støvsug. Gentag op til 3×. Hvis det stadig lugter: brug enzymrens specifik til kæledyrslugt." },
  ],
  sections: [
    { heading: "Ugentlig vedligehold", ordered: [
      "Støvsug i flere retninger — det fanger mere snavs.",
      "Vend tæppet hver 3. måned for jævn slidtage.",
      "Behandl pletter inden for 5 min.",
    ]},
    { heading: "Pletbehandling — generel metode", ordered: [
      "Dup op overskydende væske med ren klud.",
      "Skyl pletten med koldt vand — sprøjt let, dup op.",
      "Påfør rengøringsmiddel passende til plet-typen.",
      "Dup ud udefra og ind, så pletten ikke breder sig.",
      "Tør med tør klud, lad lufttørre.",
    ]},
    { heading: "Dybderens hjemme", list: [
      "Damprenser: kun hvis tæppet tåler vand (uld, viskose ofte ikke).",
      "Skumrens fra spray: smør på, lad tørre, støvsug af.",
      "Natron: drys, lad ligge 8 timer, støvsug — fjerner lugt og let snavs.",
    ]},
    { heading: "Hvornår skal du ringe efter en professionel?", list: [
      "Uld-, silke- eller orientalske tæpper.",
      "Gamle eller dyre tæpper med risiko for farvelækage.",
      "Vandskade eller skimmel.",
      "Pletter du ikke kan få ud efter 2 forsøg.",
    ]},
  ]
});

export default Post;
