import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "faktura-skabelon-servicefirma",
  keywords: "faktura skabelon, fakturaskabelon, gratis faktura skabelon, hvad skal en faktura indeholde, faktura krav",
  faq: [
    { q: "Hvad skal en faktura indeholde?", a: "Dato, fortløbende fakturanummer, dit CVR-nummer, navn og adresse på dig og kunden, hvad der er leveret og hvornår, beløb uden moms, momssats og momsbeløb." },
    { q: "Findes der en forenklet faktura?", a: "Ja, ved mindre beløb kan en forenklet faktura bruges. Se de aktuelle regler og beløbsgrænser på skat.dk." },
  ],
  sections: [
    { paragraphs: [
      "En faktura er ikke bare en regning — den skal opfylde momslovens krav. Her er skabelonen med alle punkter, og hvordan servicefirmaer kan lade systemet lave den automatisk.",
    ] },
    { heading: "Skabelon: det skal stå på fakturaen", ordered: [
      "Udstedelsesdato.",
      "Fortløbende, unikt fakturanummer.",
      "Dit firmanavn, adresse og CVR-nummer.",
      "Kundens navn og adresse.",
      "Hvad der er leveret — mængde og art.",
      "Leveringsdato, fx datoen hvor besøget blev udført.",
      "Beløb uden moms.",
      "Momssats og momsbeløb.",
      "Samlet beløb med moms.",
      "Betalingsfrist og betalingsoplysninger.",
    ] },
    { heading: "Typiske fejl", list: [
      "Huller i fakturanumre.",
      "Manglende leveringsdato.",
      "Kun pris med moms — uden momsbeløbet.",
      "Faktura sendt længe efter udført arbejde.",
    ] },
    { body: (
      <p>
        <a href="/blog/moms-paa-faktura">Moms på faktura</a> <a href="/blog/samlefaktura-faste-kunder">samlefaktura</a> <a href="/software/fakturering-og-regnskab">fakturering og regnskab</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
