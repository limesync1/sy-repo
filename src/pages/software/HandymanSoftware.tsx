import { defineSoftwarePage } from "./defineSoftwarePage";

const HandymanSoftware = defineSoftwarePage({
  canonicalPath: "/software/haandvaerker",
  metaTitle: "System til håndværkere — opgaver, timer og fakturering | Serviceydere",
  metaDescription:
    "Håndværkersystem med opgavestyring, timer, medarbejder-app, online tilbud og fakturering i E-conomic eller Dinero — med kørslen tænkt ind i dagen. Fra 289 kr./md.",
  keywords:
    "system til håndværkere, håndværkerprogram, ordrestyring håndværker, app til håndværkere, tilbud og fakturering håndværk",
  heroEyebrow: "Til håndværkere",
  heroTitle: "System til håndværkere",
  heroSubtitle:
    "Opgaver, timer og fakturering — med kørslen mellem adresserne tænkt ind i dagen.",
  breadcrumbLabel: "Håndværkere",
  answer:
    "Serviceydere samler opgaver, planlægning, timeregistrering og fakturering for håndværksvirksomheder med kørende medarbejdere. Tilbud sendes fra systemet, opgaven bliver til et stop på en rute, medarbejderen registrerer sin tid på adressen, og faktureringen bogføres i E-conomic eller Dinero. Markedspladsen giver samtidig forespørgsler fra kunder i jeres område.",
  facts: [
    "Tilbud, opgave, udførelse og faktura i én kæde",
    "Servicebesøg og længere opgaver i samme kalender",
    "Timeregistrering fra medarbejderens telefon",
    "Bogføring i E-conomic og Dinero",
    "Forespørgsler fra markedspladsen Serviceydere.dk",
    "Fra 289 kr./md. med ruteplanlægning inkluderet — 14 dages gratis prøve uden betalingskort",
  ],
  sections: [
    {
      heading: "Mange små opgaver stiller andre krav end få store",
      paragraphs: [
        "Klassiske håndværkersystemer er bygget om sagen: et projekt med timer og materialer, der skal hænge sammen økonomisk. Det er rigtigt, når arbejdet er få lange sager.",
        "Har I i stedet fem til ti servicebesøg om dagen fordelt på flere biler, er det rækkefølgen og kørslen, der afgør indtjeningen. Der lægger Serviceydere planlægningen ind i systemet frem for at overlade den til en person med en kalender.",
      ],
    },
    {
      heading: "Det bruger håndværksvirksomheder mest",
      list: [
        "Tilbud sendt fra systemet, som kunden kan godkende online.",
        "Servicebesøg og tilbagevendende aftaler, fx årlige eftersyn.",
        "Timer registreret på adressen, ikke rekonstrueret fredag eftermiddag.",
        "Fakturering af udført arbejde med automatisk bogføring.",
        "Profilside med anmeldelser, som nye kunder kan finde.",
      ],
    },
    {
      heading: "Ærligt om hvornår vi ikke er det rigtige valg",
      paragraphs: [
        "Er jeres hverdag store entrepriser med tung materialestyring, akontofakturering og sagsøkonomi som omdrejningspunkt, er et decideret sagsstyringssystem det bedre match. Vi er stærkest, når der er mange besøg, kørsel imellem, og tilbagevendende aftaler.",
      ],
      list: [
        <>Sammenligning: <a href="/blog/serviceydere-vs-minuba">Serviceydere vs. Minuba</a>.</>,
        <>Overblik: <a href="/blog/bedste-system-til-servicevirksomheder-2026">bedste system til servicevirksomheder 2026</a>.</>,
      ],
    },
  ],
  faq: [
    { q: "Kan jeg sende tilbud fra systemet?", a: "Ja. Tilbud kan sendes til kunden og godkendes online, hvorefter opgaven kan planlægges direkte." },
    { q: "Registrerer medarbejderne timer selv?", a: "Ja. De tjekker ind og ud på opgaven i appen, og tiden følger med over i faktureringen." },
    { q: "Kan systemet håndtere længere opgaver over flere dage?", a: "Ja. Både engangsopgaver, flerdagesopgaver og faste serviceaftaler ligger i samme kalender." },
    { q: "Er der integration til regnskab?", a: "Ja, til E-conomic og Dinero. Det koster 269 kr./md. som tilvalg." },
    { q: "Hvad hvis vi laver flere fag?", a: "Systemet er brancheuafhængigt, så en virksomhed kan dække både håndværk, service og fx haveopgaver uden at skifte system." },
  ],
  cta: {
    heading: "Prøv det på en helt almindelig uge",
    body: "Læg de opgaver ind, I allerede har i kalenderen, og se hvordan dagen ser ud, når kørselstiden er regnet med.",
  },
});
export default HandymanSoftware;