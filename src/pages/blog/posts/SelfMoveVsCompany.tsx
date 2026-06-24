import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "selv-flytte-vs-flyttefirma",
  keywords: "selv flytte vs flyttefirma, pris flyttefirma, leje flyttebil, flytning sammenligning",
  faq: [
    { q: "Hvor meget kan jeg spare ved at flytte selv?", a: "2.000–8.000 kr. på en 2-værelses, 5.000–15.000 kr. på 3-værelses — hvis intet går i stykker og du har 3–4 hjælpere." },
    { q: "Hvad koster en flyttebil?", a: "Kassevogn 600–900 kr./dag. Stor flyttebil med lift 1.300–1.900 kr./dag inkl. 100 km og forsikring." },
    { q: "Er der forsikring ved selv-flytning?", a: "Nej — din indboforsikring dækker normalt IKKE skader under selvtransport. Et flyttefirma har eget transportansvar." },
    { q: "Hvornår betaler flyttefirma sig altid?", a: "Hvis du har piano/flygel, klaver, store skabe, marmor-borde, lavt depositum eller meget begrænset tid." },
  ],
  sections: [
    { heading: "Konkret regnestykke — 3-værelses (75 m²)", list: [
      "Flyttefirma: 6.500–11.000 kr. inkl. emballering.",
      "Selv: bil 1.500 kr. + emballage 700 kr. + 3 venner 4× pizza 1.000 kr. + 8 timer x 4 personer = 32 mandetimer.",
      "Sparet: ca. 4.000–8.000 kr. — men 1 dags arbejde for 4 personer.",
    ]},
    { heading: "Skjulte omkostninger ved selv-flytning", list: [
      "Skader på møbler — gennemsnitsskade 1.800 kr.",
      "Ridser i gulv/dørkarme — fraflytningskrav.",
      "Manglende forsikring.",
      "Risiko for ryg- og knæskader.",
    ]},
    { heading: "Hvornår selv-flytning giver mening", list: [
      "1–2 værelses uden tunge møbler.",
      "Kort afstand (under 20 km).",
      "Mindst 3 friske hjælpere.",
      "Du har tid til pakning i ugen op til.",
    ]},
    { heading: "Hvornår flyttefirma er pengene værd", list: [
      "3+ værelses eller villa.",
      "Trapper uden elevator.",
      "Klaver, piano eller marmor.",
      "Du arbejder fuldtid eller har småbørn.",
    ]},
  ],
});

export default Post;