import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "software-til-rengoeringsfirma",
  keywords: "software rengøringsfirma, rengøring system, planlægning rengøring",
  faq: [
    { q: "Kan jeg prøve først?", a: "Ja, Serviceydere kan prøves gratis i 14 dage uden kreditkort." },
    { q: "Virker det til erhvervsrengøring?", a: "Ja, også med flere adresser og samlefakturaer." },
  ],
  sections: [
    { paragraphs: [
      "Et rengøringsfirma har mange faste kunder, skiftende medarbejdere og nøgler, koder og særlige ønsker. Systemet skal holde styr på det hele — ikke kun kalenderen.",
    ] },
    { heading: "Tjeklisten", list: [
      "Faste aftaler med interval og automatisk næste besøg.",
      "Medarbejder-app med adgangsnoter og dagens rækkefølge.",
      "Manuel tidsregistrering, der er nem at rette.",
      "Fakturering direkte til regnskabsprogrammet.",
      "Kundeportal, hvor kunden ser aftaler og fakturaer.",
    ] },
    { heading: "Faldgruber", list: [
      "Systemer bygget til håndværkere med store sager.",
      "Betaling pr. funktion, der løber op.",
      "Ingen dansk support eller danske momsregler.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
