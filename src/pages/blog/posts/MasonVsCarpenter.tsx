import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "mason-vs-tomrer",
  keywords: "murer vs tømrer, forskel murer tømrer, hvilken håndværker til opgaven",
  faq: [
    { q: "Hvornår murer, hvornår tømrer?", a: "Murer arbejder med sten, mursten, fliser, fundament, puds. Tømrer med træ — tag, gulv, vægge i træ, terrasser." },
    { q: "Hvem laver et badeværelse?", a: "Begge dele. Murer/fliselægger sætter fliser. Tømrer laver lette vægge, lofter og evt. ombygning. Større renovering kræver typisk begge." },
    { q: "Skorsten — murer?", a: "Ja, en muret skorsten er murerens fag. Stålskorsten kan tømrer/blikkenslager håndtere." },
  ],
  sections: [
    { heading: "Murer — kerneopgaver", list: [
      "Opmuring af vægge og facader.",
      "Fliselægning på vægge og gulve.",
      "Pudsearbejde og spartling.",
      "Fundament og kælder-renovering.",
      "Skorstene og pejse.",
    ]},
    { heading: "Tømrer — kerneopgaver", list: [
      "Tag- og spærarbejde.",
      "Trægulve.",
      "Letvægge og lofter.",
      "Terrasser, carport, skure.",
    ]},
    { heading: "Læs også", list: [
      <a href="/priser/murer">Murer prisguide 2026</a>,
      <a href="/priser/tomrer">Tømrer prisguide 2026</a>,
      <a href="/blog/tomrer-vs-snedker">Tømrer vs. snedker</a>,
    ]},
  ],
});
export default Post;