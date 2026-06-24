import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "saadan-laeser-du-haandvaerkertilbud",
  keywords: "læs håndværkertilbud, sammenlign håndværkertilbud, hvad skal stå i tilbud, fast pris vs overslag, materialer i tilbud",
  faq: [
    { q: "Hvad er forskellen på et tilbud og et overslag?", a: "Et tilbud er en fast pris håndværkeren er bundet af. Et overslag er et estimat der må overskrides med op til 15% uden varsel. Stå altid på fast pris ved opgaver under 100.000 kr." },
    { q: "Skal materialer være specificeret?", a: "Ja. Et godt tilbud lister mængder (m², stk., liter) OG mærke/type — fx \"Maling: 30 liter Flügger Flutex 5\"." },
    { q: "Hvor mange tilbud bør jeg indhente?", a: "Minimum 3 på opgaver over 20.000 kr. Forskellen er typisk 20–40%, så det kan sagtens spare 30.000+ kr. på en større opgave." },
  ],
  sections: [
    { paragraphs: ["Et håndværkertilbud kan se professionelt ud, men være fyldt med tomme poster der giver firmaet mulighed for at fakturere meget mere end aftalt. Lær at læse mellem linjerne på 10 minutter."] },
    { heading: "Tjekliste — det SKAL stå i tilbuddet", ordered: [
      "CVR-nummer, firmaadresse og kontaktperson",
      "Detaljeret opgavebeskrivelse (m², stk., antal lag)",
      "Materialer med mærke/type — ikke bare \"inkl.\"",
      "Fast pris ELLER overslag tydeligt markeret",
      "Timepris hvis ekstraopgaver tilkommer",
      "Betalingsplan og forudbetalingsgrænse",
      "Start- og slutdato",
      "Forsikringsoplysninger og garanti",
      "Gyldighedsperiode (typisk 14–30 dage)",
      "Reference til AB-Forbruger ved opgaver over 30.000 kr.",
    ] },
    { heading: "Røde flag-formuleringer", list: [
      "\"Ca.\" eller \"omkring\" pris uden klar grænse",
      "\"Materialer afregnes efter forbrug\" — bed om loft",
      "\"Ekstraopgaver faktureres separat\" uden timepris",
      "Ingen slutdato eller \"hurtigst muligt\"",
      "Bare ét samlet beløb uden specifikation",
    ] },
    { heading: "Sådan sammenligner du 3 tilbud retfærdigt", paragraphs: ["Lav et regneark med samme rækker: arbejdsløn, materialer, affald, ekstraposter, moms. Hvis firma A er 30% billigere fordi de har glemt afsætning, taber du penge når regningen kommer senere."] },
  ],
});
