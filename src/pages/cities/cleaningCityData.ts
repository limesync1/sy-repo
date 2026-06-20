// Data-drevet konfiguration for by-specifikke rengøringssider. Hver by har
// unikt indhold (priser, kvarterer, eksempler) så Google ikke ser dem som
// duplicate content. Tilføj nye byer her — siden, sitemap og JSON-LD bygges
// automatisk fra denne config.

export interface CityCleaningContent {
  slug: string;            // URL slug uden æøå, fx "koebenhavn"
  name: string;            // Visningsnavn, fx "København"
  region: string;          // Region, fx "Hovedstaden"
  population: string;      // Befolkningstal kort, fx "660.000"
  postalRange: string;     // Postnumre, fx "1000–2500"
  lat: number;
  lng: number;
  hourlyLow: number;       // Lav timepris kr. inkl. moms
  hourlyHigh: number;      // Høj timepris kr. inkl. moms
  flatLow: number;         // Lavpris fast besøg (75 m² hver 14. dag)
  flatHigh: number;        // Højpris fast besøg
  neighborhoods: string[]; // 5–8 kvarterer/områder
  intro: string;           // 2–3 sætningers intro der nævner byen
  localFactor: string;     // Hvorfor priserne ligger som de gør
  exampleHomeType: string; // Typisk boligtype i byen
}

export const CITIES: CityCleaningContent[] = [
  {
    slug: "koebenhavn",
    name: "København",
    region: "Hovedstaden",
    population: "660.000",
    postalRange: "1000–2500",
    lat: 55.6761,
    lng: 12.5683,
    hourlyLow: 295,
    hourlyHigh: 450,
    flatLow: 590,
    flatHigh: 950,
    neighborhoods: [
      "Indre By", "Vesterbro", "Nørrebro", "Østerbro",
      "Frederiksberg", "Amager", "Valby", "Sydhavnen",
    ],
    intro:
      "København har Danmarks tætteste marked for rengøringshjælp — over 400 registrerede firmaer dækker hovedstaden. Det giver konkurrencedygtige priser, men også store udsving mellem brokvartererne og forstæderne.",
    localFactor:
      "Priserne i København ligger 10–15% over landsgennemsnittet, primært på grund af højere lønninger og transport mellem opgaver. Til gengæld er udvalget størst, og du kan ofte få et tilbud samme uge.",
    exampleHomeType: "75 m² lejlighed på Nørrebro",
  },
  {
    slug: "aarhus",
    name: "Aarhus",
    region: "Midtjylland",
    population: "290.000",
    postalRange: "8000–8270",
    lat: 56.1629,
    lng: 10.2039,
    hourlyLow: 275,
    hourlyHigh: 420,
    flatLow: 550,
    flatHigh: 880,
    neighborhoods: [
      "Midtbyen", "Aarhus C", "Trøjborg", "Risskov",
      "Højbjerg", "Viby", "Brabrand", "Egå",
    ],
    intro:
      "Aarhus er Danmarks næststørste rengøringsmarked og har vokset markant de sidste 5 år i takt med byens befolkning. Mange firmaer dækker både midtby og forstæder, og du finder ofte BoligJob-godkendte udbydere.",
    localFactor:
      "Aarhus ligger 5–10% under København på timepris, men over landsgennemsnittet. Studenterboliger og rækkehuse i forstæderne udgør størstedelen af opgaverne.",
    exampleHomeType: "85 m² lejlighed i Aarhus C",
  },
  {
    slug: "odense",
    name: "Odense",
    region: "Syddanmark",
    population: "180.000",
    postalRange: "5000–5270",
    lat: 55.4038,
    lng: 10.4024,
    hourlyLow: 250,
    hourlyHigh: 390,
    flatLow: 500,
    flatHigh: 820,
    neighborhoods: [
      "Centrum", "Hunderup", "Bolbro", "Dalum",
      "Hjallese", "Bellinge", "Næsby", "Seden",
    ],
    intro:
      "Odense er Fyns største rengøringsmarked med solid dækning i både midtby og forstæder. Priserne ligger lige under landsgennemsnit, og du finder både små én-mands firmaer og større etablerede udbydere.",
    localFactor:
      "Lavere lønniveau og kortere transport mellem opgaver holder priserne i Odense moderate. Mange virksomheder dækker hele Fyn — også Nyborg, Middelfart og Faaborg.",
    exampleHomeType: "95 m² rækkehus i Dalum",
  },
  {
    slug: "aalborg",
    name: "Aalborg",
    region: "Nordjylland",
    population: "120.000",
    postalRange: "9000–9220",
    lat: 57.0488,
    lng: 9.9217,
    hourlyLow: 245,
    hourlyHigh: 385,
    flatLow: 490,
    flatHigh: 800,
    neighborhoods: [
      "Midtby", "Vejgaard", "Hasseris", "Vestbyen",
      "Aalborg Øst", "Nørresundby", "Gug", "Skalborg",
    ],
    intro:
      "Aalborg har et veletableret marked for både privat- og erhvervsrengøring, ikke mindst på grund af universitetet og det voksende erhvervsliv ved havnefronten.",
    localFactor:
      "Priserne i Aalborg er blandt landets laveste i de større byer. Mange firmaer dækker også Hjørring og Frederikshavn, hvis du bor lidt uden for byen.",
    exampleHomeType: "70 m² lejlighed i Vestbyen",
  },
  {
    slug: "esbjerg",
    name: "Esbjerg",
    region: "Syddanmark",
    population: "72.000",
    postalRange: "6700–6715",
    lat: 55.4760,
    lng: 8.4593,
    hourlyLow: 240,
    hourlyHigh: 380,
    flatLow: 480,
    flatHigh: 780,
    neighborhoods: [
      "Centrum", "Strandby", "Sædding", "Gjesing",
      "Hjerting", "Tjæreborg", "Bramming", "Ribe",
    ],
    intro:
      "Esbjerg er Vestjyllands rengøringscentrum og dækker både privat, erhverv og industrirengøring takket være offshore- og havneerhvervet. Markedet er mindre end de fire største byer, men solidt.",
    localFactor:
      "Lavere bopriser og lønniveau betyder, at rengøring i Esbjerg ofte er 15–20% billigere end i København. Mange firmaer dækker også Varde, Ribe og Fanø.",
    exampleHomeType: "110 m² parcelhus i Sædding",
  },
];

export const findCity = (slug?: string) =>
  CITIES.find((c) => c.slug === slug?.toLowerCase());