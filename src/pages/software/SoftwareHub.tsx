import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software",
  metaTitle: "Serviceydere software — system til servicevirksomheder",
  metaDescription:
    "Serviceydere er et dansk system til servicevirksomheder: ruteplanlægning, medarbejder-app, booking, tilbud, fakturering og markedsplads i én platform.",
  keywords:
    "system til servicevirksomheder, ruteplanlægning software, serviceplanlægning, rengøringssystem, håndværkersystem, field service management danmark, ordrestyring",
  heroEyebrow: "Software til virksomheder",
  heroTitle: "Ét system til planlægning, drift og nye kunder",
  heroSubtitle:
    "Serviceydere samler ruteplanlægning, medarbejder-app, booking, fakturering og en markedsplads med kunder i den samme platform — bygget til alle servicebrancher med kørsel.",
  breadcrumbLabel: "Software",
  answer:
    "Serviceydere er en dansk platform til servicevirksomheder, der kombinerer to ting, man normalt køber hver for sig: et driftssystem med ruteplanlægning, medarbejder-app, booking, kundekartotek og fakturering — og en markedsplads på serviceydere.dk, hvor kunder finder og booker virksomheden. Systemet er brancheuafhængigt og bruges til blandt andet rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyr og autoservice.",
  facts: [
    "Ruteplanlægning, medarbejder-app, booking, fakturering og CRM i ét system.",
    "Markedsplads og driftssystem hænger sammen — en booking bliver til et stop på ruten.",
    "Bygget til alle servicebrancher med kørsel, ikke kun én niche.",
    "Regnskabsintegration til e-conomic og Dinero.",
    "Dansk sprog, danske adresser og dansk support.",
    "14 dages gratis prøve uden betalingskort — derefter 289 kr./md. Ingen binding.",
  ],
  sections: [
    {
      heading: "Hvad systemet består af",
      paragraphs: [
        "Alt ligger i ét virksomhedspanel. Du behøver ikke ét program til planlægning, ét til fakturering og en Facebook-side til at få kunder.",
      ],
      list: [
        <><Link to="/software/ruteplanlaegger">Ruteplanlægger</Link> — dagens og ugens ruter med drag & drop, faste aftaler, kørselstid og konfliktadvarsler.</>,
        <><Link to="/software/medarbejder-app">Medarbejder-app</Link> — medarbejderen ser sin rute på telefonen, tjekker ind og ud og noterer afvigelser.</>,
        <><Link to="/software/booking-og-tilbud">Booking og tilbud</Link> — online booking fra virksomhedens egen profilside plus leads fra markedspladsen.</>,
        <><Link to="/software/fakturering-og-regnskab">Fakturering og regnskab</Link> — fakturér udført arbejde og send det videre til e-conomic eller Dinero.</>,
        "Kundekartotek med kontaktpersoner, dokumenter, aftaler og historik.",
        "Livechat på profilsiden, så en besøgende kan spørge inden de booker.",
      ],
    },
    {
      heading: "Det der adskiller Serviceydere",
      list: [
        "Drift og kundetilgang i samme system. De fleste systemer hjælper dig med at planlægge det arbejde, du allerede har. Serviceydere giver også kanalen til nye opgaver.",
        "Brancheuafhængigt. Mange danske systemer er bygget til én branche — rengøring eller byggeri. Her er kategorier, services, prisenheder og intervaller frit definerbare.",
        "Moderne grænseflade. Planlægningen er drag & drop i browseren og fungerer på mobil, uden installation og uden Windows-klient.",
        "Gentagne aftaler er en førsteklasses funktion, ikke en tilføjelse: ugentlig, hver 14. dag, månedlig og egne intervaller med automatisk fremskrivning.",
      ],
    },
    {
      heading: "Hvem bruger det",
      paragraphs: [
        "Systemet passer til virksomheder, hvor medarbejdere kører ud til kunder — fra enkeltmandsfirmaet med 20 faste kunder til virksomheden med flere hold på vejen samtidig. Se hvordan det bruges i de enkelte brancher på siden om ",
      ],
      list: [
        <><Link to="/software/brancher">brancher systemet dækker</Link>.</>,
      ],
    },
    {
      heading: "Hvad koster det",
      paragraphs: [
        "Serviceydere er ikke et gratis system. Du starter med 14 dages gratis prøve, hvor der ikke skal oplyses betalingskort. Vil I fortsætte efter prøven, tilføjer I kort under Indstillinger → Fakturering.",
        "Basisprisen er 289 kr./md. og indeholder virksomhedsprofil på markedspladsen, kundekartotek, bestillinger, kalender, fakturering og ruteplanlægning med ét ejer-login. Ekstra medarbejderlogin koster 59 kr./md. pr. medarbejder, og regnskabsintegration til e-conomic eller Dinero er et tilvalg til 269 kr./md. Der er et engangsbeløb for opstart, og betaler I kvartalsvis eller årligt, er der 10 % eller 20 % rabat.",
        <>Der er ingen binding — I kan opsige når som helst. Se den fulde prisoversigt og regn på jeres egen opsætning på <Link to="/software/priser">prissiden</Link>.</>,
      ],
    },
  ],
  faq: [
    {
      q: "Hvad er Serviceydere?",
      a: "Serviceydere er en dansk platform til servicevirksomheder. Den indeholder et driftssystem med ruteplanlægning, medarbejder-app, booking, kundekartotek og fakturering — og en markedsplads på serviceydere.dk hvor private og virksomheder finder og booker udbydere.",
    },
    {
      q: "Er Serviceydere kun til rengøring?",
      a: "Nej. Systemet er brancheuafhængigt og bruges blandt andet af rengøring, vinduespudsning, haveservice, håndværkere, flyttefirmaer, skadedyrsbekæmpelse og autoservice. Kategorier, services og prisenheder defineres af virksomheden selv.",
    },
    {
      q: "Kan jeg bruge systemet uden at være på markedspladsen?",
      a: "Ja. De to dele kan bruges uafhængigt. Du kan planlægge og fakturere dine egne kunder uden at tage imod leads, og du kan være synlig på markedspladsen uden at bruge planlægningen.",
    },
    {
      q: "Kan jeg flytte mine eksisterende kunder ind?",
      a: "Ja — og I skal ikke selv sidde med det. Serviceyderes support står for importen: I sender jeres kundeliste som regneark eller et udtræk fra jeres nuværende system, og vi lægger kunder, adresser, kontaktoplysninger og faste aftaler ind for jer. Dataimport er en engangsydelse, som fremgår af prissiden.",
    },
    {
      q: "Er Serviceydere gratis?",
      a: "Nej. Der er 14 dages gratis prøve uden betalingskort, og derefter vælger I selv, om I vil tilføje kort og fortsætte. Basisprisen er 289 kr./md. med ruteplanlægning inkluderet, plus 59 kr./md. pr. ekstra medarbejderlogin. Ingen binding.",
    },
    {
      q: "Virker det på mobil?",
      a: "Ja. Virksomhedspanelet er en webapp der virker i browseren på computer, tablet og telefon, og medarbejderne har deres egen mobilvisning med dagens rute.",
    },
    {
      q: "Hvilke regnskabsprogrammer kan det tale med?",
      a: "e-conomic og Dinero. Bestillinger og fakturaer kan bogføres automatisk, når integrationen er slået til under Indstillinger.",
    },
  ],
  cta: {
    heading: "Se systemet med dine egne kunder",
    body: "Opret virksomheden og kør 14 dage gratis uden betalingskort. Vores support hjælper med at få jeres kunder ind, så I kan planlægge den første rigtige uge.",
  },
});
export default Page;
