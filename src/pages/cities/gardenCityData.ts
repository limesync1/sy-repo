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
  {
    slug: "randers", name: "Randers", region: "Midtjylland", postalRange: "8900–8983",
    hourlyLow: 285, hourlyHigh: 445, lawnLow: 245, lawnHigh: 550, hedgeLow: 23, hedgeHigh: 52,
    intro: "Randers og opland har mange parcelhuse med store grunde — pakkeaftaler med græs, hæk og bortskaffelse er normen. Mange firmaer dækker også Hobro, Hadsten og Langå.",
    localFactor: "Lavt lønniveau og korte afstande gør Randers til et af landets billigste havemarkeder. Vinterhalvåret er længere end i Sydjylland — snerydning kombineres ofte med haveaftale.",
    popularTasks: ["Græsklip på abonnement", "Hækklipning", "Snerydning", "Bortskaffelse af haveaffald", "Bede-renovering"],
  },
  {
    slug: "kolding", name: "Kolding", region: "Syddanmark", postalRange: "6000–6093",
    hourlyLow: 305, hourlyHigh: 475, lawnLow: 265, lawnHigh: 595, hedgeLow: 25, hedgeHigh: 55,
    intro: "Kolding har et bredt havemarked drevet af Trekantsområdets pendlersamfund og mange parcelhuskvarterer. Konkurrencen mellem firmaer holder priserne moderate.",
    localFactor: "Geografisk midte: samme firma dækker ofte Kolding, Vejle, Fredericia og Middelfart. Mange tilbyder fast årsaftale med 18–24 besøg fordelt over sæsonen.",
    popularTasks: ["Græsslåning", "Hækklipning 2× årligt", "Beskæring af frugttræer", "Anlæg af bede", "Bortskaffelse af haveaffald"],
  },
  {
    slug: "vejle", name: "Vejle", region: "Syddanmark", postalRange: "7100–7184",
    hourlyLow: 305, hourlyHigh: 475, lawnLow: 265, lawnHigh: 595, hedgeLow: 25, hedgeHigh: 55,
    intro: "Vejle er kendt for skrå grunde og dybe haver — derfor er beskæring, terrænarbejde og støttemurspleje en større del af markedet end andre steder. Firmaer dækker også Børkop og Egtved.",
    localFactor: "Skråninger og bakkede haver kræver ofte specialudstyr (stejlskråningsklipper, terrasse-trimmer). Bed om besigtigelse til første aftale.",
    popularTasks: ["Skråningsgræsklip", "Hækklipning", "Trækfældning", "Støttemur-pleje", "Forårsoprydning"],
  },
  {
    slug: "horsens", name: "Horsens", region: "Midtjylland", postalRange: "8700–8740",
    hourlyLow: 285, hourlyHigh: 445, lawnLow: 245, lawnHigh: 555, hedgeLow: 23, hedgeHigh: 52,
    intro: "Horsens har mange parcelhusområder (Stensballe, Torsted, Egebjerg) med fast haveservice som standard. Lokale firmaer dækker også Brædstrup, Hedensted og Juelsminde.",
    localFactor: "Lavt lønniveau og korte afstande gør Horsens til et af Midtjyllands billigste havemarkeder. Snerydning kombineres ofte med haveaftale.",
    popularTasks: ["Græsklip på abonnement", "Hækklipning", "Snerydning", "Bortskaffelse af haveaffald", "Bede-renovering"],
  },
  {
    slug: "silkeborg", name: "Silkeborg", region: "Midtjylland", postalRange: "8600–8632",
    hourlyLow: 305, hourlyHigh: 475, lawnLow: 265, lawnHigh: 595, hedgeLow: 25, hedgeHigh: 55,
    intro: "Silkeborg har Danmarks højeste tæthed af søvillaer og store haver med fokus på vandfront-pleje, trækfældning og specialklipning. Mange firmaer dækker også Kjellerup, Bjerringbro og Skanderborg.",
    localFactor: "Store grunde og søfront-pleje kræver typisk specialudstyr — bed om besigtigelse til første aftale. Pakkeaftaler med 20–30 årsbesøg er normen.",
    popularTasks: ["Trækfældning ved sø", "Skråningsgræsklip", "Hækklipning", "Beskæring af frugttræer", "Vinterklargøring af brygge"],
  },
  {
    slug: "frederiksberg", name: "Frederiksberg", region: "Hovedstaden", postalRange: "1800–2000",
    hourlyLow: 425, hourlyHigh: 625, lawnLow: 395, lawnHigh: 850, hedgeLow: 42, hedgeHigh: 85,
    intro: "Frederiksberg har Danmarks mest pressede prisniveau på haveservice — små villahaver med høj kvalitetsforventning, gårdhaver i karreer og altanpleje udgør det meste af markedet.",
    localFactor: "Begrænset adgang til ejendomme og bortskaffelse af haveaffald gennem trapper øger prisen pr. m². Mange firmaer kombinerer haveservice med vinduespudsning.",
    popularTasks: ["Gårdhave-pleje", "Hækklipning", "Altanpleje og potter", "Bortskaffelse af haveaffald", "Vintervedligehold"],
  },
];

export const findGardenCity = (slug?: string) =>
  GARDEN_CITIES.find((c) => c.slug === slug?.toLowerCase());