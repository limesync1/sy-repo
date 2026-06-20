// By-specifik konfiguration for haveservice-landingssider.

export interface CityGardenContent {
  slug: string;
  name: string;
  region: string;
  postalRange: string;
  hourlyLow: number;   // Havemand kr./time inkl. moms
  hourlyHigh: number;
  lawnLow: number;     // Græsslåning fast pris pr. besøg, alm. parcelhus
  lawnHigh: number;
  hedgeLow: number;    // Hækklipning pr. lbm.
  hedgeHigh: number;
  intro: string;
  localFactor: string;
  popularTasks: string[];
}

export const GARDEN_CITIES: CityGardenContent[] = [
  {
    slug: "koebenhavn", name: "København", region: "Hovedstaden", postalRange: "1000–2500",
    hourlyLow: 395, hourlyHigh: 595, lawnLow: 350, lawnHigh: 750, hedgeLow: 35, hedgeHigh: 75,
    intro: "Haveservice i København dækker både små villahaver i forstæderne (Valby, Brønshøj, Vanløse) og altan/gårdhavearbejde i brokvartererne. Mange firmaer kombinerer haveservice med vinduespudsning og småreparationer for kunder med abonnement.",
    localFactor: "Brokvartersgårde kræver typisk særlig adgang og bortskaffelse af haveaffald — det lægger 200–400 kr. oveni. Forstadshaver er billigere pr. m² og kan ofte køres på fast aftale.",
    popularTasks: ["Græsslåning (ugentlig/14. dag)", "Hækklipning 2× årligt", "Beskæring af buske", "Opbinding og lugning", "Bortskaffelse af haveaffald"],
  },
  {
    slug: "aarhus", name: "Aarhus", region: "Midtjylland", postalRange: "8000–8270",
    hourlyLow: 365, hourlyHigh: 545, lawnLow: 325, lawnHigh: 695, hedgeLow: 32, hedgeHigh: 68,
    intro: "Aarhus har mange parcelhuse i Højbjerg, Risskov og Brabrand som driver efterspørgslen på fast haveservice. Universitetsbyens travle familier vælger ofte 14-dags abonnement frem for enkeltbesøg.",
    localFactor: "Korte afstande mellem forstæderne holder kørselsgebyret nede. Ælde have-villaer ved Marselisborg kræver typisk besigtigelse før fast pris.",
    popularTasks: ["Græsklip på abonnement", "Hækklipning", "Frugtbeskæring", "Forårsoprydning", "Nyanlæg af bede"],
  },
  {
    slug: "odense", name: "Odense", region: "Syddanmark", postalRange: "5000–5270",
    hourlyLow: 345, hourlyHigh: 525, lawnLow: 295, lawnHigh: 650, hedgeLow: 28, hedgeHigh: 62,
    intro: "Odense er Fyns største marked for haveservice — store parcelhusområder i Dalum, Hjallese og Hunderup holder firmaerne i fast drift hele sæsonen.",
    localFactor: "Fri parkering og overskuelig geografi gør Odense til et af landets mest effektive haveservicemarkeder. Mange firmaer dækker også Nyborg, Faaborg og Middelfart.",
    popularTasks: ["Græsslåning", "Hækklipning", "Trækfældning (mindre træer)", "Bede-renovering", "Snerydning vintersæson"],
  },
  {
    slug: "aalborg", name: "Aalborg", region: "Nordjylland", postalRange: "9000–9220",
    hourlyLow: 325, hourlyHigh: 495, lawnLow: 275, lawnHigh: 625, hedgeLow: 26, hedgeHigh: 58,
    intro: "Nordjylland har mange parcelhuse med store grunde, så pakke-aftaler (græs, hæk, ukrudt) er populære. Aalborg dækker både midtbyen og Hasseris, Vejgaard og Nørresundby.",
    localFactor: "Vinterhalvåret er en længere periode end i Sydjylland — mange firmaer tilbyder snerydning som del af haveabonnementet.",
    popularTasks: ["Græsklip", "Hækklipning", "Snerydning", "Bortskaffelse af haveaffald", "Klargøring af terrasse"],
  },
  {
    slug: "esbjerg", name: "Esbjerg", region: "Syddanmark", postalRange: "6700–6715",
    hourlyLow: 295, hourlyHigh: 465, lawnLow: 250, lawnHigh: 575, hedgeLow: 24, hedgeHigh: 55,
    intro: "Vestjyllands havemarked er domineret af lokalt drevne firmaer med fokus på vind- og saltbestandig beplantning. Priserne er blandt landets laveste.",
    localFactor: "Kystnær beplantning kræver oftere tilbageklipning og udskiftning — vær opmærksom på årligt vedligehold. Firmaerne dækker typisk Varde, Ribe og Bramming uden ekstra kørsel.",
    popularTasks: ["Læhegnsklipning", "Græsslåning", "Renovering af bede", "Plantning af vindbestandige buske", "Snerydning"],
  },
];

export const findGardenCity = (slug?: string) =>
  GARDEN_CITIES.find((c) => c.slug === slug?.toLowerCase());