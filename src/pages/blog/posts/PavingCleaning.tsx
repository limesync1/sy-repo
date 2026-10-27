import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fliserens-guide",
  keywords: "fliserens, rens fliser, fliserens terrasse, højtryksrens fliser, alger på fliser",
  faq: [
    { q: "Ødelægger højtryk fugerne?", a: "Det kan det. Hold dysen på afstand og i vinkel, og fug efter, hvis fugesand skylles ud." },
    { q: "Hvor ofte skal fliser renses?", a: "Typisk én gang om året, og gerne algebehandling bagefter, så de holder sig rene længere." },
  ],
  sections: [
    { paragraphs: [
      "Grønne og sorte fliser skyldes typisk alger, mos og snavs. En grundig rens får terrassen til at se ny ud — men den forkerte metode kan skylle fugerne væk.",
    ] },
    { heading: "Metoder", list: [
      "Rotorvasker på højtryksrenser: jævnt resultat og mindre sprøjt.",
      "Almindelig højtryk: effektivt, men hårdt ved fugerne.",
      "Algemiddel: virker langsomt, men skånsomt.",
      "Børste og fliserens: til små arealer.",
    ] },
    { heading: "Sådan gør du", ordered: [
      "Fej og fjern ukrudt i fugerne.",
      "Rens fliserne med rotorvasker.",
      "Lad tørre.",
      "Fej nyt fugesand i.",
      "Behandl med algemiddel, så de holder sig rene.",
    ] },
    { body: (
      <p>
        <a href="/blog/algebehandling-hvor-ofte">Algebehandling — hvor ofte</a> · <a href="/priser/algebehandling">algebehandling pris</a> · <a href="/guides/have">haveservice</a> · <a href="/tilbud">Indhent gratis tilbud</a> fra lokale firmaer.
      </p>
    ) },
  ],
});
