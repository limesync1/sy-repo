import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "radiator-virker-ikke-fejlfinding",
  keywords: "radiator bliver ikke varm, udluft radiator, defekt termostat, fejlfinding varme",
  faq: [
    { q: "Hvad er den hyppigste årsag?", a: "Luft i radiatoren. Det er gratis at fjerne — tag 5 min med udluftningsnøgle og spand." },
    { q: "Min radiator er varm i bunden, kold i toppen — hvorfor?", a: "Klassisk tegn på luft i toppen. Udluft fra ventilen øverst på radiatoren." },
    { q: "Min radiator er kold i bunden, varm i toppen?", a: "Slam eller snavs i systemet. Kræver gennemskylning af VVS — ikke noget du selv fikser." },
    { q: "Termostaten kan ikke drejes — hvad nu?", a: "Den er gået fast. Tag selve termostat-hovedet af, tryk forsigtigt ind på pinnen med en tang — den skulle springe ud." },
  ],
  sections: [
    { heading: "Tjekliste — fejlfinding på 10 min", ordered: [
      "Står termostaten på mere end 3?",
      "Er rummets vinduer åbne (termostaten registrerer kuld)?",
      "Er der trykfald på fyret (under 1 bar)? Påfyld vand.",
      "Luft i radiator — udluft.",
      "Termostat-pin fast — løsn den.",
      "Cirkulationspumpe brummer ikke — ring VVS.",
    ]},
    { heading: "Sådan udlufter du radiatoren", ordered: [
      "Sluk cirkulationspumpen 10 min før (kun hvis du kan).",
      "Hold spand og klud under udluftningsventilen.",
      "Drej ventilen 1/2 omgang mod uret.",
      "Vent til der kun kommer vand (ikke luft) ud.",
      "Luk ventilen.",
      "Tjek trykket på fyret — påfyld om nødvendigt til 1,2–1,5 bar.",
    ]},
    { heading: "Når VVS skal tilkaldes", list: [
      "Slam i bunden (kold bund, varm top).",
      "Brummende eller stoppet cirkulationspumpe.",
      "Tryk på fyr falder konstant.",
      "Lugt af brændt olie/gas ved fyret.",
      "Hele huset koldt selv ved fuld termostat.",
    ]},
    { heading: "Forebyggelse", list: [
      "Udluft alle radiatorer 1× årligt (efterår).",
      "Tjek vandtryk på fyret hvert kvartal.",
      "Få VVS-tjek hvert 2.–3. år.",
      "Skift slidte termostater (over 15 år).",
    ]},
  ],
});

export default Post;