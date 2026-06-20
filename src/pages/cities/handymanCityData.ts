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
];

export const findHandymanCity = (slug?: string) =>
  HANDYMAN_CITIES.find((c) => c.slug === slug?.toLowerCase());