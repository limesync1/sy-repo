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
  {
    slug: "randers",
    name: "Randers",
    region: "Midtjylland",
    population: "63.000",
    postalRange: "8900–8983",
    lat: 56.4607,
    lng: 10.0369,
    hourlyLow: 235,
    hourlyHigh: 375,
    flatLow: 470,
    flatHigh: 760,
    neighborhoods: [
      "Midtbyen", "Vorup", "Dronningborg", "Kristrup",
      "Hornbæk", "Helsted", "Paderup", "Assentoft",
    ],
    intro:
      "Randers er Østjyllands sjette største by og har et stabilt rengøringsmarked drevet af industri, plejecentre og en voksende andel småbørnsfamilier i forstæderne. Mange firmaer dækker også Hadsten, Langå og Hobro.",
    localFactor:
      "Lavere lønniveau og kortere afstande mellem opgaver holder timeprisen 10–20% under landsgennemsnittet. Erhvervsrengøring fylder en større del af markedet end i de fleste tilsvarende byer.",
    exampleHomeType: "100 m² parcelhus i Kristrup",
  },
  {
    slug: "kolding",
    name: "Kolding",
    region: "Syddanmark",
    population: "62.000",
    postalRange: "6000–6093",
    lat: 55.4904,
    lng: 9.4722,
    hourlyLow: 245,
    hourlyHigh: 385,
    flatLow: 485,
    flatHigh: 790,
    neighborhoods: [
      "Centrum", "Seest", "Bramdrupdam", "Vonsild",
      "Strandhuse", "Munkebo", "Eltang", "Christiansfeld",
    ],
    intro:
      "Kolding er trekantsområdets logistik-knudepunkt og har et bredt udvalg af rengøringsfirmaer der dækker både privat, erhverv og industri. Markedet er præget af konkurrence fra både lokale og landsdækkende kæder.",
    localFactor:
      "Geografisk midt i Jylland: mange firmaer dækker også Vejle, Fredericia og Middelfart uden ekstra kørsel. Priserne ligger lige under landsgennemsnittet.",
    exampleHomeType: "120 m² parcelhus i Seest",
  },
  {
    slug: "vejle",
    name: "Vejle",
    region: "Syddanmark",
    population: "60.000",
    postalRange: "7100–7184",
    lat: 55.7090,
    lng: 9.5350,
    hourlyLow: 245,
    hourlyHigh: 385,
    flatLow: 485,
    flatHigh: 790,
    neighborhoods: [
      "Centrum", "Søndermarken", "Nørremarken", "Mølholm",
      "Uhrhøj", "Bredballe", "Grejsdalen", "Hover",
    ],
    intro:
      "Vejle har et veletableret rengøringsmarked drevet af pendlersamfundet til Trekantsområdet og en stor andel parcelhuse i forstæderne. Mange firmaer kombinerer privat- og erhvervsrengøring.",
    localFactor:
      "Topografien (bakker, skove) giver længere kørselstider end gennemsnittet — firmaer i Vejle prissætter ofte fast pris frem for timepris. Boligjob-fradraget bruges aktivt af de fleste familier.",
    exampleHomeType: "115 m² parcelhus i Bredballe",
  },
];

export const findCity = (slug?: string) =>
  CITIES.find((c) => c.slug === slug?.toLowerCase());