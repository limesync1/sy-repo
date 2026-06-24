import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "vinduespudser-vs-selv",
  keywords: "vinduespudser vs selv, kan jeg pudse vinduer selv, hvad koster vinduespudser",
  faq: [
    { q: "Hvor meget tid sparer en vinduespudser?", a: "Et almindeligt parcelhus (25 vinduer) tager 4–6 timer selv. Vinduespudser klarer det på 1–1,5 time pga. specialudstyr (vandstang, deioniseret vand)." },
    { q: "Hvor meget billigere er det at gøre det selv?", a: "Udstyr koster 200–800 kr. engangsudgift. Vinduespudser koster 595–1.495 kr. pr. besøg afhængigt af antal vinduer." },
    { q: "Kan jeg få samme resultat selv?", a: "Sjældent — professionelt udstyr (vandstang med ren-vand-system) efterlader stribefri vinduer uden eftertørring. Det er svært at matche manuelt." },
    { q: "Hvad med ovenlys og 1. sal?", a: "Brug altid professionel for vinduer over 3 meters højde. Faldulykker er den hyppigste boligulykke." },
  ],
  sections: [
    { heading: "DIY — fordele og ulemper", list: [
      "+ Ingen ventetid, du gør det når det passer.",
      "+ Lav engangsudgift til udstyr.",
      "− Tager 4–6× så lang tid.",
      "− Risiko ved 1. sal og ovenlys.",
      "− Sjældent helt stribefrit resultat.",
    ]},
    { heading: "Vinduespudser — fordele og ulemper", list: [
      "+ Professionelt, stribefrit resultat.",
      "+ Sikker adgang til alle vinduer.",
      "+ BoligJob-fradragsberettiget.",
      "− Pris 595–1.495 kr. pr. besøg.",
      "− Kræver booking i forvejen.",
    ]},
    { heading: "Den smarte mellemvej", paragraphs: [
      "Kombinér: vinduespudser 2–3× årligt udvendigt (forår, sommer, efterår) + DIY indvendigt. Det giver bedste pris/kvalitet-forhold.",
    ]},
    { heading: "Læs også", list: [
      <a href="/priser/vinduespudser">Vinduespudser prisguide 2026</a>,
      <a href="/blog/vinduespudser-villa-pris-2026">Vinduespudser pris for villa</a>,
      <a href="/blog/robotstoevsuger-vs-rengoeringshjaelp">Robotstøvsuger vs. rengøringshjælp</a>,
    ]},
  ],
});
export default Post;