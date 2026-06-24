// By-specifik konfiguration for håndværker-landingssider. Hver by har
// unikt indhold (timepriser, lokale forhold, populære opgaver).

export interface CityHandymanContent {
  slug: string;
  name: string;
  region: string;
  postalRange: string;
  hourlyLow: number;   // Alm. håndværker, kr./time inkl. moms
  hourlyHigh: number;
  carpenterLow: number; // Tømrer
  carpenterHigh: number;
  electricianLow: number;
  electricianHigh: number;
  callOutLow: number;  // Udkald
  callOutHigh: number;
  intro: string;
  localFactor: string;
  popularTasks: string[];
}

export const HANDYMAN_CITIES: CityHandymanContent[] = [
  {
    slug: "koebenhavn",
    name: "København",
    region: "Hovedstaden",
    postalRange: "1000–2500",
    hourlyLow: 495, hourlyHigh: 750,
    carpenterLow: 525, carpenterHigh: 795,
    electricianLow: 595, electricianHigh: 895,
    callOutLow: 450, callOutHigh: 950,
    intro:
      "København har Danmarks tætteste håndværker-marked og dermed både flest valg og højeste timepriser. Lange ventetider hos de største firmaer gør mindre lokale udbydere relevante for almindelige opgaver som montering, små reparationer og malerarbejde.",
    localFactor:
      "Etagebyggeri og fredede facader kræver ofte ekstra tid og særlige godkendelser. Parkering i brokvartererne lægger typisk 100–300 kr. oveni udkaldet. Mange firmaer kører fast pris på kendte standardopgaver (køkkenmontering, hvidevareskift, dørautomatik).",
    popularTasks: ["Køkkenmontering", "Skift af stikkontakter", "Opsætning af gipsvæg", "Hyldemontering", "Udskiftning af blandingsbatteri"],
  },
  {
    slug: "aarhus",
    name: "Aarhus",
    region: "Midtjylland",
    postalRange: "8000–8270",
    hourlyLow: 450, hourlyHigh: 695,
    carpenterLow: 495, carpenterHigh: 745,
    electricianLow: 550, electricianHigh: 825,
    callOutLow: 400, callOutHigh: 850,
    intro:
      "Aarhus' håndværker-marked vokser hurtigt med byudviklingen i Aarhus Ø og forstæderne. Lokale firmaer dækker både midtby og opland, og priserne ligger 10–15% under København for sammenlignelige opgaver.",
    localFactor:
      "Centrumsadresser kan have begrænset parkering — bed firmaet booke licensplads. Forstæderne (Risskov, Brabrand, Højbjerg) går hurtigere og er billigere pr. opgave.",
    popularTasks: ["Montering af IKEA-køkken", "Reparation af tagrender", "Udskiftning af vinduer", "Opsætning af terrassedæk", "Maling af facade"],
  },
  {
    slug: "odense",
    name: "Odense",
    region: "Syddanmark",
    postalRange: "5000–5270",
    hourlyLow: 425, hourlyHigh: 650,
    carpenterLow: 475, carpenterHigh: 695,
    electricianLow: 525, electricianHigh: 775,
    callOutLow: 350, callOutHigh: 750,
    intro:
      "Odense har et bredt netværk af mindre håndværkerfirmaer, der dækker hele Fyn. Fri parkering i de fleste boligområder betyder, at udkald typisk er billigere end i de største byer.",
    localFactor:
      "Korte afstande på Fyn gør samme firma relevant til både Odense, Nyborg og Middelfart. Mange firmaer giver fast pris på standardopgaver i parcelhuse.",
    popularTasks: ["Udskiftning af køkkenbordplade", "Opsætning af brusekabine", "Reparation af tag", "Tilslutning af opvaskemaskine", "Maling af stuer"],
  },
  {
    slug: "aalborg",
    name: "Aalborg",
    region: "Nordjylland",
    postalRange: "9000–9220",
    hourlyLow: 395, hourlyHigh: 625,
    carpenterLow: 450, carpenterHigh: 675,
    electricianLow: 495, electricianHigh: 745,
    callOutLow: 325, callOutHigh: 700,
    intro:
      "Aalborg har Nordjyllands største koncentration af håndværkere — drevet af universitetet, havneudvikling og en stor andel parcelhuse i forstæderne.",
    localFactor:
      "God parkering og brede veje holder udkaldsgebyret nede. Mange firmaer dækker også Nørresundby, Hasseris og Vodskov uden ekstra kørselstillæg.",
    popularTasks: ["Renovering af badeværelse", "Skift af tagrender", "Opsætning af carport", "Maling af træværk", "Udskiftning af døre"],
  },
  {
    slug: "esbjerg",
    name: "Esbjerg",
    region: "Syddanmark",
    postalRange: "6700–6715",
    hourlyLow: 375, hourlyHigh: 595,
    carpenterLow: 425, carpenterHigh: 645,
    electricianLow: 475, electricianHigh: 725,
    callOutLow: 295, callOutHigh: 675,
    intro:
      "Esbjerg har et stærkt håndværker-miljø drevet af offshore- og havneindustrien. Mange firmaer kombinerer privatopgaver med erhvervsservice, og timepriserne er blandt landets laveste i de større byer.",
    localFactor:
      "Vestkystens vejr (salt, vind, fugt) gør udvendigt vedligehold til en større del af opgaverne — særligt på træværk og facader. Firmaer dækker typisk Varde, Ribe og Bramming uden meromkostning.",
    popularTasks: ["Maling af facade", "Udskiftning af tagsten", "Reparation af træværk", "Opsætning af læhegn", "Skift af vinduer"],
  },
  {
    slug: "randers",
    name: "Randers",
    region: "Midtjylland",
    postalRange: "8900–8983",
    hourlyLow: 365, hourlyHigh: 575,
    carpenterLow: 415, carpenterHigh: 625,
    electricianLow: 465, electricianHigh: 705,
    callOutLow: 295, callOutHigh: 650,
    intro:
      "Randers har et stabilt håndværker-marked med mange små lokale firmaer, der dækker både by og opland. Priserne ligger 15–20% under København og er attraktive for større renoveringer.",
    localFactor:
      "Korte afstande og fri parkering holder udkaldsgebyret nede. Mange firmaer dækker også Hadsten, Langå og Hobro uden ekstra kørselstillæg.",
    popularTasks: ["Udskiftning af køkken", "Reparation af tagrender", "Opsætning af terrasse", "Maling af facade", "Skift af vinduer"],
  },
  {
    slug: "kolding",
    name: "Kolding",
    region: "Syddanmark",
    postalRange: "6000–6093",
    hourlyLow: 395, hourlyHigh: 615,
    carpenterLow: 445, carpenterHigh: 665,
    electricianLow: 495, electricianHigh: 745,
    callOutLow: 325, callOutHigh: 695,
    intro:
      "Kolding har Danmarks højeste håndværker-tæthed pr. indbygger uden for de fire største byer. Konkurrencen mellem firmaer holder priserne moderate, og udvalget er stort på alle fagområder.",
    localFactor:
      "Trekantsområdets infrastruktur gør samme firma relevant til Vejle, Fredericia og Middelfart. Mange firmaer giver pakkepris på køkken- og badeværelsesrenoveringer.",
    popularTasks: ["Renovering af badeværelse", "Udskiftning af køkken", "Opsætning af carport", "Reparation af tag", "Maling af træværk"],
  },
  {
    slug: "vejle",
    name: "Vejle",
    region: "Syddanmark",
    postalRange: "7100–7184",
    hourlyLow: 395, hourlyHigh: 615,
    carpenterLow: 445, carpenterHigh: 665,
    electricianLow: 495, electricianHigh: 745,
    callOutLow: 325, callOutHigh: 695,
    intro:
      "Vejle har et bredt håndværker-marked drevet af mange parcelhuse i bakkeskråningerne og pendlere til hele Trekantsområdet. Mange firmaer er specialiserede i terrasse- og kælderløsninger på skrå grunde.",
    localFactor:
      "Skråninger og kældre i Vejle giver flere fugt- og konstruktionsopgaver end gennemsnittet. Bed om besigtigelse før fast pris på større udvendige arbejder.",
    popularTasks: ["Terrasse på skrå grund", "Kælderisolering", "Udskiftning af tag", "Renovering af badeværelse", "Maling af træværk"],
  },
  {
    slug: "horsens",
    name: "Horsens",
    region: "Midtjylland",
    postalRange: "8700–8740",
    hourlyLow: 375, hourlyHigh: 595,
    carpenterLow: 425, carpenterHigh: 645,
    electricianLow: 475, electricianHigh: 725,
    callOutLow: 295, callOutHigh: 675,
    intro:
      "Horsens har et stort håndværker-marked drevet af stærk tilflytning fra Aarhus og en boom-renoveringskultur i ældre kvarterer som Bygholm og Vejlbygade. Konkurrencen mellem lokale firmaer holder priserne under landsgennemsnittet.",
    localFactor:
      "Mange nye tilflyttere renoverer ældre parcelhuse — derfor er badeværelses- og køkkenrenovering blandt de mest efterspurgte opgaver. Firmaer dækker også Brædstrup, Hedensted og Juelsminde.",
    popularTasks: ["Renovering af badeværelse", "Køkkenmontering", "Udskiftning af vinduer", "Maling af facade", "Skift af tagrender"],
  },
  {
    slug: "silkeborg",
    name: "Silkeborg",
    region: "Midtjylland",
    postalRange: "8600–8632",
    hourlyLow: 385, hourlyHigh: 605,
    carpenterLow: 435, carpenterHigh: 655,
    electricianLow: 485, electricianHigh: 735,
    callOutLow: 305, callOutHigh: 685,
    intro:
      "Silkeborg har Danmarks højeste andel af søvillaer og sommerhuse pr. indbygger, hvilket giver et specialiseret håndværker-marked med fokus på terrasser, brygger og fugtsikring. Lokale firmaer dækker også Skanderborg og Kjellerup.",
    localFactor:
      "Brygger og søvillaer kræver ofte specialgodkendelser og fugtberegninger. Mange firmaer er certificerede til kystnær konstruktion. Standard parcelhuse i Funder og Gødvad er hurtige og billigere.",
    popularTasks: ["Bygning af brygge", "Renovering af sommerhus", "Terrasse mod sø", "Fugtsikring af kælder", "Udskiftning af vinduer"],
  },
  {
    slug: "herning",
    name: "Herning",
    region: "Midtjylland",
    postalRange: "7400–7480",
    hourlyLow: 365, hourlyHigh: 575,
    carpenterLow: 415, carpenterHigh: 625,
    electricianLow: 465, electricianHigh: 705,
    callOutLow: 285, callOutHigh: 650,
    intro:
      "Herning har en stærk håndværkertradition drevet af messecenter, modebranchen og en stor erhvervssektor. Markedet er præget af mange selvstændige firmaer der dækker både privat og erhverv.",
    localFactor:
      "Korte afstande og fri parkering holder udkaldsgebyret lavt. Mange firmaer dækker også Ikast, Brande og Holstebro — godt udvalg på alle fagområder.",
    popularTasks: ["Køkkenmontering", "Udskiftning af tag", "Maling af facade", "Opsætning af carport", "Tilslutning af hvidevarer"],
  },
  {
    slug: "roskilde",
    name: "Roskilde",
    region: "Sjælland",
    postalRange: "4000–4030",
    hourlyLow: 445, hourlyHigh: 695,
    carpenterLow: 495, carpenterHigh: 745,
    electricianLow: 545, electricianHigh: 815,
    callOutLow: 395, callOutHigh: 825,
    intro:
      "Roskildes håndværker-marked er præget af mange tilflyttere fra København der renoverer ældre villaer i Himmelev, Veddelev og Trekroner. Priserne ligger 10–15% under selve København for sammenlignelige opgaver.",
    localFactor:
      "Mange firmaer dækker også København og Køge — konkurrencen holder priserne moderate. Ældre villaer kræver typisk besigtigelse før fast pris på renoveringer.",
    popularTasks: ["Renovering af badeværelse", "Udskiftning af køkken", "Skift af vinduer", "Tagrenovering", "Maling af facade"],
  },
];

export const findHandymanCity = (slug?: string) =>
  HANDYMAN_CITIES.find((c) => c.slug === slug?.toLowerCase());