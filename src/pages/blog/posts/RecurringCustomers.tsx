import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "faste-kunder-abonnement-servicefirma",
  keywords: "faste kunder, abonnement servicefirma, tilbagevendende aftaler",
  faq: [
    { q: "Hvad hvis et besøg bliver aflyst?", a: "Besøget kan flyttes eller annulleres, og næste aftale beregnes fra det udførte besøg." },
    { q: "Kan kunden have flere services?", a: "Ja, fx vinduer hver 4. uge og tagrender to gange om året." },
  ],
  sections: [
    { paragraphs: [
      "Faste kunder er rygraden i et servicefirma. De giver forudsigelig omsætning, tætte ruter og mindre salg — hvis planlægningen kører af sig selv.",
    ] },
    { heading: "Vælg intervaller kunderne forstår", list: [
      "Hver uge, hver 14. dag, hver 4. uge eller hver 8. uge.",
      "Næste besøg beregnes først, når det forrige er udført.",
      "Kunden kan se næste dato i kundeportalen.",
    ] },
    { heading: "Fakturér uden at drukne", list: [
      "Fakturér efter hvert besøg, hver 14. dag, månedligt eller kvartalsvis.",
      "Saml flere besøg på én faktura til faste kunder.",
      "Send automatisk til e-conomic eller Dinero.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
