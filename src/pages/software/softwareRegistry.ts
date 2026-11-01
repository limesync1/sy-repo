/**
 * Én sandhed for det offentlige produktunivers (/software/*). Bruges af
 * sitemap-generatoren, intern linkning og "relateret"-sektionen på hver
 * produktside, så nye sider automatisk hænger sammen.
 */
export interface SoftwarePageMeta {
  href: string;
  label: string;
  blurb: string;
  priority?: string;
  /** SEO-titel/-beskrivelse — skal matche sidens egen metaTitle/metaDescription,
   *  så statisk prerender og runtime viser samme snippet. */
  seoTitle?: string;
  seoDescription?: string;
  /**
   * "product" = en del af systemet, "industry" = samme system fortalt i én
   * branches sprog, "pricing" = prissiden. Bruges til at holde sidebaren
   * relevant i stedet for at liste alle sider på alle sider.
   */
  group?: "product" | "industry" | "pricing";
}

export const SOFTWARE_PAGES: SoftwarePageMeta[] = [
  {
    href: "/software",
    label: "Systemet — overblik",
    blurb: "Hele systemet: ruteplanlægning, medarbejder-app, booking, fakturering og markedsplads i ét.",
    priority: "0.9",
    group: "product",
  },
  {
    href: "/software/ruteplanlaegger",
    label: "Ruteplanlægger",
    blurb: "Planlæg dagens ruter med drag & drop, faste aftaler, kørselstid og konfliktadvarsler.",
    priority: "0.9",
    group: "product",
    seoTitle: "Ruteplanlægger til servicevirksomheder | Serviceydere",
    seoDescription: "Planlæg dagens og ugens ruter med drag & drop, faste aftaler, stopbaseret kapacitet og konfliktadvarsler. Ruteplanlægning til rengøring, have, håndværk og service.",
  },
  {
    href: "/software/medarbejder-app",
    label: "Medarbejder-app",
    blurb: "Dagens ruter, manuel tidsregistrering, noter og frivillige før/efter-billeder.",
    priority: "0.8",
    group: "product",
    seoTitle: "Medarbejder-app til dagens rute | Serviceydere",
    seoDescription: "Dagens ruter, manuel tidsregistrering og frivillige før/efter-billeder i én medarbejder-app. Hent Android-appen eller tilføj på iPhone. Prøv gratis i 14 dage.",
  },
  {
    href: "/software/funktioner",
    label: "Funktionsguide",
    blurb: "Søgbar guide til hver funktion i hele systemet — med eksempler, trin og PDF.",
    priority: "0.8",
    group: "product",
  },
  {
    href: "/software/booking-og-tilbud",
    label: "Booking og tilbud",
    blurb: "Online booking fra din egen profilside, leads fra markedspladsen og tilbud i ét flow.",
    priority: "0.8",
    group: "product",
    seoTitle: "Online booking og tilbudsstyring | Serviceydere",
    seoDescription: "Få online booking på din egen profilside, modtag leads fra markedspladsen og send tilbud fra samme system. Bookinger bliver til stop på ruten.",
  },
  {
    href: "/software/fakturering-og-regnskab",
    label: "Fakturering og regnskab",
    blurb: "Fakturer udført arbejde og send det automatisk videre til E-conomic eller Dinero.",
    priority: "0.8",
    group: "product",
    seoTitle: "Fakturering og regnskab med E-conomic og Dinero | Serviceydere",
    seoDescription: "Fakturér udført arbejde direkte fra ruten og send det automatisk videre til E-conomic eller Dinero. Ingen dobbelt indtastning, ingen glemte opgaver.",
  },
  {
    href: "/software/brancher",
    label: "Brancher",
    blurb: "Systemet er bygget til alle servicebrancher med kørsel — ikke kun én niche.",
    priority: "0.8",
    group: "product",
    seoTitle: "Brancher: hvem kan bruge Serviceydere? | Serviceydere",
    seoDescription: "Serviceydere er bygget til alle servicebrancher med kørsel — rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyr, autoservice, industriservice og flere.",
  },
  {
    href: "/software/priser",
    label: "Priser",
    blurb: "289 kr./md. med ruteplanlægning inkluderet. Se hvad jeres opsætning koster.",
    priority: "0.9",
    group: "pricing",
  },
  {
    href: "/software/vinduespudser",
    label: "Software til vinduespudsere",
    blurb: "Faste intervaller, ruter der hænger sammen, og nye kunder fra markedspladsen.",
    priority: "0.8",
    seoTitle: "Software til vinduespudsere — ruteplanlægning og nye kunder | Serviceydere",
    seoDescription: "Program til vinduespudsere med faste intervaller, ruter der hænger sammen, medarbejder-app og fakturering — plus en markedsplads der giver nye kunder. Fra 289 kr./md.",
    group: "industry",
  },
  {
    href: "/software/rengoering",
    label: "System til rengøringsfirmaer",
    blurb: "Faste aftaler, nøgler og adgangsforhold, kvalitetstjek og timer der kan faktureres.",
    priority: "0.8",
    group: "industry",
    seoTitle: "System til rengøringsfirmaer — planlægning, timer og fakturering | Serviceydere",
    seoDescription: "Rengøringssystem med faste aftaler, nøglestyring, medarbejder-app med tjek ind og ud, timer der kan faktureres og bogføring i E-conomic eller Dinero. Fra 289 kr./md.",
  },
  {
    href: "/software/haveservice",
    label: "Program til haveservice",
    blurb: "Sæsoner, vejr og gentagne besøg — planlægning der tåler en aflyst dag.",
    priority: "0.8",
    group: "industry",
    seoTitle: "Program til haveservice — sæsonplanlægning og ruter | Serviceydere",
    seoDescription: "Planlægningsprogram til haveservice og anlægsgartnere: gentagne besøg, sæsoner, ruter der tåler en aflyst dag, medarbejder-app og fakturering. Fra 289 kr./md.",
  },
  {
    href: "/software/haandvaerker",
    label: "System til håndværkere",
    blurb: "Opgaver, timer, materialer og fakturering — med kørslen tænkt ind i dagen.",
    priority: "0.8",
    group: "industry",
    seoTitle: "System til håndværkere — opgaver, timer og fakturering | Serviceydere",
    seoDescription: "Håndværkersystem med opgavestyring, timer, medarbejder-app, online tilbud og fakturering i E-conomic eller Dinero — med kørslen tænkt ind i dagen. Fra 289 kr./md.",
  },
  {
    href: "/software/flyttefirma",
    label: "System til flyttefirmaer",
    blurb: "Prisberegner til tilbud, hold og biler på flyttedagen og fakturering ud fra brugt tid.",
    priority: "0.8",
    group: "industry",
    seoTitle: "System til flyttefirmaer — tilbud, planlægning og fakturering | Serviceydere",
    seoDescription: "Flyttesystem med prisberegner til tilbud, planlægning af biler og hold, medarbejder-app og fakturering med bogføring i E-conomic eller Dinero. Fra 289 kr./md.",
  },
  {
    href: "/software/maler",
    label: "System til malerfirmaer",
    blurb: "Tilbud pr. m², svende på flerdagesopgaver og billeddokumentation i appen.",
    priority: "0.8",
    group: "industry",
    seoTitle: "System til malerfirmaer — tilbud pr. m², planlægning og fakturering | Serviceydere",
    seoDescription: "Malersystem med prisberegner pr. m², planlægning af svende på flerdagesopgaver, medarbejder-app med billeder og fakturering i E-conomic eller Dinero. Fra 289 kr./md.",
  },
];

export const softwarePagesExcept = (href: string) =>
  SOFTWARE_PAGES.filter((p) => p.href !== href);

/** Produkt- og prissider — vises som "Resten af systemet" på alle sider. */
export const productPagesExcept = (href: string) =>
  SOFTWARE_PAGES.filter((p) => p.href !== href && p.group !== "industry");

/** Branchesider — vises som "Din branche" på alle sider. */
export const industryPagesExcept = (href: string) =>
  SOFTWARE_PAGES.filter((p) => p.href !== href && p.group === "industry");
