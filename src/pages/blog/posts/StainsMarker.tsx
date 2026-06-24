import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fjern-tuschpletter-fra-toej",
  keywords: "fjern tusch fra tøj, sprittusch tøj, vandbaseret tusch, kuglepen tøj, fjernelse af tusch, whiteboard tusch, permanent tusch tøj",
  faq: [
    { q: "Kan jeg redde tøj med permanent tusch?", a: "Ja — hvis du handler hurtigt. Sprit, acetone eller hårspray opløser sprittusch hvis pletten er frisk. Når den er vasket på 60 °C er chancen meget lille." },
    { q: "Hvad gør jeg med tusch på silke eller uld?", a: "Brug kun glycerin og lunkent vand — eller send det til renseri. Sprit og acetone ødelægger naturfibre." },
    { q: "Hvilken sprit virker bedst?", a: "Husholdningssprit 70 % eller isopropanol 99 %. Begge fås på apoteket. Isopropanol er stærkere og fordamper hurtigere." },
    { q: "Kan jeg bruge mælk?", a: "Ja, til kuglepen — proteinerne i mælk binder blækket. Læg tøjet i blød i kold mælk i 30 minutter, skyl og vask." },
  ],
  sections: [
    { paragraphs: [
      "Den rigtige metode afhænger fuldstændigt af hvilken slags tusch — og hvilket stof. Det største nybegynderfejl er at bruge sprit på vandbaseret tusch (binder pigmentet endnu mere) eller varmt vand på permanent (fikserer den). Identificér tuschtypen først.",
    ] },
    { heading: "Sprittusch / permanent tusch", ordered: [
      "Læg en ren klud under pletten så blækket har et sted at vandre hen.",
      "Dyp en vatpind i isopropanol (99 %) eller husholdningssprit (70 %).",
      "Dup — tryk aldrig — pletten udefra og ind. Skift klud under når den bliver farvet.",
      "Gentag til der ikke kommer mere farve på vatten.",
      "Vask som normalt ved 30–40 °C.",
    ] },
    { heading: "Vandbaseret tusch (whiteboard, malertusch)", paragraphs: [
      "Brug aldrig sprit — det binder pigmentet. Læg pletten under koldt rindende vand med tilsat 1 spsk opvaskemiddel, gnid stoffet mod sig selv og vask ved 40 °C med iltbleg.",
    ] },
    { heading: "Kuglepen", list: [
      "Frisk plet: Mælk i 30 min, derefter vask",
      "Indtørret plet: Hårspray eller sprit (test først), dup, vask",
      "Stor plet: Glycerin i 1 time, så opvaskemiddel direkte på pletten, vask",
    ] },
    { heading: "Whiteboard-tusch på tæppe", paragraphs: [
      "Skum carpet-spray eller en blanding af 1 spsk eddike + 1 spsk opvaskemiddel + 2 dl vand. Dup, lad virke 10 minutter, dup op med tør klud. Gentag.",
    ] },
    { heading: "Specialstoffer", list: [
      "Silke / uld: kun glycerin og lunkent vand — eller renseri",
      "Læder: speciel læderrens eller en lille smule mild sæbe + vand",
      "Hørtøj: kogning med iltbleg (kun hvidt)",
    ] },
    { heading: "Det skal du undgå", list: [
      "Tørretumbler eller strygejern inden pletten er væk",
      "Klor — gør permanent tusch grå/lilla",
      "At gnide — spreder pletten",
      "Acetone på acetat, polyester eller modal — opløser fiberen",
    ] },
  ],
});