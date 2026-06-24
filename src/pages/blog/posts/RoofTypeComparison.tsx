import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "skifte-tag-sammenligning-tegl-staal-eternit",
  keywords: "nyt tag sammenligning, tegl vs stål tag, eternit udskift, tagsten pris m2, tagstål pris, ny tagtype valg, taglevetid materialer",
  faq: [
    { q: "Hvilket tag holder længst?", a: "Tegltag: 80–120 år. Skifertag: 100+ år. Tagstål med pulverlak: 50–70 år. Tagpap: 25–35 år. Bølgeeternit (skal udskiftes ved asbest): nye fibercementplader holder 40–60 år." },
    { q: "Hvad koster forskellige tagtyper på et 140 m² parcelhus?", a: "Tegltag (læggers): 350.000–520.000 kr. Tagsten betonbaseret: 250.000–380.000 kr. Tagstål: 220.000–340.000 kr. Tagpap (med opstand): 180.000–280.000 kr. Inkl. nedrivning, lægter, undertag, montering og moms." },
    { q: "Skal taget skiftes hvis der er asbest i den gamle bølgeeternit?", a: "Ikke automatisk. Intakte bølgeeternit-plader er ikke akut farlige. MEN ved den mindste reparation eller renovering bør det skiftes — og forsikring afviser ofte skader på asbestbølgetag." },
  ],
  sections: [
    { paragraphs: ["Et nyt tag er typisk husets dyreste enkeltinvestering — og den varer i 30–100 år. Lær forskellene mellem materialer, hvad det koster, og hvilke faldgruber der typisk koster 30.000–80.000 kr. ekstra."] },
    { heading: "Sammenligning — 6 mest brugte tagtyper", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Pris/m²</th><th className="px-4 py-3">Levetid</th><th className="px-4 py-3">Vedligehold</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Tegltag</td><td className="px-4 py-3">2.500–3.700 kr.</td><td className="px-4 py-3">80–120 år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Betontagsten</td><td className="px-4 py-3">1.800–2.700 kr.</td><td className="px-4 py-3">50–70 år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Tagstål</td><td className="px-4 py-3">1.600–2.400 kr.</td><td className="px-4 py-3">50–70 år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Tagpap (med opstand)</td><td className="px-4 py-3">1.300–2.000 kr.</td><td className="px-4 py-3">25–35 år</td><td className="px-4 py-3">Mellem</td></tr>
            <tr><td className="px-4 py-3">Fibercement (asbestfri)</td><td className="px-4 py-3">1.700–2.500 kr.</td><td className="px-4 py-3">40–60 år</td><td className="px-4 py-3">Lavt</td></tr>
            <tr><td className="px-4 py-3">Skifertag</td><td className="px-4 py-3">3.500–6.000 kr.</td><td className="px-4 py-3">100+ år</td><td className="px-4 py-3">Lavt</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Sådan vælger du", ordered: [
      "Tjek lokalplan — nogle områder kræver tegl eller bestemte farver.",
      "Vurder taghældning — under 14° udelukker tegl og betontagsten.",
      "Beregn totaløkonomi over 30 år (anskaffelse + vedligehold).",
      "Tjek husets statik — tegltag vejer 2–3× mere end stål.",
      "Husk undertag, lægter, tagrender og inddækning i prisen.",
    ] },
    { heading: "Faldgruber", list: [
      "Glemmer at undertag og lægter SKAL skiftes samtidig",
      "Køber billigste tagstål uden pulverlakering — ruster på 15 år",
      "Vælger materiale på pris uden at se på samlet livstidsomkostning",
      "Indhenter kun 1 tilbud — pris-variation 30–50% på samme opgave",
      "Skipper energirenovering (isolering) samtidig — dobbelt arbejde senere",
    ] },
    { heading: "Bonus — kombinér med solceller", paragraphs: ["Står du foran tagudskift OG overvejer solceller? Lav begge dele samtidig. Det sparer 25.000–60.000 kr. i ekstra arbejde og giver bedre integration. Tagsten med integreret solcelle (\"solcelletag\") er ofte 30–50% dyrere end traditionel solcelle + tag separat."] },
  ],
});
