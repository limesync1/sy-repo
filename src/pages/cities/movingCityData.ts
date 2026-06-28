// By-specifik konfiguration for flyttehjælp-landingssider. Hver by har
// unikt indhold (priser, eksempler, lokale forhold).

export interface CityMovingContent {
  slug: string;
  name: string;
  region: string;
  postalRange: string;
  hourlyLow: number;       // To mænd + bil, kr./time inkl. moms
  hourlyHigh: number;
  smallMoveLow: number;    // 1-2 vær. lejlighed, fast pris
  smallMoveHigh: number;
  villaMoveLow: number;    // Villa 4-5 vær.
  villaMoveHigh: number;
  intro: string;
  localFactor: string;
  popularRoutes: string[]; // Typiske flytteruter fra/til
}

export const MOVING_CITIES: CityMovingContent[] = [
  {
    slug: "koebenhavn",
    name: "København",
    region: "Hovedstaden",
    postalRange: "1000–2500",
    hourlyLow: 650, hourlyHigh: 1100,
    smallMoveLow: 2800, smallMoveHigh: 5500,
    villaMoveLow: 12000, villaMoveHigh: 28000,
    intro:
      "København har Danmarks største flyttebranche — fra én-mands varevogne til store flytteforretninger med lagre. Konkurrencen er hård, men de høje lønninger og snæver indre by gør priserne højere end resten af landet.",
    localFactor:
      "Etagebyggeri uden elevator, manglende parkering og ensrettede gader øger tidsforbruget markant. Mange firmaer kører fast pris for kendte adresser i brokvartererne. Tidsbestilling i sommermånederne bør ske 4-6 uger frem.",
    popularRoutes: ["Nørrebro → Vesterbro", "Indre By → Frederiksberg", "København → Aarhus", "København → Roskilde", "Østerbro → Amager"],
  },
  {
    slug: "aarhus",
    name: "Aarhus",
    region: "Midtjylland",
    postalRange: "8000–8270",
    hourlyLow: 595, hourlyHigh: 950,
    smallMoveLow: 2500, smallMoveHigh: 4800,
    villaMoveLow: 10000, villaMoveHigh: 24000,
    intro:
      "Aarhus har et veletableret flyttemarked drevet af universitetet og det voksende erhvervsliv. Studenterflytninger i juni–august presser priserne op, mens efterår og vinter typisk er 15–20% billigere.",
    localFactor:
      "Centrum og Trøjborg har snæver parkering — bestil parkeringstilladelse i god tid. Forstæderne (Risskov, Højbjerg, Brabrand) går hurtigere og er billigere pr. m³.",
    popularRoutes: ["Midtbyen → Risskov", "Aarhus C → Højbjerg", "Aarhus → København", "Aarhus → Skanderborg", "Trøjborg → Viby"],
  },
  {
    slug: "odense",
    name: "Odense",
    region: "Syddanmark",
    postalRange: "5000–5270",
    hourlyLow: 550, hourlyHigh: 880,
    smallMoveLow: 2200, smallMoveHigh: 4200,
    villaMoveLow: 8500, villaMoveHigh: 20000,
    intro:
      "Odense er Fyns flyttecentrum med fri parkering i de fleste boligområder, hvilket gør flytninger hurtigere end i Kbh/Aarhus. Mange firmaer dækker hele Fyn — inkl. Nyborg, Middelfart og Faaborg.",
    localFactor:
      "Korte afstande og lette tilkørsler holder priserne moderate. Letbanens udbygning har øget efterspørgslen i Hjallese og Hunderup-områderne.",
    popularRoutes: ["Centrum → Dalum", "Hunderup → Hjallese", "Odense → København", "Odense → Aarhus", "Odense → Svendborg"],
  },
  {
    slug: "aalborg",
    name: "Aalborg",
    region: "Nordjylland",
    postalRange: "9000–9220",
    hourlyLow: 525, hourlyHigh: 850,
    smallMoveLow: 2100, smallMoveHigh: 4000,
    villaMoveLow: 8000, villaMoveHigh: 19000,
    intro:
      "Aalborg har Danmarks næstvækstkraftigste flyttemarked drevet af universitetet og den nye havnefront. Lokale firmaer dækker både Aalborg, Nørresundby og oplandet helt op til Frederikshavn.",
    localFactor:
      "Aalborg har generelt god parkering og brede veje, så flytninger går hurtigere end i de største byer. Mange firmaer giver fast pris også på lange ture til København.",
    popularRoutes: ["Vejgaard → Hasseris", "Midtby → Aalborg Øst", "Aalborg → København", "Aalborg → Aarhus", "Nørresundby → Vestbyen"],
  },
  {
    slug: "esbjerg",
    name: "Esbjerg",
    region: "Syddanmark",
    postalRange: "6700–6715",
    hourlyLow: 495, hourlyHigh: 800,
    smallMoveLow: 1900, smallMoveHigh: 3700,
    villaMoveLow: 7500, villaMoveHigh: 17500,
    intro:
      "Esbjerg er Vestjyllands flyttecentrum og dækker både privat- og erhvervsflytninger — sidstnævnte ofte for offshore- og havneindustrien. Priserne er blandt landets laveste i de større byer.",
    localFactor:
      "Lavere lønniveau og god infrastruktur giver effektive flytninger. Mange firmaer dækker også Varde, Ribe, Bramming og Fanø (sidstnævnte med færgetillæg).",
    popularRoutes: ["Centrum → Sædding", "Strandby → Hjerting", "Esbjerg → København", "Esbjerg → Aarhus", "Esbjerg → Ribe"],
  },
  {
    slug: "randers",
    name: "Randers",
    region: "Midtjylland",
    postalRange: "8900–8983",
    hourlyLow: 475, hourlyHigh: 760,
    smallMoveLow: 1850, smallMoveHigh: 3500,
    villaMoveLow: 7200, villaMoveHigh: 17000,
    intro:
      "Randers er et solidt mellem-stort flyttemarked med korte afstande og rigelig parkering. Lokale firmaer dækker også Hobro, Hadsten og Langå og prissætter ofte fast pris frem for timer.",
    localFactor:
      "Hverken brokvartersparkering eller storbytrafik trækker tiden ud — flytninger i Randers tager typisk 20–30% færre timer end i de fire største byer.",
    popularRoutes: ["Midtbyen → Kristrup", "Vorup → Dronningborg", "Randers → Aarhus", "Randers → Aalborg", "Randers → Hobro"],
  },
  {
    slug: "kolding",
    name: "Kolding",
    region: "Syddanmark",
    postalRange: "6000–6093",
    hourlyLow: 495, hourlyHigh: 795,
    smallMoveLow: 1950, smallMoveHigh: 3700,
    villaMoveLow: 7500, villaMoveHigh: 17500,
    intro:
      "Kolding ligger centralt i Trekantsområdet og har et af Danmarks mest effektive flyttemarkeder. Mange firmaer er specialiserede i langture (København, Aarhus, Hamburg) og kører fast pris.",
    localFactor:
      "Motorvejsadgang fra E45 og E20 gør Kolding til et oplagt udgangspunkt for flytninger til/fra Sjælland og Tyskland. Lokale flytninger er hurtige takket være fri parkering.",
    popularRoutes: ["Centrum → Vonsild", "Seest → Bramdrupdam", "Kolding → København", "Kolding → Aarhus", "Kolding → Vejle"],
  },
  {
    slug: "vejle",
    name: "Vejle",
    region: "Syddanmark",
    postalRange: "7100–7184",
    hourlyLow: 495, hourlyHigh: 795,
    smallMoveLow: 1950, smallMoveHigh: 3700,
    villaMoveLow: 7500, villaMoveHigh: 17500,
    intro:
      "Vejle har et travlt flyttemarked drevet af pendlersamfundet til hele Trekantsområdet. Mange firmaer dækker både Vejle, Horsens, Fredericia og Kolding uden ekstra kørselstillæg.",
    localFactor:
      "Bakkede gader i centrum kan give flere etager-tillæg end i flade byer — bed om besigtigelse til villaflytninger. Forstæderne (Bredballe, Mølholm) er hurtigere og billigere.",
    popularRoutes: ["Centrum → Bredballe", "Søndermarken → Mølholm", "Vejle → København", "Vejle → Aarhus", "Vejle → Horsens"],
  },
  {
    slug: "horsens",
    name: "Horsens",
    region: "Midtjylland",
    postalRange: "8700–8740",
    hourlyLow: 475, hourlyHigh: 760,
    smallMoveLow: 1850, smallMoveHigh: 3500,
    villaMoveLow: 7200, villaMoveHigh: 17000,
    intro:
      "Horsens har et travlt flyttemarked drevet af pendlere mellem Aarhus og Trekantsområdet. Mange firmaer er specialiserede i langture mod København og Tyskland og giver konkurrencedygtige fastpriser.",
    localFactor:
      "Motorvejstilkørsel og fri parkering i forstæderne (Stensballe, Torsted) holder flyttetiden nede. Centrum kan kræve gågadetilladelse til varevognen.",
    popularRoutes: ["Centrum → Stensballe", "Torsted → Egebjerg", "Horsens → Aarhus", "Horsens → København", "Horsens → Vejle"],
  },
  {
    slug: "silkeborg",
    name: "Silkeborg",
    region: "Midtjylland",
    postalRange: "8600–8632",
    hourlyLow: 475, hourlyHigh: 760,
    smallMoveLow: 1850, smallMoveHigh: 3500,
    villaMoveLow: 7200, villaMoveHigh: 17000,
    intro:
      "Silkeborgs flyttemarked vokser i takt med tilflytningen fra Aarhus. Mange firmaer dækker også Kjellerup, Bjerringbro og Skanderborg, og specialfirmaer håndterer søvillaer med begrænset adgang.",
    localFactor:
      "Smalle veje ved søerne og store villaer med klaverer/specialinventar giver flere tilbud med besigtigelse end gennemsnittet. Lange Aarhus-flytninger er almindelige.",
    popularRoutes: ["Centrum → Gødvad", "Alderslyst → Sejs-Svejbæk", "Silkeborg → Aarhus", "Silkeborg → København", "Silkeborg → Viborg"],
  },
  {
    slug: "herning",
    name: "Herning",
    region: "Midtjylland",
    postalRange: "7400–7480",
    hourlyLow: 465, hourlyHigh: 745,
    smallMoveLow: 1800, smallMoveHigh: 3400,
    villaMoveLow: 7000, villaMoveHigh: 16500,
    intro:
      "Herning har et stabilt flyttemarked drevet af pendlere og en stor erhvervssektor (messecenter, modebranchen). Lokale firmaer dækker også Ikast, Brande og Holstebro uden ekstra kørselstillæg.",
    localFactor:
      "Brede veje og fri parkering gør flytninger hurtige og effektive — typisk 20–30% færre timer end i de fire største byer. Mange firmaer giver fast pris.",
    popularRoutes: ["Centrum → Tjørring", "Snejbjerg → Lind", "Herning → Aarhus", "Herning → Holstebro", "Herning → København"],
  },
  {
    slug: "roskilde",
    name: "Roskilde",
    region: "Sjælland",
    postalRange: "4000–4030",
    hourlyLow: 595, hourlyHigh: 950,
    smallMoveLow: 2400, smallMoveHigh: 4500,
    villaMoveLow: 9500, villaMoveHigh: 22000,
    intro:
      "Roskilde er pendlerby til København og har et travlt flyttemarked med mange firmaer der dækker hele Sjælland. Mange flytninger går mellem Roskilde og København — typisk fast pris.",
    localFactor:
      "Korte afstande til København giver konkurrence med københavnske firmaer. Forstæderne (Himmelev, Veddelev) har god parkering; centrum kan kræve tilladelse.",
    popularRoutes: ["Centrum → Himmelev", "Trekroner → Svogerslev", "Roskilde → København", "Roskilde → Lejre", "Roskilde → Køge"],
  },
  {
    slug: "helsingoer",
    name: "Helsingør",
    region: "Hovedstaden",
    postalRange: "3000–3070",
    hourlyLow: 595, hourlyHigh: 980,
    smallMoveLow: 2500, smallMoveHigh: 4700,
    villaMoveLow: 10000, villaMoveHigh: 23000,
    intro:
      "Helsingør og hele Nordkysten har mange villaflytninger med store volumener, og firmaerne på strandvejskorridoren dækker oftest hele strækningen til København. Mange grænseflytninger til Sverige ekspederes også her.",
    localFactor:
      "Smalle veje i Snekkersten/Hornbæk og store villaer i Espergærde giver længere flyttetider end gennemsnittet. Bestil besigtigelse til villaflytninger over 150 m².",
    popularRoutes: ["Centrum → Espergærde", "Snekkersten → Hornbæk", "Helsingør → København", "Helsingør → Hillerød", "Helsingør → Malmö"],
  },
  {
    slug: "naestved",
    name: "Næstved",
    region: "Sjælland",
    postalRange: "4700–4736",
    hourlyLow: 485, hourlyHigh: 785,
    smallMoveLow: 1900, smallMoveHigh: 3600,
    villaMoveLow: 7400, villaMoveHigh: 17500,
    intro:
      "Næstved er Sydsjællands flyttecentrum og dækker et stort opland med Vordingborg, Slagelse og Faxe. Mange flytninger går til København (pendlere) eller Tyskland.",
    localFactor:
      "Fri parkering og lavt huslejeniveau holder priserne nede. Sommerhuse i Karrebæksminde giver sæsonbetonet topbelastning i juni–august.",
    popularRoutes: ["Centrum → Grimstrup", "Ladby → Fensmark", "Næstved → København", "Næstved → Vordingborg", "Næstved → Slagelse"],
  },
  {
    slug: "hilleroed",
    name: "Hillerød",
    region: "Hovedstaden",
    postalRange: "3400–3450",
    hourlyLow: 575, hourlyHigh: 930,
    smallMoveLow: 2400, smallMoveHigh: 4500,
    villaMoveLow: 9500, villaMoveHigh: 22000,
    intro:
      "Hillerød er Nordsjællands regionscenter med mange villaflytninger og en del børnefamilier, der flytter til/fra København. Lokale firmaer dækker hele Nordsjælland.",
    localFactor:
      "Store villaer og børnefamilier giver typisk større volumen og længere flyttedag end gennemsnittet. Forstæderne har god parkering; centrum kræver tilladelse i sommermånederne.",
    popularRoutes: ["Centrum → Ullerød", "Hammersholt → Hillerød Øst", "Hillerød → København", "Hillerød → Allerød", "Hillerød → Helsingør"],
  },
  {
    slug: "slagelse",
    name: "Slagelse",
    region: "Sjælland",
    postalRange: "4200–4242",
    hourlyLow: 475, hourlyHigh: 775,
    smallMoveLow: 1850, smallMoveHigh: 3500,
    villaMoveLow: 7200, villaMoveHigh: 17000,
    intro:
      "Slagelse dækker også Korsør og Skælskør med samme udbydere og er et naturligt knudepunkt for flytninger mellem Sjælland og Fyn via Storebæltsbroen. Mange firmaer kører langture.",
    localFactor:
      "Motorvejen E20 går gennem byen — godt udgangspunkt for både Sjælland og Fyn-Jylland. Korsør har en del lejligheder uden elevator, hvilket øger tiden.",
    popularRoutes: ["Centrum → Sørbymagle", "Korsør → Slagelse", "Slagelse → København", "Slagelse → Odense", "Slagelse → Næstved"],
  },
];

export const findMovingCity = (slug?: string) =>
  MOVING_CITIES.find((c) => c.slug === slug?.toLowerCase());