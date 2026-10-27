import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "faste-ruter-vinduespudser",
  keywords: "vinduespudser rute, faste ruter vinduespudser, program til vinduespudser, ruteplanlægning vinduespudser, vinduesrute interval",
  faq: [
    { q: "Hvilket interval er mest almindeligt?", a: "Hver 4., 6. eller 8. uge for private og hver 2.–4. uge for butikker. Hold dig til få intervaller, så ruterne er nemme at samle." },
    { q: "Hvad gør jeg, når det regner?", a: "Flyt hele dagen frem i stedet for enkelte kunder. Så holder ruten sammen, og intervallet regnes videre fra den nye dato." },
  ],
  sections: [
    { paragraphs: [
      "En vinduesrute er et puslespil, der skal gå op igen og igen. Bygger du den rigtigt fra start, fylder den kalenderen af sig selv.",
    ] },
    { heading: "Vælg få intervaller", paragraphs: [
      "Tilbyd fx kun 4 og 8 uger. Så kan en 8-ugers kunde ligge på samme rute som 4-ugers kunderne hver anden gang.",
    ] },
    { heading: "Byg ruten efter område", list: [
      "Én rute pr. område eller by, fx \"Herning Nord\".",
      "Butikker og private i samme område på samme rute.",
      "Navngiv ruten, så alle ved, hvor den kører.",
    ] },
    { heading: "Hold ruten i live", list: [
      "Næste besøg skal oprettes automatisk, når det forrige er udført.",
      "Nye kunder lægges på den rute, der allerede kører forbi.",
      "Flyt hele ruten ved regnvejr — ikke enkelte kunder.",
      "Se tidsforbruget pr. kunde og justér prisen, hvis den altid tager længere.",
    ] },
    { heading: "Skift fra et gammelt system", paragraphs: [
      "Har du kunder i et andet program eller regneark, kan de importeres med rute, interval og pris, så du ikke starter forfra.",
    ] },
    { body: <TrialNote /> },
  ],
});
