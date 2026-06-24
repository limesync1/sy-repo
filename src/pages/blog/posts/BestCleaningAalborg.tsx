import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "bedste-rengoeringsfirma-aalborg-2026",
  keywords: "bedste rengøringsfirma aalborg, top rengøring aalborg, anbefalet rengøring aalborg 2026",
  faq: [
    { q: "Hvad er prisniveau i Aalborg?", a: "235–375 kr./time inkl. moms — landets laveste blandt de fire største byer. Fast besøg 470–770 kr. for 90 m² hver 14. dag." },
    { q: "Dækker firmaerne også Nørresundby og oplandet?", a: "Ja — typisk uden ekstra kørsel for Hasseris, Vejgaard, Nørresundby. Vodskov og Aalborg Øst kan have et lille tillæg." },
    { q: "Hvad med vinterrengøring?", a: "Mange Aalborg-firmaer kombinerer rengøring med snerydning på samme abonnement — særligt smart i Nordjyllands lange vintersæson." },
  ],
  sections: [
    { heading: "Det bedste firma — kriterier", list: [
      "CVR, forsikring og min. 4,3/5 rating.",
      "Lokalt kendskab (Vejgaard, Hasseris).",
      "Fast personale med dansk-/engelsk-talende.",
      "Tilbyder kombinationsaftaler (rengøring + vinduer).",
    ]},
    { heading: "Aalborg-priser", list: [
      "Lejlighed 80 m² hver 14. dag: 470–720 kr.",
      "Villa Hasseris 150 m² ugentligt: 700–1.100 kr.",
      "Flytterengøring 100 m²: 1.995–3.495 kr.",
    ]},
    { heading: "Læs også", list: [
      <a href="/rengoering/aalborg">Rengøring i Aalborg — find firmaer</a>,
      <a href="/blog/bedste-rengoeringsfirma-odense-2026">Bedste i Odense</a>,
      <a href="/priser/rengoering">Rengøring prisguide 2026</a>,
    ]},
  ],
});
export default Post;