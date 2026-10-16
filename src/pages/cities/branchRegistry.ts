// Register over branche-bysider (/{kind}/:city). Hver branche kombinerer de
// fælles byfakta med sine egne tekster og prisintervaller fra prisguiden.
import { CITY_FACTS, findCityFact, type CityFact } from "./cityFacts";
import { PAINTER_CITIES, WINDOW_CITIES, type TradeCity } from "./tradeCityData";

export interface BranchCity extends TradeCity { slug: string }

export interface Branch {
  kind: string;
  label: string;
  /** Ubestemt form til brødtekst, fx "en elektriker". */
  one: string;
  plural: string;
  category: string;
  priceGuide: string;
  unit: string;
  ref: string;
  unitBase: [number, number];
  refBase: [number, number];
  rows: (c: BranchCity) => [string, string][];
  tasks: string[];
  deduction: string;
  text: (f: CityFact) => { intro: string; local: string };
  overrides?: TradeCity[];
}

const r5 = (n: number) => Math.round(n / 5) * 5;
const fmt = (n: number) => n.toLocaleString("da-DK");

export const BRANCHES: Branch[] = [
  {
    kind: "vinduespudser", label: "Vinduespudser", one: "en vinduespudser", plural: "vinduespudsere", category: "Vinduespudsning", priceGuide: "/priser/vinduespudser",
    unit: "kr. pr. vindue (fast aftale)", ref: "kr. pr. besøg, villa med 20–25 vinduer", unitBase: [26, 40], refBase: [500, 950],
    rows: (c) => [
      ["Pris pr. vindue, fast aftale", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Pris pr. vindue, engangsbesøg", `${c.unitLow + 10}–${c.unitHigh + 15} kr.`],
      ["Lejlighed (5–8 vinduer)", `${fmt(c.unitLow * 6)}–${fmt(c.unitHigh * 8)} kr.`],
      ["Villa (20–25 vinduer)", `${fmt(c.refLow)}–${fmt(c.refHigh)} kr.`],
    ],
    tasks: ["Fast vinduespudsning hver 4., 6. eller 8. uge", "Pudsning ind- og udvendigt", "Ovenlys og kviste", "Rammer og karme", "Erhverv og butiksruder"],
    deduction: "Ja. Vinduespudsning er omfattet af servicefradraget i BoligJob-ordningen. Du skal betale digitalt, og firmaet skal være momsregistreret.",
    text: (f) => ({
      intro: `I ${f.name} pudser vinduespudsere mest hos ${f.housing}. De fleste har en fast aftale hver 6.–8. uge, som er billigere pr. vindue end et engangsbesøg.`,
      local: `${f.climate} I ${f.older} er der ofte sprossevinduer, som tager længere tid, mens ${f.newer} har store glasflader, der går hurtigt.`,
    }),
    overrides: WINDOW_CITIES,
  },
  {
    kind: "maler", label: "Maler", one: "en maler", plural: "malere", category: "Maler", priceGuide: "/priser/maler",
    unit: "kr. pr. m² væg (2 lag, inkl. maling)", ref: "kr. i timen inkl. moms", unitBase: [100, 160], refBase: [470, 570],
    rows: (c) => [
      ["Vægmaling, 2 lag", `${c.unitLow}–${c.unitHigh} kr./m²`],
      ["Loftmaling", `${c.unitLow + 20}–${c.unitHigh + 20} kr./m²`],
      ["Timepris", `${c.refLow}–${c.refHigh} kr.`],
      ["Spartling før maling", "+30–60 kr./m²"],
    ],
    tasks: ["Maling af stue og soveværelser", "Maling før salg eller ved fraflytning", "Lofter og træværk", "Udvendigt træværk og vinduer", "Spartling af ujævne vægge"],
    deduction: "Malerarbejde i en helårsbolig kan give håndværkerfradrag efter BoligJob-ordningens gældende regler. Kun arbejdslønnen tæller, og du skal betale digitalt.",
    text: (f) => ({
      intro: `Malere i ${f.name} arbejder især hos ${f.housing}. Typiske opgaver er stue og soveværelser, maling før salg og udvendigt træværk.`,
      local: `I ${f.older} skal væggene ofte spartles først, og det koster 30–60 kr. ekstra pr. m². ${f.climate}`,
    }),
    overrides: PAINTER_CITIES,
  },
  {
    kind: "elektriker", label: "Elektriker", one: "en elektriker", plural: "elektrikere", category: "Elektriker", priceGuide: "/priser/elektriker",
    unit: "kr. i timen inkl. moms", ref: "kr. for udkald i dagtid", unitBase: [495, 750], refBase: [450, 850],
    rows: (c) => [
      ["Timepris", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Udkald i dagtid", `${c.refLow}–${c.refHigh} kr.`],
      ["Ny stikkontakt", `${fmt(r5(c.unitLow * 1.6))}–${fmt(r5(c.unitHigh * 2.2))} kr.`],
      ["Ladestander til elbil, installeret", "8.000–15.000 kr."],
    ],
    tasks: ["Nye stikkontakter og lampeudtag", "Skift af HFI/fejlstrømsafbryder", "Ny eltavle", "Ladestander til elbil", "Fejlfinding ved strømsvigt"],
    deduction: "Visse el-opgaver kan give fradrag under BoligJob-ordningen, fx installation af ladestander i visse år. Tjek de gældende regler hos Skattestyrelsen.",
    text: (f) => ({
      intro: `En elektriker i ${f.name} koster typisk det samme som i resten af ${f.region}, men opgaverne er forskellige. Hos ${f.housing} er de mest bestilte opgaver nye stikkontakter, lamper og ladestandere.`,
      local: `I ${f.older} er el-installationen ofte gammel, så nyt HFI-relæ eller ny eltavle er almindeligt. I ${f.newer} handler det mest om ladestandere og intelligent styring.`,
    }),
  },
  {
    kind: "vvs", label: "VVS", one: "en VVS'er", plural: "VVS-installatører", category: "VVS", priceGuide: "/priser/vvs",
    unit: "kr. i timen inkl. moms", ref: "kr. for udkald i dagtid", unitBase: [525, 750], refBase: [450, 900],
    rows: (c) => [
      ["Timepris", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Udkald i dagtid", `${c.refLow}–${c.refHigh} kr.`],
      ["Skift af toilet, inkl. arbejdsløn", "3.500–6.500 kr."],
      ["Skift af blandingsbatteri", "1.200–2.400 kr."],
    ],
    tasks: ["Skift af toilet og håndvask", "Utætte rør og dryppende haner", "Nyt blandingsbatteri", "Service på fjernvarme eller gasfyr", "Stoppede afløb"],
    deduction: "VVS-arbejde giver som udgangspunkt kun fradrag, hvis det er en del af en energiforbedring efter BoligJob-ordningens regler. Tjek de gældende regler hos Skattestyrelsen.",
    text: (f) => ({
      intro: `VVS-installatører i ${f.name} har mest travlt hos ${f.housing}. Skift af toilet, nye blandingsbatterier og utætte rør er de mest bestilte opgaver.`,
      local: `I ${f.older} er der ofte gamle rør, som kan give overraskelser, når væggen åbnes. ${f.climate}`,
    }),
  },
  {
    kind: "toemrer", label: "Tømrer", one: "en tømrer", plural: "tømrere", category: "Tømrer", priceGuide: "/priser/tomrer",
    unit: "kr. i timen inkl. moms", ref: "kr. pr. m² for nyt trægulv inkl. arbejdsløn", unitBase: [525, 675], refBase: [450, 850],
    rows: (c) => [
      ["Timepris", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Nyt trægulv inkl. arbejdsløn", `${c.refLow}–${c.refHigh} kr./m²`],
      ["Ny terrasse (20 m²)", "28.000–50.000 kr."],
      ["Montering af dør", "1.500–3.500 kr."],
    ],
    tasks: ["Terrasse og overdækning", "Nye døre og vinduer", "Gulve og lofter", "Tagrenovering", "Køkkenmontering"],
    deduction: "Tømrerarbejde som efterisolering og nye energivinduer kan give håndværkerfradrag efter BoligJob-ordningens regler. Kun arbejdslønnen tæller.",
    text: (f) => ({
      intro: `Tømrere i ${f.name} bygger især terrasser, skifter døre og vinduer og lægger gulve hos ${f.housing}.`,
      local: `I ${f.older} handler opgaverne ofte om at bevare gammelt træværk, mens ${f.newer} mest får terrasser og overdækninger. ${f.climate}`,
    }),
  },
  {
    kind: "murer", label: "Murer", one: "en murer", plural: "murere", category: "Murer", priceGuide: "/priser/murer",
    unit: "kr. i timen inkl. moms", ref: "kr. pr. m² for fliser i badeværelse", unitBase: [475, 625], refBase: [450, 750],
    rows: (c) => [
      ["Timepris", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Fliser i badeværelse", `${c.refLow}–${c.refHigh} kr./m²`],
      ["Omfugning af facade", "350–600 kr./m²"],
      ["Reparation af revne", "3.000–8.000 kr."],
    ],
    tasks: ["Nyt badeværelse og fliser", "Omfugning af facade", "Revner i mur og fundament", "Pudsning af sokkel", "Skorstensreparation"],
    deduction: "Murerarbejde kan give håndværkerfradrag, når det er en del af en energiforbedring efter BoligJob-ordningens regler. Kun arbejdslønnen tæller.",
    text: (f) => ({
      intro: `Murere i ${f.name} laver mest badeværelser, omfugning og reparation af revner hos ${f.housing}.`,
      local: `${f.older} har ofte gammelt murværk, som skal omfuges eller have pudset sokkel. ${f.climate}`,
    }),
  },
  {
    kind: "kloakmester", label: "Kloakmester", one: "en kloakmester", plural: "kloakmestre", category: "VVS", priceGuide: "/priser/kloakmester",
    unit: "kr. for TV-inspektion med rapport", ref: "kr. for spuling af afløb", unitBase: [2500, 4500], refBase: [1800, 3500],
    rows: (c) => [
      ["TV-inspektion med rapport", `${fmt(c.unitLow)}–${fmt(c.unitHigh)} kr.`],
      ["Spuling af afløb", `${fmt(c.refLow)}–${fmt(c.refHigh)} kr.`],
      ["Strømpeforing", "2.500–4.500 kr./m"],
      ["Udskiftning af kloakrør (opgravning)", "3.500–6.500 kr./m"],
    ],
    tasks: ["Stoppet afløb og spuling", "TV-inspektion før huskøb", "Rotter i kloakken", "Strømpeforing", "Separatkloakering"],
    deduction: "Kloakarbejde giver som regel ikke håndværkerfradrag. Separatkloakering kan dog være omfattet af kommunale tilskud — spørg din kommune.",
    text: (f) => ({
      intro: `Kloakmestre i ${f.name} rykker oftest ud til stoppede afløb og TV-inspektion hos ${f.housing}.`,
      local: `I ${f.older} er kloakrørene ofte af gamle betonrør, som revner og giver rotter. ${f.climate}`,
    }),
  },
  {
    kind: "skadedyr", label: "Skadedyrsbekæmpelse", one: "en skadedyrsbekæmper", plural: "skadedyrsbekæmpere", category: "Skadedyrsbekæmpelse", priceGuide: "/priser/skadedyr",
    unit: "kr. for ét besøg", ref: "kr. for et komplet forløb", unitBase: [700, 1500], refBase: [1500, 3500],
    rows: (c) => [
      ["Enkelt besøg", `${fmt(c.unitLow)}–${fmt(c.unitHigh)} kr.`],
      ["Komplet forløb (fx mus eller kakerlakker)", `${fmt(c.refLow)}–${fmt(c.refHigh)} kr.`],
      ["Hvepsebo", "700–1.500 kr."],
      ["Væggelus, hele boligen", "3.500–8.000 kr."],
    ],
    tasks: ["Mus og rotter", "Hvepsebo", "Væggelus", "Kakerlakker og møl", "Sikring mod gnavere"],
    deduction: "Skadedyrsbekæmpelse giver ikke fradrag. Rotter skal anmeldes til kommunen, som sørger for gratis bekæmpelse.",
    text: (f) => ({
      intro: `Skadedyrsbekæmpere i ${f.name} får flest opkald om mus, hvepse og væggelus fra ${f.housing}.`,
      local: `I ${f.older} kan mus og rotter komme ind gennem gamle kloakrør og revner. Husk at rotter skal anmeldes til kommunen, som bekæmper dem gratis.`,
    }),
  },
  {
    kind: "gulvlaegger", label: "Gulvlægger", one: "en gulvlægger", plural: "gulvlæggere", category: "Gulvlægger", priceGuide: "/priser/gulvlaegger",
    unit: "kr. pr. m² for lægning af trægulv", ref: "kr. pr. m² for gulvafslibning", unitBase: [175, 300], refBase: [150, 300],
    rows: (c) => [
      ["Lægning af trægulv/plankegulv", `${c.unitLow}–${c.unitHigh} kr./m²`],
      ["Gulvafslibning og lakering", `${c.refLow}–${c.refHigh} kr./m²`],
      ["Klikgulv (laminat)", "150–300 kr./m²"],
      ["Fodpaneler", "60–120 kr./lbm"],
    ],
    tasks: ["Nyt trægulv eller klikgulv", "Afslibning af gamle plankegulve", "Lakering og olie", "Fodpaneler og overgange", "Vinyl og linoleum"],
    deduction: "Gulvlægning giver normalt ikke håndværkerfradrag efter de gældende BoligJob-regler. Tjek reglerne hos Skattestyrelsen.",
    text: (f) => ({
      intro: `Gulvlæggere i ${f.name} lægger især nye gulve og sliber gamle gulve hos ${f.housing}.`,
      local: `I ${f.older} ligger der ofte gamle plankegulve, som kan slibes op i stedet for at blive skiftet. I ${f.newer} er klikgulve og vinyl mest almindeligt.`,
    }),
  },
  {
    kind: "skorstensfejer", label: "Skorstensfejer", one: "en skorstensfejer", plural: "skorstensfejere", category: "Skorstensfejer", priceGuide: "/priser/skorstensfejer",
    unit: "kr. for fejning af brændeovn", ref: "kr. for ekstra fejning eller udkald", unitBase: [350, 650], refBase: [550, 900],
    rows: (c) => [
      ["Lovpligtig fejning af brændeovn", `${c.unitLow}–${c.unitHigh} kr.`],
      ["Ekstra fejning/udkald", `${c.refLow}–${c.refHigh} kr.`],
      ["Syn af ny brændeovn", "650–1.100 kr."],
      ["Skorstensinspektion med kamera", "1.200–2.500 kr."],
    ],
    tasks: ["Lovpligtig fejning", "Syn af ny brændeovn", "Kamera-inspektion af skorsten", "Rådgivning om brandsikkerhed", "Fejning af oliefyr"],
    deduction: "Skorstensfejning giver ikke fradrag. Fejning er lovpligtig, og kommunen bestemmer, hvilken skorstensfejer der dækker dit område.",
    text: (f) => ({
      intro: `I ${f.name} fejer skorstensfejeren især brændeovne og pejse hos ${f.housing}. Fejning er lovpligtig, og kommunen har en fast skorstensfejer for området.`,
      local: `${f.older} har ofte gamle skorstene, som bør tjekkes med kamera før en ny brændeovn sættes op. ${f.climate}`,
    }),
  },
  {
    kind: "varmepumpe", label: "Varmepumpe", one: "en varmepumpe", plural: "varmepumpe-installatører", category: "VVS", priceGuide: "/priser/varmepumpe",
    unit: "kr. for luft-til-luft-varmepumpe installeret", ref: "kr. for årligt eftersyn", unitBase: [18000, 28000], refBase: [1200, 2500],
    rows: (c) => [
      ["Luft-til-luft, installeret", `${c.unitLow.toLocaleString("da-DK")}–${c.unitHigh.toLocaleString("da-DK")} kr.`],
      ["Luft-til-vand, installeret", "125.000–160.000 kr."],
      ["Årligt eftersyn", `${c.refLow.toLocaleString("da-DK")}–${c.refHigh.toLocaleString("da-DK")} kr.`],
      ["Fjernelse af gammelt oliefyr", "10.000–35.000 kr."],
    ],
    tasks: ["Luft-til-luft-varmepumpe", "Luft-til-vand-varmepumpe", "Udskiftning af oliefyr eller gasfyr", "Årligt eftersyn", "Rådgivning om tilskud"],
    deduction: "Installation af varmepumpe kan give håndværkerfradrag for arbejdslønnen, og der kan være statslige tilskud til udskiftning af olie- og gasfyr. Tjek de gældende regler.",
    text: (f) => ({
      intro: `Varmepumper i ${f.name} sættes mest op hos ${f.housing}, hvor de afløser oliefyr, gasfyr eller elvarme.`,
      local: `${f.older} er ofte dårligt isoleret, så en luft-til-vand-pumpe skal dimensioneres omhyggeligt. Tjek også, om der kommer fjernvarme til dit område, før du vælger.`,
    }),
  },
  {
    kind: "tagdaekker", label: "Tagdækker", one: "et nyt tag", plural: "tagdækkere", category: "Håndværker", priceGuide: "/priser/nyt-tag",
    unit: "kr. pr. m² for nyt betontegltag", ref: "kr. pr. m² for nyt tegltag", unitBase: [1050, 1400], refBase: [1250, 1700],
    rows: (c) => [
      ["Nyt tag med betontegl", `${c.unitLow.toLocaleString("da-DK")}–${c.unitHigh.toLocaleString("da-DK")} kr./m²`],
      ["Nyt tag med vingetegl", `${c.refLow.toLocaleString("da-DK")}–${c.refHigh.toLocaleString("da-DK")} kr./m²`],
      ["Nyt tag med stål eller eternit", "1.150–1.550 kr./m²"],
      ["Tagrender og nedløb, parcelhus", "12.000–28.000 kr."],
    ],
    tasks: ["Nyt tag på parcelhus", "Udskiftning af tagrender", "Efterisolering af loft", "Reparation efter storm", "Tagvinduer og ovenlys"],
    deduction: "Nyt tag giver som udgangspunkt ikke håndværkerfradrag, men efterisolering af loftet i samme forbindelse kan give fradrag for arbejdslønnen.",
    text: (f) => ({
      intro: `Et nyt tag i ${f.name} er en af de største opgaver hos ${f.housing}. Mange huse fra 1960'erne og 70'erne har nu tage, der er slidt op.`,
      local: `${f.climate} I ${f.older} kræver tagudskiftning ofte, at man bevarer husets oprindelige udtryk.`,
    }),
  },
  {
    kind: "badevaerelse", label: "Nyt badeværelse", one: "et nyt badeværelse", plural: "badeværelsesfirmaer", category: "Håndværker", priceGuide: "/priser/nyt-badevaerelse",
    unit: "kr. pr. m² for badeværelse i standardkvalitet", ref: "kr. for et komplet badeværelse på 6 m²", unitBase: [22000, 35000], refBase: [110000, 165000],
    rows: (c) => [
      ["Badeværelse, standard", `${c.unitLow.toLocaleString("da-DK")}–${c.unitHigh.toLocaleString("da-DK")} kr./m²`],
      ["Komplet badeværelse, 6 m²", `${c.refLow.toLocaleString("da-DK")}–${c.refHigh.toLocaleString("da-DK")} kr.`],
      ["Stort eller eksklusivt badeværelse", "180.000–280.000 kr."],
      ["Gulvvarme i badeværelse", "12.000–35.000 kr."],
    ],
    tasks: ["Komplet renovering af badeværelse", "Ny bruseniche", "Fliser og vådrumsmembran", "Gulvvarme", "Nyt toilet og håndvask"],
    deduction: "Badeværelsesrenovering giver normalt ikke håndværkerfradrag efter de gældende regler. Tjek reglerne hos Skattestyrelsen.",
    text: (f) => ({
      intro: `Et nyt badeværelse i ${f.name} er en af de mest bestilte renoveringer hos ${f.housing}. Murer, VVS'er og elektriker skal arbejde sammen, så det er en fordel at få ét samlet tilbud.`,
      local: `I ${f.older} er der ofte gamle rør og gulve, som skal udskiftes, før de nye fliser lægges. Det kan gøre prisen højere end forventet.`,
    }),
  },
  {
    kind: "vinduesudskiftning", label: "Vinduesudskiftning", one: "et nyt vindue", plural: "vinduesfirmaer", category: "Tømrer", priceGuide: "/priser/vinduesudskiftning",
    unit: "kr. pr. vindue inkl. montering", ref: "kr. for en terrassedør inkl. montering", unitBase: [5500, 9500], refBase: [11000, 18000],
    rows: (c) => [
      ["Nyt vindue inkl. montering", `${c.unitLow.toLocaleString("da-DK")}–${c.unitHigh.toLocaleString("da-DK")} kr.`],
      ["Terrassedør inkl. montering", `${c.refLow.toLocaleString("da-DK")}–${c.refHigh.toLocaleString("da-DK")} kr.`],
      ["Alle vinduer i et parcelhus", "28.000–55.000 kr. pr. facade"],
      ["Bortskaffelse af gamle vinduer", "350–600 kr./stk."],
    ],
    tasks: ["Nye energivinduer", "Ny terrassedør", "Skift af ruder", "Fugning og tætning", "Bortskaffelse af gamle vinduer"],
    deduction: "Udskiftning til energivinduer kan give håndværkerfradrag for arbejdslønnen efter BoligJob-ordningens regler.",
    text: (f) => ({
      intro: `Nye vinduer i ${f.name} bestilles især hos ${f.housing}, hvor gamle vinduer giver træk og høje varmeregninger.`,
      local: `${f.climate} I ${f.older} kan der være krav om, at nye vinduer ligner de gamle — tjek med kommunen, før du bestiller.`,
    }),
  },
  {
    kind: "anlaegsgartner", label: "Anlægsgartner", one: "en anlægsgartner", plural: "anlægsgartnere", category: "Anlægsgartner", priceGuide: "/priser/anlaegsgartner",
    unit: "kr. pr. m² for belægning med fliser", ref: "kr. pr. lbm for ny hæk inkl. plantning", unitBase: [1200, 2200], refBase: [250, 450],
    rows: (c) => [
      ["Fliser og belægning", `${c.unitLow.toLocaleString("da-DK")}–${c.unitHigh.toLocaleString("da-DK")} kr./m²`],
      ["Ny hæk inkl. plantning", `${c.refLow}–${c.refHigh} kr./lbm`],
      ["Natursten og klinker", "1.800–3.500 kr./m²"],
      ["Indkørsel (ca. 25 m²)", "35.000–65.000 kr."],
    ],
    tasks: ["Ny indkørsel og flisebelægning", "Terrasse i sten", "Plantning af hæk", "Nyt græs og rullegræs", "Dræn og afvanding"],
    deduction: "Anlægsgartnerarbejde giver normalt ikke håndværkerfradrag, men almindelig havepleje er omfattet af servicefradraget.",
    text: (f) => ({
      intro: `Anlægsgartnere i ${f.name} lægger især nye indkørsler, terrasser og hække hos ${f.housing}.`,
      local: `${f.climate} I ${f.newer} skal haven ofte anlægges fra bunden, mens ældre haver mest får ny belægning.`,
    }),
  },
  {
    kind: "algebehandling", label: "Algebehandling", one: "en algebehandling", plural: "firmaer til algebehandling", category: "Algebehandling", priceGuide: "/priser/algebehandling",
    unit: "kr. pr. m² for algebehandling af tag", ref: "kr. pr. m² for rensning af fliser og belægning", unitBase: [25, 40], refBase: [30, 55],
    rows: (c) => [
      ["Algebehandling af tag", `${c.unitLow}–${c.unitHigh} kr./m²`],
      ["Rensning af fliser og belægning", `${c.refLow}–${c.refHigh} kr./m²`],
      ["Facaderens", "20–40 kr./m²"],
      ["Tag på parcelhus (ca. 150 m²)", "4.500–7.500 kr."],
    ],
    tasks: ["Algebehandling af tag", "Rensning af fliser og terrasse", "Facaderens", "Mosfjernelse", "Imprægnering efter rensning"],
    deduction: "Algebehandling giver normalt ikke fradrag. Rengøring af tagrender kan dog være omfattet af servicefradraget.",
    text: (f) => ({
      intro: `Algebehandling i ${f.name} bestilles mest til tage og terrasser hos ${f.housing}.`,
      local: `${f.climate} Grønne alger vokser hurtigst på tage i skygge og på nordsiden, så de skal ofte behandles hvert 2.–4. år.`,
    }),
  },
];

export const findBranch = (kind: string) => BRANCHES.find((b) => b.kind === kind);

/** Bygger én by for en branche — håndskrevet indhold vinder, ellers genereret. */
export const branchCity = (b: Branch, slug?: string): BranchCity | null => {
  const over = b.overrides?.find((c) => c.slug === slug?.toLowerCase());
  if (over) return over;
  const f = findCityFact(slug);
  if (!f) return null;
  const { intro, local } = b.text(f);
  return {
    slug: f.slug, name: f.name, region: f.region, postalRange: f.postalRange,
    unitLow: r5(b.unitBase[0] * f.factor) || b.unitBase[0], unitHigh: r5(b.unitBase[1] * f.factor) || b.unitBase[1],
    refLow: r5(b.refBase[0] * f.factor), refHigh: r5(b.refBase[1] * f.factor),
    intro, localFactor: local, areas: f.areas,
  };
};

/** Alle byer for en branche (fælles byfakta + evt. håndskrevne byer). */
export const branchCities = (b: Branch): BranchCity[] => {
  const slugs = new Set([...(b.overrides ?? []).map((c) => c.slug), ...CITY_FACTS.map((c) => c.slug)]);
  return [...slugs].map((s) => branchCity(b, s)!).filter(Boolean);
};
