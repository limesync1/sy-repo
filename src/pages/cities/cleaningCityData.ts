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
  {
    slug: "horsens",
    name: "Horsens",
    region: "Midtjylland",
    population: "60.000",
    postalRange: "8700–8740",
    lat: 55.8607,
    lng: 9.8503,
    hourlyLow: 235,
    hourlyHigh: 375,
    flatLow: 470,
    flatHigh: 770,
    neighborhoods: [
      "Midtbyen", "Stensballe", "Torsted", "Egebjerg",
      "Hatting", "Vejlbygade", "Sønderbro", "Bygholm",
    ],
    intro:
      "Horsens har vokset hurtigt med tilflyttere fra Aarhus og Trekantsområdet, hvilket har skabt et travlt rengøringsmarked med både lokale og landsdækkende udbydere. Mange firmaer dækker også Brædstrup, Hedensted og Juelsminde uden ekstra kørsel.",
    localFactor:
      "Priserne i Horsens ligger 5–10% under landsgennemsnittet. Den store andel parcelhuse i Stensballe og Torsted gør 14-dags abonnement til den mest udbredte aftaleform.",
    exampleHomeType: "120 m² parcelhus i Stensballe",
  },
  {
    slug: "silkeborg",
    name: "Silkeborg",
    region: "Midtjylland",
    population: "47.000",
    postalRange: "8600–8632",
    lat: 56.1697,
    lng: 9.5466,
    hourlyLow: 235,
    hourlyHigh: 375,
    flatLow: 470,
    flatHigh: 770,
    neighborhoods: [
      "Midtbyen", "Alderslyst", "Gødvad", "Funder",
      "Resenbro", "Sejs-Svejbæk", "Balle", "Buskelund",
    ],
    intro:
      "Silkeborg er Søhøjlandets vækstcentrum, og rengøringsmarkedet er drevet af mange tilflyttere og en stor andel villaer ved søerne. Mange firmaer dækker også Kjellerup, Bjerringbro og Skanderborg.",
    localFactor:
      "Sommerhuse og søvillaer giver højere efterspørgsel på vinduespudsning og hovedrengøring i forsommeren. Priserne ligger på niveau med resten af Midtjylland.",
    exampleHomeType: "130 m² villa ved Silkeborg Langsø",
  },
  {
    slug: "herning",
    name: "Herning",
    region: "Midtjylland",
    population: "50.000",
    postalRange: "7400–7480",
    lat: 56.1389,
    lng: 8.9779,
    hourlyLow: 225,
    hourlyHigh: 365,
    flatLow: 450,
    flatHigh: 750,
    neighborhoods: [
      "Midtbyen", "Tjørring", "Snejbjerg", "Lind",
      "Gullestrup", "Hammerum", "Birk", "Sønder Felding",
    ],
    intro:
      "Herning er Vestjyllands erhvervscentrum med en stor andel pendlere og familier i parcelhuse, hvilket holder rengøringsmarkedet stabilt hele året. Konkurrencen mellem lokale firmaer holder priserne blandt landets laveste.",
    localFactor:
      "Korte afstande mellem forstæderne og fri parkering minimerer kørselstid — derfor er timepris ofte mere attraktiv end fast pris i Herning. Mange firmaer dækker også Ikast, Brande og Holstebro.",
    exampleHomeType: "110 m² parcelhus i Tjørring",
  },
  {
    slug: "roskilde",
    name: "Roskilde",
    region: "Sjælland",
    population: "52.000",
    postalRange: "4000–4030",
    lat: 55.6415,
    lng: 12.0803,
    hourlyLow: 275,
    hourlyHigh: 420,
    flatLow: 550,
    flatHigh: 880,
    neighborhoods: [
      "Midtbyen", "Trekroner", "Himmelev", "Veddelev",
      "Svogerslev", "Hyrdehøj", "Vindinge", "Jyllinge",
    ],
    intro:
      "Roskilde er pendlerby til København og har et veletableret rengøringsmarked med mange udbydere, der også dækker Greve, Lejre og Køge. Priserne ligger tæt på københavnsniveau pga. den korte afstand til hovedstaden.",
    localFactor:
      "Mange tilflyttere fra København driver efterspørgslen på fast rengøring i parcelhuskvartererne. Universitetet og DTU-campus i Trekroner skaber også en stabil studenter-/forskerefterspørgsel.",
    exampleHomeType: "110 m² villa i Himmelev",
  },
  {
    slug: "helsingoer",
    name: "Helsingør",
    region: "Hovedstaden",
    population: "47.000",
    postalRange: "3000–3070",
    lat: 56.0361,
    lng: 12.6136,
    hourlyLow: 285,
    hourlyHigh: 435,
    flatLow: 570,
    flatHigh: 910,
    neighborhoods: [
      "Midtbyen", "Snekkersten", "Espergærde", "Hellebæk",
      "Ålsgårde", "Gurre", "Tikøb", "Hornbæk",
    ],
    intro:
      "Helsingør og hele kysten Snekkersten–Hornbæk har en stor andel sommerhuse og helårsvillaer med højere kvadratmeterantal end gennemsnittet, hvilket presser efterspørgslen på hovedrengøring og fraflytningsrengøring op.",
    localFactor:
      "Strandvejen mellem Helsingør og København er en korridor mange firmaer dækker — du kan derfor ofte få københavnerpriser uden nordsjællandstillæg, hvis du booker i god tid.",
    exampleHomeType: "150 m² villa i Espergærde",
  },
  {
    slug: "naestved",
    name: "Næstved",
    region: "Sjælland",
    population: "43.000",
    postalRange: "4700–4736",
    lat: 55.2293,
    lng: 11.7607,
    hourlyLow: 245,
    hourlyHigh: 385,
    flatLow: 485,
    flatHigh: 800,
    neighborhoods: [
      "Centrum", "Grimstrup", "Holsted", "Ladby",
      "Fensmark", "Herlufmagle", "Rønnebæk", "Karrebæksminde",
    ],
    intro:
      "Næstved er Sydsjællands største by og har et bredt rengøringsmarked, der dækker både private hjem og en betydelig erhvervssektor (Maglemølle, industrier). Lokale firmaer dækker også Vordingborg, Slagelse og Faxe.",
    localFactor:
      "Korte afstande i selve byen og lave huslejeniveauer holder priserne moderate. Sommerhuse i Karrebæksminde driver sæsonbetonet efterspørgsel på fraflytningsrengøring.",
    exampleHomeType: "115 m² parcelhus i Grimstrup",
  },
  {
    slug: "frederiksberg",
    name: "Frederiksberg",
    region: "Hovedstaden",
    population: "105.000",
    postalRange: "1800–2000",
    lat: 55.6786,
    lng: 12.5345,
    hourlyLow: 305,
    hourlyHigh: 470,
    flatLow: 610,
    flatHigh: 980,
    neighborhoods: [
      "Frederiksberg C", "Falkoner Alle", "Søndermarken", "Lindevang",
      "Smallegade", "Aksel Møllers Have", "Forum", "Frederiksberg Have",
    ],
    intro:
      "Frederiksberg har Danmarks højeste boligpriser pr. m² og en stor andel lejligheder med høj loftshøjde og stuk — det giver et travlt og højtbetalt rengøringsmarked med mange faste, ugentlige aftaler.",
    localFactor:
      "Klassiske patricierlejligheder med store vinduer og stuk kræver mere tid pr. m² end almindelige lejligheder. Mange firmaer kombinerer rengøring med vinduespudsning og polish af parket.",
    exampleHomeType: "95 m² 3-vær. på Frederiksberg C",
  },
  {
    slug: "hilleroed",
    name: "Hillerød",
    region: "Hovedstaden",
    population: "35.000",
    postalRange: "3400–3450",
    lat: 55.9285,
    lng: 12.3019,
    hourlyLow: 275,
    hourlyHigh: 420,
    flatLow: 550,
    flatHigh: 880,
    neighborhoods: [
      "Centrum", "Ullerød", "Slotsherrensvej", "Salpetermosen",
      "Hammersholt", "Tirsdagskvarteret", "Nødebo", "Gørløse",
    ],
    intro:
      "Hillerød er Nordsjællands regionscenter med store parcelhuskvarterer omkring Frederiksborg Slot og Slotsherrensvej. Mange tilflyttere fra København driver efterspørgslen, og priserne ligger 5–10% under selve hovedstaden.",
    localFactor:
      "Mange børnefamilier i fuldtidsarbejde gør 14-dags abonnement til standarden. Lokale firmaer dækker også Allerød, Fredensborg og Helsinge uden meromkostning.",
    exampleHomeType: "130 m² villa i Ullerød",
  },
  {
    slug: "holstebro",
    name: "Holstebro",
    region: "Midtjylland",
    population: "37.000",
    postalRange: "7500–7560",
    lat: 56.3608,
    lng: 8.6160,
    hourlyLow: 215,
    hourlyHigh: 355,
    flatLow: 430,
    flatHigh: 720,
    neighborhoods: [
      "Centrum", "Mejdal", "Tvis", "Skave",
      "Vinderup", "Idom", "Nørre Felding", "Skals",
    ],
    intro:
      "Holstebro har et solidt rengøringsmarked drevet af en stærk erhvervsbase (J. Hvidtved Larsen, Vestas) og mange villakvarterer. Priserne er blandt landets laveste, og udvalget af lokale udbydere er stort.",
    localFactor:
      "Lavt lønniveau og korte afstande gør Holstebro til et af landets billigste markeder. Mange firmaer dækker også Struer, Lemvig og Vinderup.",
    exampleHomeType: "120 m² parcelhus i Mejdal",
  },
  {
    slug: "slagelse",
    name: "Slagelse",
    region: "Sjælland",
    population: "34.000",
    postalRange: "4200–4242",
    lat: 55.4039,
    lng: 11.3556,
    hourlyLow: 245,
    hourlyHigh: 385,
    flatLow: 485,
    flatHigh: 800,
    neighborhoods: [
      "Centrum", "Sørbymagle", "Korsør", "Skælskør",
      "Slots Bjergby", "Vemmelev", "Boeslunde", "Halsskov",
    ],
    intro:
      "Slagelse er Vestsjællands centrum og dækker også Korsør og Skælskør med samme udbydere. Markedet er præget af mange små lokale firmaer der konkurrerer med landsdækkende kæder.",
    localFactor:
      "Kort afstand til motorvejen og lave omkostninger holder priserne moderate. Mange firmaer kombinerer privat- og erhvervsrengøring til de mange industrivirksomheder i området.",
    exampleHomeType: "110 m² parcelhus i Sørbymagle",
  },
];

export const findCity = (slug?: string) =>
  CITIES.find((c) => c.slug === slug?.toLowerCase());