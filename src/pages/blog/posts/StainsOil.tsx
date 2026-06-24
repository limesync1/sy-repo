import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fjern-olie-og-fedtpletter-fra-toej",
  keywords: "fjern olie tøj, fedtpletter, olieplet bukser, friturepletter, motorolie tøj, opvaskemiddel pletter, galdesæbe, talkum pletter",
  faq: [
    { q: "Hvorfor virker opvaskemiddel så godt på olie?", a: "Opvaskemiddel er designet til at nedbryde fedt på opvask. Det binder oliedråberne så vand kan skylle dem væk — også fra tøjfibre." },
    { q: "Kan jeg redde indtørrede oliepletter?", a: "Ja, men det kræver mere tid. Lad opvaskemiddel + lidt varmt vand virke 2–4 timer på pletten, gnid med tandbørste, vask ved 40–60 °C." },
    { q: "Hvad med motorolie?", a: "Motorolie kræver afspændings/koldaffedter (fx universaltørrens fra byggemarked). Dup på, lad virke 30 min, vask ved 60 °C." },
  ],
  sections: [
    { paragraphs: ["Olie og fedt skal nedbrydes — ikke skylles væk. Brug et middel der er surfaktant (binder fedt og vand)."] },
    { heading: "Friske pletter — 3 trin der altid virker", ordered: [
      "Drys talkum, majsstivelse eller kartoffelmel på pletten og lad det suge i 15 min.",
      "Børst pulveret af.",
      "Smør koncentreret opvaskemiddel direkte på, gnid blidt, vask ved 40 °C.",
    ] },
    { heading: "Indtørrede pletter", paragraphs: [
      "Bløde op først: bland 1 spsk opvaskemiddel + 1 spsk natron + lidt varmt vand til en pasta. Smør på, lad virke 2 timer, gnid med tandbørste, vask ved 60 °C hvis stoffet tåler det.",
    ] },
    { heading: "Specielle stoffer", list: [
      "Silke, uld: brun sæbe + lunkent vand, dup forsigtigt",
      "Læder: kalkstøv eller specielt læderaffedter",
      "Denim: opvaskemiddel + tandbørste — pas på falmning",
      "Polyester: opvaskemiddel virker, men gentag op til 3 gange",
    ] },
    { heading: "Galdesæbe — det klassiske middel", paragraphs: [
      "Galdesæbe (fra apoteket eller Matas) er en stærk pletfjerner til organiske pletter. Fugt pletten, gnid sæben ind, lad virke 30 min, vask som normalt. Virker også på blod, mad og sved.",
    ] },
    { heading: "Det skal du IKKE gøre", list: [
      "Tørretumble før pletten er væk: bager fedtet ind i stoffet",
      "Bruge varmt vand med det samme: fikserer pletten",
      "Bruge sæbe med skyllebalsam: skyllebalsam efterlader fedtfilm",
    ] },
  ],
});