import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "saadan-bestiller-du-haandvaerker-rigtigt",
  keywords: "bestil håndværker, sammenlign håndværkertilbud, kontrakt med håndværker, AB-Forbruger, fast pris vs timepris, afleveringsforretning",
  faq: [
    { q: "Skal jeg vælge fast pris eller timepris?", a: "Fast pris ved klart afgrænsede opgaver. Timepris ved diagnose, akut og opgaver hvor omfanget reelt er uvist. Sjældent fornuftigt at vælge timepris til en hel renovering." },
    { q: "Hvad er AB-Forbruger?", a: "AB-Forbruger er det officielle aftalegrundlag for byggeopgaver over 30.000 kr. inkl. moms mellem forbruger og håndværker — giver bl.a. ret til 1- og 5-års gennemgang." },
    { q: "Hvor stor en del må jeg betale forud?", a: "Som hovedregel max 25–30% forud, resten i rater knyttet til konkrete milepæle. Aldrig fuld betaling før afleveringsforretning." },
  ],
  sections: [
    { paragraphs: ["Den dyreste håndværkerregning er sjældent den højeste på tilbudet — det er den uventede merpris fordi specifikationen var for løs. En god bestilling tager 1 time og sparer typisk 10–30% på slutregningen."] },
    { heading: "De 7 klassiske fejl", ordered: [
      "For løs opgavebeskrivelse — \"male stuen\" rummer 6 forskellige resultater.",
      "Kun ét tilbud — prisspredningen er typisk 30%.",
      "Ingen skriftlig kontrakt — mundtlige aftaler er gyldige, men umulige at bevise.",
      "For stor forudbetaling — max 25–30%.",
      "Ingen tidsplan — uden start- og slutdato kan opgaven trække ud uendeligt.",
      "Manglende afleveringsforretning — uden gennemgang er det svært at rejse mangelkrav.",
      "Glemmer 1-års gennemgang — den eneste lejlighed til at få rettet sætningsskader gratis.",
    ] },
    { heading: "Tjekliste til kontrakten", list: [
      "Specifik opgavebeskrivelse med materialevalg",
      "Fast pris eller defineret timepris med loft",
      "Start- og afleveringsdato + dagbod ved overskridelse",
      "Betalingsplan knyttet til milepæle",
      "AB-Forbruger ved opgaver over 30.000 kr.",
      "Garanti- og forsikringsforhold",
      "Bortskaffelse af affald og oprydning",
    ] },
  ],
});
