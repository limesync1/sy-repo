import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "economic-integration-servicefirma",
  keywords: "e-conomic integration, e-conomic servicefirma, automatisk fakturering e-conomic, e-conomic ruteplanlægning",
  faq: [
    { q: "Skal jeg oprette kunderne i e-conomic først?", a: "Nej. Kunder oprettes eller kobles automatisk, når første faktura sendes." },
    { q: "Kan jeg vælge varegruppe pr. service?", a: "Ja, hver service kan have sin egen varegruppe, med virksomhedens standard som fallback." },
  ],
  sections: [
    { paragraphs: [
      "Bruger du e-conomic, er det dobbeltarbejde at skrive fakturaer ud fra en kalender eller et regneark. Med en integration bliver udført arbejde til en faktura af sig selv.",
    ] },
    { heading: "Sådan fungerer det", ordered: [
      "Medarbejderen markerer besøget som udført i appen.",
      "Systemet laver fakturaen med kunde, service, dato og pris.",
      "Fakturaen bogføres i e-conomic og sendes til kunden.",
      "Betaling markeres, når den er registreret.",
    ] },
    { heading: "Fordele", list: [
      "Ingen glemte fakturaer.",
      "Korrekte leveringsdatoer.",
      "Kreditnota ved annullering, så regnskabet stemmer.",
      "Mulighed for at samle flere besøg på én faktura.",
    ] },
    { body: (
      <p>
        <a href="/software/fakturering-og-regnskab">Fakturering og regnskab</a> <a href="/blog/dinero-faktura-servicefirma">Dinero faktura</a> <a href="/blog/samlefaktura-faste-kunder">samlefaktura</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
