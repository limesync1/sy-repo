import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "proev-ruteplanlaegger-gratis",
  keywords: "ruteplanlægger gratis, gratis ruteplanlægning, prøv ruteplanlægger, ruteplanlægning gratis prøveperiode, uden kreditkort",
  faq: [
    { q: "Skal jeg bruge kreditkort?", a: "Nej. Du opretter dig med navn og e-mail og kan bruge alt i 30 dage uden at indtaste kort." },
    { q: "Er der binding?", a: "Nej. Vil du fortsætte efter prøveperioden, vælger du selv en plan." },
    { q: "Kan jeg få mine kunder med?", a: "Ja. Kunder fra et andet system eller regneark kan importeres, så du hurtigt ser dine egne ruter." },
  ],
  sections: [
    { paragraphs: [
      "Den bedste måde at finde ud af, om en ruteplanlægger passer til dit firma, er at prøve den med dine egne kunder. Det tager en eftermiddag.",
    ] },
    { heading: "Tre ting du skal vide", list: [
      "30 dage gratis.",
      "Intet kreditkort — kun navn og e-mail.",
      "Ingen binding.",
    ] },
    { heading: "Sådan kommer du i gang", ordered: [
      "Opret din virksomhed.",
      "Læg dine services og et par kunder ind — eller importér dem.",
      "Se aftalerne på kalenderen og lav dagens rute.",
      "Inviter en medarbejder, så de kan se ruten i telefonen.",
    ] },
    { body: (
      <p>
        <a href="/opret-virksomhed">Start gratis i 30 dage</a> · <a href="/software/ruteplanlaegger">Læs om ruteplanlæggeren</a> ·{" "}
        <a href="/blog/ruteplanlaegning-for-servicevirksomheder">Guide til ruteplanlægning</a>
      </p>
    ) },
  ],
});
