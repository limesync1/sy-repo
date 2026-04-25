// ─────────────────────────────────────────────────────────────────────────────
// Servicebranche-katalog — kurateret efter dansk CVR-branchestruktur
// med fokus på UDKØRENDE serviceydende virksomheder (B2C + B2B) —
// dvs. virksomheder der udfører services på kundens adresse (privat eller
// erhverv). Salons, klinikker, restauranter og rene online-services hører
// ikke hjemme her.
//
// Struktur:
//   gruppe (visuel gruppering ved valg)
//     └── branche (det virksomheden vælger)
//           ├── ikon (emoji — bruges overalt)
//           ├── underbrancher (brugt ved service-oprettelse)
//           └── popular_services (forslag når man opretter en service)
//
// Designprincip: branchevalg styrer hvilke service-typer en virksomhed kan
// oprette i admin-panelet. Underbrancher og forslag bliver kun synlige hvis
// virksomheden har den tilhørende branche valgt.
//
// Eksisterende virksomheder med custom-værdier bevarer dem — kataloget er
// kun en hjælp ved nye oprettelser.
// ─────────────────────────────────────────────────────────────────────────────

export interface IndustrySubcategory {
  /** Vises som chip ved service-oprettelse */
  label: string;
  /** Servicenavn-forslag (kunden kan også skrive sit eget) */
  services: string[];
}

export interface Industry {
  /** Kanonisk værdi gemt i `businesses.categories` og `services.service_category` */
  key: string;
  /** Visning i UI */
  label: string;
  /** Emoji-ikon — bruges i chips, kort og services-liste */
  icon: string;
  /** Kort beskrivelse til help-text når man hovrer/vælger */
  description?: string;
  /** Underbrancher — chips ved service-oprettelse */
  subcategories: IndustrySubcategory[];
}

export interface IndustryGroup {
  /** Visuel gruppe-overskrift i settings (fx "Rengøring & ejendomsservice") */
  label: string;
  industries: Industry[];
}

/* ───────────── Hoveddata ───────────── */
export const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    label: "Rengøring & ejendomsservice",
    industries: [
      {
        key: "Rengøring",
        label: "Rengøring",
        icon: "🧹",
        description: "Privat- og erhvervsrengøring, hovedrengøring m.m.",
        subcategories: [
          { label: "Privatrengøring", services: ["Hjemmerengøring", "Hovedrengøring", "Flytterengøring", "Dødsbo­rengøring"] },
          { label: "Erhvervsrengøring", services: ["Kontorrengøring", "Butiksrengøring", "Industrirengøring", "Klinikrengøring"] },
          { label: "Trappevask", services: ["Trappevask boligforening", "Opgangsrengøring"] },
          { label: "Specialrengøring", services: ["Byggerengøring", "Brand- og vandskaderengøring", "Insektbekæmpelse"] },
        ],
      },
      {
        key: "Vinduespudsning",
        label: "Vinduespudsning",
        icon: "🪟",
        description: "Inde og ude, både privat og erhverv.",
        subcategories: [
          { label: "Privat vinduespudsning", services: ["Indvendig vinduespudsning", "Udvendig vinduespudsning", "Helhedspakke (inde + ude)"] },
          { label: "Erhverv vinduespudsning", services: ["Butiksvinduer", "Kontor­facader", "Glasfacader / højhuse"] },
          { label: "Rentvandsanlæg", services: ["Vinduespudsning med rentvandsanlæg"] },
        ],
      },
      {
        key: "Algebehandling",
        label: "Algebehandling & tagrens",
        icon: "🌧️",
        description: "Behandling af tag, fliser, facade m.m.",
        subcategories: [
          { label: "Tag", services: ["Algebehandling tag", "Tagrens", "Imprægnering tag"] },
          { label: "Fliser & belægning", services: ["Algebehandling fliser", "Højtryksrens fliser", "Imprægnering belægning"] },
          { label: "Facade", services: ["Facaderens", "Algebehandling facade"] },
        ],
      },
      {
        key: "Skadedyrsbekæmpelse",
        label: "Skadedyrsbekæmpelse",
        icon: "🐀",
        subcategories: [
          { label: "Insekter", services: ["Hvepse­bekæmpelse", "Myrebekæmpelse", "Vægge­lus"] },
          { label: "Gnavere", services: ["Rotter", "Mus"] },
          { label: "Forebyggende", services: ["Sikrings­aftale", "Rådgivning"] },
        ],
      },
    ],
  },
  {
    label: "Have & udendørs",
    industries: [
      {
        key: "Haveservice",
        label: "Haveservice",
        icon: "🌿",
        description: "Vedligehold af haver og grønne arealer.",
        subcategories: [
          { label: "Havevedligehold", services: ["Græsslåning", "Hækkeklipning", "Lugning", "Beskæring"] },
          { label: "Træfældning", services: ["Træfældning", "Stub­fræsning", "Topkapning"] },
          { label: "Anlæg", services: ["Beplantning", "Belægning", "Haveprojekt"] },
          { label: "Snerydning", services: ["Snerydning", "Saltning", "Glatfører­bekæmpelse"] },
        ],
      },
      {
        key: "Anlægsgartner",
        label: "Anlægsgartner",
        icon: "🌳",
        subcategories: [
          { label: "Belægning", services: ["Fliser", "Granit­belægning", "Indkørsel"] },
          { label: "Beplantning", services: ["Træer & buske", "Græsplæne", "Bede"] },
        ],
      },
    ],
  },
  {
    label: "Håndværk & byggeri",
    industries: [
      {
        key: "Tømrer",
        label: "Tømrer",
        icon: "🔨",
        subcategories: [
          { label: "Tømrer­arbejde", services: ["Tilbygning", "Tag­arbejde", "Altan", "Indvendig snedkeri"] },
          { label: "Vinduer & døre", services: ["Vindues­montering", "Dør­montering"] },
        ],
      },
      {
        key: "Murer",
        label: "Murer",
        icon: "🧱",
        subcategories: [
          { label: "Murværk", services: ["Nyt murværk", "Reparation", "Skorstene"] },
          { label: "Fliser", services: ["Bade­værelse fliser", "Køkken fliser", "Klinker"] },
          { label: "Facade", services: ["Facaderenovering", "Pudsning"] },
        ],
      },
      {
        key: "Maler",
        label: "Maler",
        icon: "🎨",
        subcategories: [
          { label: "Indvendig maling", services: ["Vægmaling", "Loftmaling", "Lakering"] },
          { label: "Udvendig maling", services: ["Facade­maling", "Vinduer & døre", "Træværk"] },
          { label: "Tapetsering", services: ["Tapetsering", "Fibervæv"] },
        ],
      },
      {
        key: "VVS",
        label: "VVS",
        icon: "🚰",
        subcategories: [
          { label: "Vand & sanitet", services: ["Vandhane", "Toilet", "Bade­værelse"] },
          { label: "Varme", services: ["Radiator", "Gulvvarme", "Varmepumpe"] },
          { label: "Kloak & afløb", services: ["Kloak­service", "Afløb", "Drænarbejde"] },
        ],
      },
      {
        key: "Elektriker",
        label: "Elektriker",
        icon: "⚡",
        subcategories: [
          { label: "El-installation", services: ["Stikkontakter", "Belysning", "El-tavle"] },
          { label: "Smart home", services: ["Smart belysning", "Lade­standere"] },
          { label: "El-tjek", services: ["Eftersyns­rapport", "Sikkerhedsgennemgang"] },
        ],
      },
      {
        key: "Gulvlægger",
        label: "Gulvlægger",
        icon: "🪵",
        subcategories: [
          { label: "Trægulve", services: ["Trægulv", "Slibning & lakering"] },
          { label: "Vinyl & laminat", services: ["Vinylgulv", "Laminat"] },
          { label: "Industri­gulve", services: ["Epoxygulv", "Industrimaling"] },
        ],
      },
      {
        key: "Glarmester",
        label: "Glarmester",
        icon: "🪞",
        subcategories: [
          { label: "Vinduer", services: ["Termoruder", "Vindues­reparation"] },
          { label: "Spejle & glas", services: ["Spejle", "Glasvægge", "Brusedøre"] },
        ],
      },
      {
        key: "Smede",
        label: "Smed",
        icon: "⚙️",
        subcategories: [
          { label: "Stålarbejde", services: ["Hegn", "Gelænder", "Carport"] },
        ],
      },
    ],
  },
  {
    label: "Transport & flytning",
    industries: [
      {
        key: "Flyttehjælp",
        label: "Flyttehjælp",
        icon: "📦",
        subcategories: [
          { label: "Privat flytning", services: ["Lokal flytning", "Langdistance flytning", "Udlandsflytning"] },
          { label: "Erhvervsflytning", services: ["Kontor­flytning", "Lager­flytning"] },
          { label: "Pakke & opbevaring", services: ["Pakke­service", "Opbevaring"] },
        ],
      },
      {
        key: "Vognmand",
        label: "Vognmand & kurer",
        icon: "🚚",
        subcategories: [
          { label: "Levering", services: ["Pakke­levering", "Møbeltransport"] },
          { label: "Bortskaffelse", services: ["Affalds­kørsel", "Container­udlejning"] },
        ],
      },
    ],
  },
  {
    label: "Auto & køretøjer (mobilt)",
    industries: [
      {
        key: "Autoservice",
        label: "Mobil bilpleje",
        icon: "🚗",
        description: "Bilpleje udført på kundens adresse.",
        subcategories: [
          { label: "Bilrengøring", services: ["Indvendig rens", "Udvendig vask", "Polering", "Klargøring til salg"] },
          { label: "Mobilt dækskift", services: ["Dækskift på adressen"] },
        ],
      },
    ],
  },
  {
    label: "Sikkerhed & tryghed",
    industries: [
      {
        key: "Sikkerhed",
        label: "Sikkerhed",
        icon: "🛡️",
        subcategories: [
          { label: "Alarm­systemer", services: ["Tyveri­alarm", "Brand­alarm"] },
          { label: "Video­overvågning", services: ["IP-kamera", "Overvågnings­system"] },
          { label: "Adgang & lås", services: ["Lås­smed", "Adgangs­kontrol"] },
        ],
      },
    ],
  },
  {
    label: "IT & digital",
    industries: [
      {
        key: "IT-service",
        label: "IT-service (på adresse)",
        icon: "💻",
        subcategories: [
          { label: "Installation", services: ["TV & lyd montering", "Smart home installation", "Wi-Fi opsætning"] },
          { label: "Netværk", services: ["Netværks­installation", "Kabel­træk"] },
        ],
      },
    ],
  },
];

/* ───────────── Step-templates pr. branche ───────────── */
// Bruges i prisberegner-trinnet ved service-oprettelse.
// Kun templates for brancher virksomheden har valgt vises.
export interface StepTemplate {
  label: string;
  steps: Array<{ label: string; unit: string; price_per_unit: number; min_value: number; max_value: number; default_value: number }>;
}

export const STEP_TEMPLATES_BY_INDUSTRY: Record<string, StepTemplate[]> = {
  "Rengøring": [
    { label: "Kontor / erhvervsrengøring", steps: [
      { label: "Støvsugning", unit: "m²", price_per_unit: 5, min_value: 10, max_value: 500, default_value: 50 },
      { label: "Tømning af skraldespande", unit: "stk", price_per_unit: 5, min_value: 1, max_value: 50, default_value: 5 },
      { label: "Aftørring af borde", unit: "stk", price_per_unit: 12, min_value: 1, max_value: 50, default_value: 5 },
      { label: "Gulvvask", unit: "m²", price_per_unit: 8, min_value: 10, max_value: 500, default_value: 50 },
    ]},
    { label: "Privat hjemmerengøring", steps: [
      { label: "Antal rum", unit: "rum", price_per_unit: 80, min_value: 1, max_value: 15, default_value: 4 },
      { label: "Badeværelser", unit: "stk", price_per_unit: 120, min_value: 0, max_value: 5, default_value: 1 },
      { label: "Køkken", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 2, default_value: 1 },
    ]},
    { label: "Flytterengøring", steps: [
      { label: "Boligstørrelse", unit: "m²", price_per_unit: 15, min_value: 20, max_value: 300, default_value: 80 },
      { label: "Ovn rengøring", unit: "stk", price_per_unit: 200, min_value: 0, max_value: 2, default_value: 1 },
      { label: "Køleskab rengøring", unit: "stk", price_per_unit: 150, min_value: 0, max_value: 3, default_value: 1 },
    ]},
  ],
  "Vinduespudsning": [
    { label: "Privat vinduespudsning", steps: [
      { label: "Vinduer", unit: "stk", price_per_unit: 25, min_value: 1, max_value: 100, default_value: 10 },
      { label: "Franske altandøre", unit: "stk", price_per_unit: 60, min_value: 0, max_value: 20, default_value: 0 },
      { label: "Ovenlys", unit: "stk", price_per_unit: 45, min_value: 0, max_value: 20, default_value: 0 },
    ]},
    { label: "Erhverv vinduespudsning", steps: [
      { label: "Facade­meter", unit: "m", price_per_unit: 30, min_value: 1, max_value: 200, default_value: 20 },
      { label: "Højde", unit: "m", price_per_unit: 20, min_value: 1, max_value: 20, default_value: 3 },
    ]},
  ],
  "Algebehandling": [
    { label: "Algebehandling tag", steps: [
      { label: "Tagareal", unit: "m²", price_per_unit: 35, min_value: 20, max_value: 500, default_value: 120 },
      { label: "Imprægnering", unit: "m²", price_per_unit: 25, min_value: 0, max_value: 500, default_value: 0 },
    ]},
    { label: "Algebehandling fliser", steps: [
      { label: "Fliseareal", unit: "m²", price_per_unit: 25, min_value: 10, max_value: 500, default_value: 50 },
    ]},
  ],
  "Haveservice": [
    { label: "Græsslåning", steps: [
      { label: "Areal", unit: "m²", price_per_unit: 2, min_value: 50, max_value: 5000, default_value: 200 },
      { label: "Kantklipning", unit: "m", price_per_unit: 5, min_value: 0, max_value: 200, default_value: 20 },
    ]},
    { label: "Hækkeklipning", steps: [
      { label: "Hæklængde", unit: "m", price_per_unit: 40, min_value: 1, max_value: 200, default_value: 10 },
      { label: "Højde", unit: "m", price_per_unit: 30, min_value: 1, max_value: 5, default_value: 2 },
    ]},
  ],
  "Maler": [
    { label: "Vægmaling", steps: [
      { label: "Vægflade", unit: "m²", price_per_unit: 45, min_value: 5, max_value: 500, default_value: 30 },
      { label: "Loftflade", unit: "m²", price_per_unit: 55, min_value: 0, max_value: 200, default_value: 0 },
      { label: "Antal strøg", unit: "stk", price_per_unit: 15, min_value: 1, max_value: 3, default_value: 2 },
    ]},
  ],
  "Tømrer": [
    { label: "Generelt tømrerarbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 450, min_value: 1, max_value: 40, default_value: 4 },
      { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 20000, default_value: 0 },
    ]},
  ],
  "VVS": [
    { label: "VVS-arbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 500, min_value: 1, max_value: 20, default_value: 1 },
      { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 10000, default_value: 0 },
      { label: "Kørsel", unit: "km", price_per_unit: 8, min_value: 0, max_value: 100, default_value: 10 },
    ]},
  ],
  "Elektriker": [
    { label: "El-arbejde", steps: [
      { label: "Arbejdstimer", unit: "timer", price_per_unit: 450, min_value: 1, max_value: 20, default_value: 1 },
      { label: "Stikkontakter", unit: "stk", price_per_unit: 350, min_value: 0, max_value: 20, default_value: 0 },
      { label: "Lampeudtag", unit: "stk", price_per_unit: 400, min_value: 0, max_value: 20, default_value: 0 },
    ]},
  ],
  "Flyttehjælp": [
    { label: "Lokal flytning", steps: [
      { label: "Boligstørrelse", unit: "m²", price_per_unit: 25, min_value: 20, max_value: 300, default_value: 80 },
      { label: "Etager", unit: "stk", price_per_unit: 300, min_value: 0, max_value: 8, default_value: 0 },
      { label: "Mandskab", unit: "timer", price_per_unit: 400, min_value: 1, max_value: 12, default_value: 4 },
    ]},
  ],
};

/* ───────────── Hjælpefunktioner ───────────── */

/** Flad liste over alle brancher (uden grupper) */
export const ALL_INDUSTRIES: Industry[] = INDUSTRY_GROUPS.flatMap((g) => g.industries);

/** Slå en branche op via key (returnerer undefined hvis det er en gammel custom-værdi) */
export const findIndustry = (key: string | null | undefined): Industry | undefined =>
  key ? ALL_INDUSTRIES.find((i) => i.key === key) : undefined;

/** Ikon for en branche — fallback til 🧰 for ukendte/custom værdier */
export const industryIcon = (key: string | null | undefined): string =>
  findIndustry(key)?.icon ?? "🧰";

/** Underbrancher for en eller flere brancher (samlet) */
export const subcategoriesForIndustries = (keys: string[]): IndustrySubcategory[] =>
  keys.flatMap((k) => findIndustry(k)?.subcategories ?? []);

/** Step-templates for valgte brancher (samlet) */
export const stepTemplatesForIndustries = (keys: string[]): StepTemplate[] =>
  keys.flatMap((k) => STEP_TEMPLATES_BY_INDUSTRY[k] ?? []);

/** Filtrér en liste af branche-keys til kun dem der findes i kataloget.
 *  Bruges til at vise valgte brancher i ServiceForm — gamle custom-værdier
 *  beholder vi separat så de ikke forsvinder. */
export const knownIndustryKeys = (keys: string[]): string[] =>
  keys.filter((k) => !!findIndustry(k));

/** Returner gamle/custom branche-keys (dem der ikke matcher kataloget) */
export const customIndustryKeys = (keys: string[]): string[] =>
  keys.filter((k) => !findIndustry(k));

/* ───────────── Top-kategorier til forsiden / søgning ─────────────
 * Brugt af SearchSuggest, Search-siden og lignende steder hvor vi vil
 * vise en kompakt række af de mest populære servicebrancher.
 * Listen styres ét sted så landing, søg og forslag altid er ens.
 */
export const TOP_CATEGORY_KEYS: string[] = [
  "Rengøring",
  "Vinduespudsning",
  "Algebehandling",
  "Haveservice",
  "Tømrer",
  "Murer",
  "Maler",
  "VVS",
  "Elektriker",
  "Flyttehjælp",
  "Skadedyrsbekæmpelse",
  "Anlægsgartner",
];

/** Returnér Industry-objekter for top-kategorierne (filtrerer ukendte). */
export const topCategories = (): Industry[] =>
  TOP_CATEGORY_KEYS.map((k) => findIndustry(k)).filter((i): i is Industry => !!i);