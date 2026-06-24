import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fast-pris-eller-timepris-haandvaerker",
  keywords: "fast pris håndværker, timepris håndværker, kontrakt håndværker, ekstraarbejde aftale, AB-forbruger, hvad er bedst fast pris eller timepris",
  faq: [
    { q: "Hvornår er fast pris bedst?", a: "Når opgaven kan beskrives præcist på forhånd: udskift 12 vinduer, mal 80 m² stue i to lag, læg klinker i bad 6 m². Du får budgetsikkerhed, og håndværkeren tager risikoen for overforbrug." },
    { q: "Hvornår er timepris bedst?", a: "Når omfanget er uklart eller småt: 'kig på den utætte vandhane', 'fix en revne', små servicebesøg under 2 timer. Du betaler for det reelle forbrug og undgår overpris-buffer." },
    { q: "Hvad må håndværkeren tage ekstra for ved fast pris?", a: "Kun arbejde der ligger UDENFOR den oprindelige aftale — fx hvis han åbner en væg og finder skjulte rådskader. Han skal stoppe og indhente skriftlig godkendelse, inden han arbejder videre, ellers er det hans regning." },
    { q: "Hvor meget højere er en fast pris typisk end timeprisen?", a: "10–25 % højere end et realistisk timeestimat. Det er prisen for budgetsikkerhed — håndværkeren prissætter risikoen for forsinkelser, vejret, materialeprisstigninger." },
    { q: "Kan jeg blande fast pris og timepris?", a: "Ja, og det er ofte klogt. Få fast pris på selve arbejdet (fx udskiftning af badeværelse), men timepris på 'små ekstra opgaver' under 5 timer." },
  ],
  sections: [
    { paragraphs: [
      "Valget mellem fast pris og timepris er det mest undervurderede valg i en håndværkeropgave. Det forkerte valg kan koste tusindvis af kroner — enten i form af 'ekstra arbejde' efter regningen, eller fordi du har betalt 25 % bufferpris på en opgave der reelt kunne afsluttes på halv tid.",
    ] },
    { heading: "Fast pris — fordele og faldgruber", list: [
      "Fordel: Du ved præcis hvad du skal betale — også hvis håndværkeren bruger længere tid end forventet.",
      "Fordel: Tvinger håndværkeren til at skrive et detaljeret tilbud (materialer, omfang, tidsplan).",
      "Faldgrube: 'Ekstra arbejde' bliver dyrt — kræv altid skriftlig godkendelse før yderligere fakturering.",
      "Faldgrube: Kvaliteten kan glide hvis håndværkeren føler sig presset på tid — vælg AB-forbruger og kontroller arbejdet undervejs.",
    ] },
    { heading: "Timepris — fordele og faldgruber", list: [
      "Fordel: Du betaler kun for det reelle arbejde — ingen bufferpris.",
      "Fordel: Fleksibel hvis du ændrer mening undervejs.",
      "Faldgrube: Budgettet kan løbe løbsk — sæt loft (fx 'maks 8 timer, derefter kontakt mig').",
      "Faldgrube: Svært at sammenligne tilbud — én håndværker arbejder dobbelt så hurtigt som en anden.",
    ] },
    { heading: "Beslutningsregler", ordered: [
      "Opgavebeskrivelsen kan rummes på 1 A4 med konkrete tal (kvm, antal, materialer)? → Fast pris.",
      "Skal håndværkeren først 'kigge på det' før omfanget er kendt? → Timepris med beløbsloft.",
      "Ren servicebesøg (utæt rør, defekt kontakt, ophæng)? → Timepris, ingen loft nødvendigt.",
      "Større renovering (badeværelse, køkken, tilbygning)? → Fast pris + AB-forbruger.",
      "Lille tilretning oven i en stor opgave? → Timepris-tillæg til den faste pris.",
    ] },
    { heading: "Det skal kontrakten indeholde", list: [
      "Detaljeret opgavebeskrivelse (materialer pr. m², færdiggørelsesgrad, hvem der står for affald)",
      "Pris (fast eller t-pris) + hvad der udløser ekstra-fakturering",
      "Tidsplan med start- og slutdato + dagbod ved forsinkelse > 1 uge",
      "Betalingsplan — aldrig hele beløbet forud, typisk 30 % start, 40 % undervejs, 30 % ved afleveringsforretning",
      "AB-forbruger som baggrundsret (standardvilkår for forbrugere)",
    ] },
  ],
});