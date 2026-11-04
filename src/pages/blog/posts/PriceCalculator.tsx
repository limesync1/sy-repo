import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "prisberegner-hjemmeside-servicefirma",
  keywords: "prisberegner, online pris, beregn pris hjemmeside",
  faq: [
    { q: "Kan prisen ændres bagefter?", a: "Ja, firmaet kan tilpasse aftalen, før den godkendes." },
    { q: "Beregnes prisen sikkert?", a: "I Serviceydere beregnes den endelige pris på serveren, så den ikke kan manipuleres." },
  ],
  sections: [
    { paragraphs: [
      "Kunder vil gerne kende prisen, før de ringer. En prisberegner giver dem svaret og gør dem klar til at bestille.",
    ] },
    { heading: "Sådan bygges en god beregner", list: [
      "Vælg enheder kunden kender: m², antal vinduer, timer.",
      "Vis prisen tydeligt med og uden moms for private og erhverv.",
      "Lad kunden vælge interval.",
      "Bestilling i samme flow — uden ekstra formularer.",
    ] },
    { heading: "Undgå disse fejl", list: [
      "For mange felter.",
      "Skjulte tillæg der dukker op senere.",
      "Ingen mulighed for at skrive en bemærkning.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
