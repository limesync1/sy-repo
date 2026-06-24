import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "privat-vs-firma-rengoering",
  keywords: "privat vs firma rengøring, sort arbejde rengøring, rengøringsfirma vs privat",
  faq: [
    { q: "Hvor stor er prisforskellen?", a: "Privat (sort) 100–150 kr./time. Firma 250–450 kr./time inkl. moms. Efter BoligJob-fradrag (37%) er firma 160–285 kr./time — kun 50–150 kr. dyrere." },
    { q: "Er det lovligt at hyre privat sort?", a: "Nej. SKAT betragter det som sort arbejde og både du og hjælperen kan straffes. Du mister også BoligJob-fradraget og forsikringsdækning." },
    { q: "Hvad med forsikring?", a: "Sker der skader på dit hjem eller personskade, dækker din indboforsikring sjældent ved sort arbejde. Firmaer har lovpligtig ansvarsforsikring." },
    { q: "Hvad med kvalitet?", a: "Firmaer leverer typisk standardiseret kvalitet med tjeklister, mens en privat hjælper er mere variabel — godt eller dårligt afhængigt af personen." },
  ],
  sections: [
    { heading: "Reel prisforskel efter fradrag", list: [
      "Privat sort: 100–150 kr./time, intet fradrag.",
      "Firma: 250–450 kr./time inkl. moms.",
      "Firma efter 37% BoligJob: 160–285 kr./time.",
      "Reel merpris: 50–150 kr./time — typisk 1.000–2.500 kr. pr. år i forskel.",
    ]},
    { heading: "Hvad du mister ved sort arbejde", list: [
      "BoligJob-fradraget (op til 12.300 kr./voksen).",
      "Ansvarsforsikring ved skader.",
      "Erstatningskrav ved tyveri.",
      "Bøder fra SKAT på 100% af løn.",
    ]},
    { heading: "Anbefaling", paragraphs: [
      "Den reelle prisforskel er minimal efter fradrag, og risikoen for sort arbejde er ikke værd at tage. Vælg altid et CVR-registreret firma med dokumenteret forsikring.",
    ]},
    { heading: "Læs også", list: [
      <a href="/guides/servicefradrag-2026">Servicefradrag 2026 guide</a>,
      <a href="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du rengøringsfirma</a>,
      <a href="/priser/rengoering">Rengøring prisguide 2026</a>,
    ]},
  ],
});
export default Post;