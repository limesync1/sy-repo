import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-helphelper",
  keywords: "serviceydere vs helphelper, helphelper alternativ, rengøring platform",
  faq: [
    { q: "Hvad tilbyder Helphelper?", a: "Helphelper er en mindre platform med fokus på fleksible enkeltopgaver — fx flyttehjælp, samling af møbler og småopgaver i hjemmet." },
    { q: "Hvorfor vælge Serviceydere i stedet?", a: "Bredere dækning (9 kategorier vs. småopgaver), CVR-krav til firmaer, fast pris frem for timepris, og 3–5 konkurrerende tilbud pr. opgave." },
    { q: "Er der overlap?", a: "Ja — på handyman-segmentet. Men Serviceydere har også maler, VVS, elektriker, tømrer og specialiserede haveservice-firmaer der ikke findes på Helphelper." },
    { q: "Hvad med forsikring?", a: "Alle firmaer på Serviceydere har dokumenteret ansvarsforsikring. Hos Helphelper er det op til den enkelte hjælper at have dette." },
  ],
  sections: [
    { heading: "De vigtigste forskelle", list: [
      "Firmaer: Serviceydere kun CVR-registrerede. Helphelper også privatpersoner.",
      "Forsikring: Krav hos Serviceydere, valgfrit hos Helphelper.",
      "Pristype: Fast pris-tilbud vs. timepris.",
      "Specialopgaver: Serviceydere har certificerede VVS/el. Helphelper ikke.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-platform-til-haandvaerkertilbud-2026">Oversigt: bedste platform til tilbud i 2026</a>,
      <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
      <a href="/blog/diy-vs-haandvaerker">DIY vs. håndværker</a>,
      <a href="/priser/rengoering">Rengøring prisguide</a>,
    ]},
  ],
});
export default Post;