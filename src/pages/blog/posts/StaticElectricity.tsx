import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "statisk-elektricitet-i-toej-loesninger",
  keywords: "statisk elektricitet tøj, antistatisk spray, tøj klistrer, statisk efter tørretumbler, balsam tøj, syntetiske stoffer statisk",
  faq: [
    { q: "Hvorfor klistrer mit tøj?", a: "Syntetiske fibre (polyester, akryl, nylon) gnider mod hinanden i tørretumbleren og opbygger statisk ladning. Lufttørt vejr forværrer det." },
    { q: "Virker hårspray?", a: "Ja — kort tid. En let sprøjt på indersiden neutraliserer ladningen i nogle timer. Brug sparsomt på lyse stoffer." },
    { q: "Kan jeg forhindre det helt?", a: "Lufttør syntetisk tøj i stedet for tumbling. Bland naturfibre og syntet i samme tumblerladning. Tilsæt 1 dl eddike i sidste skyl." },
  ],
  sections: [
    { paragraphs: ["Statisk elektricitet opstår når elektronstrømmen fra fiber til fiber bliver ubalanceret. Løsningen er enten at undgå ladningen, neutralisere den, eller skabe et fugtlag der leder den væk."] },
    { heading: "Hjemmelavet antistatisk spray", list: [
      "2 dl vand",
      "1 spsk skyllebalsam",
      "5 dråber æterisk olie (valgfrit, mod lugten)",
      "Hæld i sprayflaske, ryst, sprøjt let på indersiden af tøjet.",
    ] },
    { heading: "Forebyggelse i vaskerummet", list: [
      "Tilsæt 1 dl hvid eddike i sidste skyl",
      "Brug uld-tørrekugler i tumbleren — reducerer statik med 50 %",
      "Tør syntetisk tøj på lav varme i kortere tid",
      "Bland naturfibre og syntetisk i samme ladning",
    ] },
    { heading: "Akutte tricks", ordered: [
      "Gnid en metal-bøjle ned langs stoffet — leder ladningen væk.",
      "Spray hårspray let på inderside.",
      "Fugt hænderne, stryg ned langs tøjet.",
      "Hæng tøjet på et fugtigt badeværelse i 10 minutter.",
    ] },
    { heading: "Møbler og tæpper", paragraphs: [
      "Brug humidifier i stuen om vinteren — relativ luftfugtighed over 40 % stopper det meste statik. Spray syntetiske tæpper let med antistatisk spray.",
    ] },
  ],
});