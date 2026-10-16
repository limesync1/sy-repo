// By-specifikt indhold til vinduespudser- og malersider. Priserne ligger inden
// for de landsdækkende intervaller i prisguiderne og justeres efter lokalt
// prisniveau; tekster beskriver lokale boligtyper, så siderne ikke er kopier.

export interface TradeCity {
  slug: string;
  name: string;
  region: string;
  postalRange: string;
  /** [lav, høj] — vinduespudser kr./vindue (abonnement) eller maler kr./m² væg */
  unitLow: number;
  unitHigh: number;
  /** [lav, høj] — standard villa pr. besøg (vinduer) eller timepris (maler) */
  refLow: number;
  refHigh: number;
  intro: string;
  localFactor: string;
  areas: string[];
}

export const WINDOW_CITIES: TradeCity[] = [
  { slug: "koebenhavn", name: "København", region: "Hovedstaden", postalRange: "1000–2500", unitLow: 32, unitHigh: 45, refLow: 650, refHigh: 1200,
    intro: "I København er de fleste kunder lejligheder i etageejendomme på Nørrebro, Østerbro og Vesterbro. Mange vinduer er dannebrogsvinduer med sprosser, som tager længere tid at pudse end store glasflader.",
    localFactor: "Vinduer over 1. sal pudses ofte indefra eller med teleskopstang, og parkering koster tid og penge. Derfor ligger prisen pr. vindue højere end i resten af landet. En fast aftale for hele opgangen kan give rabat.",
    areas: ["Indre By", "Østerbro", "Nørrebro", "Vesterbro", "Amager", "Valby", "Vanløse", "Brønshøj"] },
  { slug: "aarhus", name: "Aarhus", region: "Midtjylland", postalRange: "8000–8270", unitLow: 28, unitHigh: 42, refLow: 550, refHigh: 1050,
    intro: "Aarhus har en blanding af lejligheder i Midtbyen og Frederiksbjerg og parcelhuse i Risskov, Højbjerg og Viby. Mange villakunder har en fast aftale hver 4. eller 8. uge.",
    localFactor: "Huse tæt på bugten i Risskov og Egå får salt på ruderne og skal ofte pudses oftere. Nybyggeri i Aarhus Ø har store glaspartier, som afregnes pr. m² i stedet for pr. vindue.",
    areas: ["Midtbyen", "Frederiksbjerg", "Risskov", "Højbjerg", "Viby", "Brabrand", "Aarhus Ø", "Tilst"] },
  { slug: "odense", name: "Odense", region: "Syddanmark", postalRange: "5000–5270", unitLow: 26, unitHigh: 40, refLow: 500, refHigh: 950,
    intro: "Odense har mange parcelhuse og rækkehuse i Hjallese, Tarup og Dalum. Vinduespudsning bestilles typisk som fast aftale hver 6.–8. uge.",
    localFactor: "Prisniveauet er lidt lavere end i København og Aarhus, fordi kørsel og parkering er nemmere. Ældre huse i Odense C har ofte koblede vinduer, som skal pudses på fire sider.",
    areas: ["Odense C", "Hjallese", "Dalum", "Tarup", "Bolbro", "Vollsmose", "Fraugde", "Bellinge"] },
  { slug: "aalborg", name: "Aalborg", region: "Nordjylland", postalRange: "9000–9220", unitLow: 25, unitHigh: 40, refLow: 500, refHigh: 950,
    intro: "I Aalborg bor mange i parcelhuse i Vejgaard, Hasseris og Nørresundby. Studieboliger og lejligheder i centrum er typisk små opgaver med 5–8 vinduer.",
    localFactor: "Vestenvind og fjordluft giver hurtigt snavsede ruder, så mange vælger pudsning hver 4. uge i sommerhalvåret. Villaer i Hasseris har ofte store vinduespartier, som trækker prisen op.",
    areas: ["Aalborg C", "Hasseris", "Vejgaard", "Nørresundby", "Gug", "Vestbyen", "Skalborg", "Svenstrup"] },
  { slug: "esbjerg", name: "Esbjerg", region: "Syddanmark", postalRange: "6700–6715", unitLow: 25, unitHigh: 38, refLow: 480, refHigh: 900,
    intro: "Esbjerg har mange villaer og rækkehuse i Hjerting, Sædding og Gjesing. Vinduespudsning bestilles ofte som fast aftale for hele året.",
    localFactor: "Nærheden til Vesterhavet giver salt og sand på ruderne, især i Hjerting og Sædding. Pudseren bruger derfor ofte rent vand og en ekstra omgang, og det kan koste lidt mere.",
    areas: ["Esbjerg C", "Hjerting", "Sædding", "Gjesing", "Jerne", "Tarp", "Bramming", "Ribe"] },
  { slug: "randers", name: "Randers", region: "Midtjylland", postalRange: "8900–8983", unitLow: 25, unitHigh: 38, refLow: 480, refHigh: 900,
    intro: "Randers består mest af parcelhuse i Vorup, Kristrup og Dronningborg. De fleste kunder har en fast aftale hver 8. uge.",
    localFactor: "Prisniveauet i Randers er blandt de laveste for de store byer. Mange firmaer dækker også oplandet, fx Assentoft og Langå, uden ekstra kørselsgebyr.",
    areas: ["Randers C", "Vorup", "Kristrup", "Dronningborg", "Romalt", "Assentoft", "Langå", "Spentrup"] },
  { slug: "kolding", name: "Kolding", region: "Syddanmark", postalRange: "6000–6093", unitLow: 26, unitHigh: 40, refLow: 500, refHigh: 950,
    intro: "Kolding har mange villakvarterer i Bramdrupdam, Seest og Strandhuse. Både private og mindre butikker i centrum har faste aftaler.",
    localFactor: "Huse ved fjorden i Strandhuse og Skærbæk ligger åbent for vind og får hurtigt snavsede ruder. Villaer med ovenlysvinduer eller kviste koster ekstra, da de kræver stige.",
    areas: ["Kolding C", "Bramdrupdam", "Seest", "Strandhuse", "Sønder Bjert", "Vamdrup", "Lunderskov", "Christiansfeld"] },
  { slug: "vejle", name: "Vejle", region: "Syddanmark", postalRange: "7100–7184", unitLow: 26, unitHigh: 40, refLow: 500, refHigh: 1000,
    intro: "Vejle har mange huse på skrånende grunde i Nørremarken og Mølholm og nye boliger ved havnen. Vinduespudsning er en af de mest bestilte serviceydelser i byen.",
    localFactor: "Huse på bakker har ofte vinduer i to niveauer på samme side, som kræver stige. Moderne lejligheder ved havnen har store glasfacader, der afregnes pr. m².",
    areas: ["Vejle C", "Nørremarken", "Mølholm", "Søndermarken", "Vinding", "Bredballe", "Give", "Jelling"] },
  { slug: "horsens", name: "Horsens", region: "Midtjylland", postalRange: "8700–8740", unitLow: 25, unitHigh: 38, refLow: 480, refHigh: 900,
    intro: "Horsens vokser hurtigt med nye parceller i Stensballe og Egebjerg. Mange nye huse har store vinduespartier og få sprosser, så pudsningen går hurtigt.",
    localFactor: "Nye huse er hurtige at pudse og giver en lav pris pr. vindue. Ældre byhuse i centrum med smalle vinduer og sprosser tager længere tid.",
    areas: ["Horsens C", "Stensballe", "Egebjerg", "Torsted", "Lund", "Hatting", "Brædstrup", "Gedved"] },
  { slug: "roskilde", name: "Roskilde", region: "Sjælland", postalRange: "4000–4040", unitLow: 28, unitHigh: 42, refLow: 550, refHigh: 1050,
    intro: "Roskilde har mange villaer i Himmelev, Svogerslev og Vor Frue. Prisniveauet ligger tæt på hovedstadsområdet.",
    localFactor: "Store villahaver giver lang afstand mellem bil og hus, og ældre villaer har ofte sprossevinduer. Begge dele trækker prisen lidt op i forhold til Jylland.",
    areas: ["Roskilde C", "Himmelev", "Svogerslev", "Vor Frue", "Trekroner", "Gadstrup", "Jyllinge", "Viby Sj."] },
];

export const PAINTER_CITIES: TradeCity[] = [
  { slug: "koebenhavn", name: "København", region: "Hovedstaden", postalRange: "1000–2500", unitLow: 120, unitHigh: 180, refLow: 525, refHigh: 625,
    intro: "I København maler malere især lejligheder i etageejendomme, ofte ved fraflytning eller salg. Høje lofter med stuk i ældre ejendomme på Østerbro og Frederiksberg tager længere tid end almindelige lofter.",
    localFactor: "Parkering, trapper uden elevator og afdækning af gamle trægulve lægger tid til opgaven. Derfor ligger priserne i den høje ende. Ved fraflytning er der ofte en fast frist, så bestil i god tid.",
    areas: ["Indre By", "Østerbro", "Nørrebro", "Vesterbro", "Amager", "Valby", "Vanløse", "Brønshøj"] },
  { slug: "aarhus", name: "Aarhus", region: "Midtjylland", postalRange: "8000–8270", unitLow: 110, unitHigh: 170, refLow: 495, refHigh: 595,
    intro: "Aarhus har mange lejligheder i Midtbyen og Trøjborg, som males ved studenterflytninger, og parcelhuse i Viby og Risskov, som males indvendigt og udvendigt.",
    localFactor: "Juli og august er travle måneder på grund af studieflytninger, så malerne kan være booket. Udvendigt træværk på villaer males bedst fra maj til september.",
    areas: ["Midtbyen", "Trøjborg", "Frederiksbjerg", "Risskov", "Højbjerg", "Viby", "Brabrand", "Aarhus Ø"] },
  { slug: "odense", name: "Odense", region: "Syddanmark", postalRange: "5000–5270", unitLow: 100, unitHigh: 160, refLow: 475, refHigh: 575,
    intro: "Odense har mange parcelhuse og rækkehuse, hvor malerarbejde typisk er stue, køkken og soveværelser. Ældre byhuse i Odense C har ofte vægge, der skal spartles først.",
    localFactor: "Spartling af ujævne vægge i ældre huse koster typisk 30–60 kr. ekstra pr. m². Prisniveauet er ellers lidt lavere end i hovedstaden.",
    areas: ["Odense C", "Hjallese", "Dalum", "Tarup", "Bolbro", "Fraugde", "Bellinge", "Paarup"] },
  { slug: "aalborg", name: "Aalborg", region: "Nordjylland", postalRange: "9000–9220", unitLow: 95, unitHigh: 155, refLow: 465, refHigh: 565,
    intro: "I Aalborg bestilles maler både til lejligheder i centrum og til villaer i Hasseris og Gug. Mange husejere får malet udvendigt træværk hvert 5.–8. år.",
    localFactor: "Fugt og vind fra fjorden slider på udvendigt træværk. Malerne anbefaler ofte at skrabe og grunde gammel maling, og det koster ekstra.",
    areas: ["Aalborg C", "Hasseris", "Vejgaard", "Nørresundby", "Gug", "Vestbyen", "Skalborg", "Svenstrup"] },
  { slug: "esbjerg", name: "Esbjerg", region: "Syddanmark", postalRange: "6700–6715", unitLow: 95, unitHigh: 150, refLow: 460, refHigh: 560,
    intro: "Esbjerg har mange villaer fra 1960'erne og 70'erne, hvor indvendig maling ofte kombineres med maling af træloft og vinduer.",
    localFactor: "Salt luft fra Vesterhavet nedbryder udvendig maling hurtigere. Til facader og vindskeder vælger malerne derfor ofte mere slidstærk maling.",
    areas: ["Esbjerg C", "Hjerting", "Sædding", "Gjesing", "Jerne", "Tarp", "Bramming", "Ribe"] },
  { slug: "randers", name: "Randers", region: "Midtjylland", postalRange: "8900–8983", unitLow: 90, unitHigh: 150, refLow: 450, refHigh: 550,
    intro: "Randers er domineret af parcelhuse, hvor de mest bestilte opgaver er indvendig maling af hele huset før salg og maling af udvendigt træværk.",
    localFactor: "Prisniveauet er blandt de laveste for større byer. Malerfirmaer i Randers dækker ofte også Langå, Assentoft og Spentrup.",
    areas: ["Randers C", "Vorup", "Kristrup", "Dronningborg", "Romalt", "Assentoft", "Langå", "Spentrup"] },
  { slug: "kolding", name: "Kolding", region: "Syddanmark", postalRange: "6000–6093", unitLow: 100, unitHigh: 160, refLow: 470, refHigh: 570,
    intro: "Kolding har både nye huse i Bramdrupdam og ældre villaer i centrum. Erhvervskunder bestiller ofte maling af kontorer uden for arbejdstid.",
    localFactor: "Malerarbejde i nye huse er ofte hurtigt, fordi væggene er glatte. Ældre villaer har mere træværk og ofte vægge, der skal spartles.",
    areas: ["Kolding C", "Bramdrupdam", "Seest", "Strandhuse", "Sønder Bjert", "Vamdrup", "Lunderskov", "Christiansfeld"] },
  { slug: "vejle", name: "Vejle", region: "Syddanmark", postalRange: "7100–7184", unitLow: 100, unitHigh: 165, refLow: 470, refHigh: 575,
    intro: "Vejle har mange huse på skrånende grunde og nye lejligheder ved havnen. Høje rum og trappeopgange kræver ofte stillads eller lift.",
    localFactor: "Trappeopgange med dobbelt loftshøjde koster mere, fordi der skal stillads op. Nye lejligheder ved havnen males ofte før indflytning.",
    areas: ["Vejle C", "Nørremarken", "Mølholm", "Søndermarken", "Vinding", "Bredballe", "Give", "Jelling"] },
  { slug: "horsens", name: "Horsens", region: "Midtjylland", postalRange: "8700–8740", unitLow: 95, unitHigh: 155, refLow: 460, refHigh: 560,
    intro: "Horsens har mange nye parcelhuse i Stensballe og Egebjerg, hvor malerarbejde ofte er første maling efter byggeriet.",
    localFactor: "Nybyggede huse skal ofte grundes og spartles første gang, så de er dyrere at male end senere. Ældre byhuse i centrum har typisk meget træværk.",
    areas: ["Horsens C", "Stensballe", "Egebjerg", "Torsted", "Lund", "Hatting", "Brædstrup", "Gedved"] },
  { slug: "roskilde", name: "Roskilde", region: "Sjælland", postalRange: "4000–4040", unitLow: 110, unitHigh: 170, refLow: 495, refHigh: 600,
    intro: "Roskilde har mange ældre villaer i Vor Frue og Himmelev og nyere boliger i Trekroner. Udvendig maling af træhuse og vinduer er en hyppig opgave.",
    localFactor: "Prisniveauet ligger tæt på hovedstadsområdet. Ældre villaer har mange sprossevinduer, som tager tid at male, og det trækker prisen op.",
    areas: ["Roskilde C", "Himmelev", "Svogerslev", "Vor Frue", "Trekroner", "Gadstrup", "Jyllinge", "Viby Sj."] },
];

export const findTradeCity = (list: TradeCity[], slug?: string) =>
  list.find((c) => c.slug === slug?.toLowerCase());
