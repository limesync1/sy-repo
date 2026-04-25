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
          { label: "Privatrengøring", services: ["Ugentlig hjemmerengøring", "14-dages rengøring", "Månedlig rengøring", "Engangs­rengøring"] },
          { label: "Hovedrengøring", services: ["Forårs­rengøring", "Hovedrengøring villa", "Hovedrengøring lejlighed"] },
          { label: "Flytterengøring", services: ["Flytterengøring lejlighed", "Flytterengøring villa", "Flytterengøring med garanti"] },
          { label: "Dødsbo­rengøring", services: ["Dødsbo­rengøring", "Tømning af dødsbo", "Bortskaffelse af indbo"] },
          { label: "Kontorrengøring", services: ["Daglig kontor­rengøring", "Ugentlig kontor­rengøring", "Mødelokale­rengøring"] },
          { label: "Erhvervsrengøring", services: ["Butiks­rengøring", "Industri­rengøring", "Lager­rengøring", "Klinik- og tandlæge­rengøring", "Skole- og institutions­rengøring", "Restaurations­rengøring"] },
          { label: "Trappevask", services: ["Trappevask bolig­forening", "Opgangs­rengøring", "Fælles­arealer"] },
          { label: "Byggerengøring", services: ["Bygge­rengøring under arbejde", "Slut­rengøring nybyg", "Aflevering­srengøring"] },
          { label: "Specialrengøring", services: ["Brand- og vandskade­rengøring", "Hoarder­rengøring", "Mikrofiber­rengøring", "Desinficering / corona­rengøring"] },
          { label: "Tæpperens", services: ["Tæpperens i hjemmet", "Møbelpolstring­srens", "Bilsæder rens"] },
          { label: "Måtte- og gardin­service", services: ["Måtte­service", "Gardin­vask"] },
        ],
      },
      {
        key: "Vinduespudsning",
        label: "Vinduespudsning",
        icon: "🪟",
        description: "Inde og ude, både privat og erhverv.",
        subcategories: [
          { label: "Privat vinduespudsning", services: ["Indvendig vinduespudsning", "Udvendig vinduespudsning", "Helhedspakke (inde + ude)", "Karm­rengøring"] },
          { label: "Erhverv vinduespudsning", services: ["Butiks­vinduer", "Kontor­facader", "Restaurant­vinduer"] },
          { label: "Glasfacader & højhuse", services: ["Glas­facader", "Højde­arbejde med lift", "Reb­arbejde / klatre­service"] },
          { label: "Rentvands­anlæg", services: ["Vinduespudsning med rent­vandsanlæg", "Stang­pudsning op til 20m"] },
          { label: "Solceller", services: ["Solcelle­rens", "Inspektion af solceller"] },
          { label: "Ovenlys & glas­tage", services: ["Ovenlys­vinduer", "Glas­tag", "Vinter­haver"] },
        ],
      },
      {
        key: "Algebehandling",
        label: "Algebehandling & tagrens",
        icon: "🌧️",
        description: "Behandling af tag, fliser, facade m.m.",
        subcategories: [
          { label: "Tagrens", services: ["Tag­rens med højtryk", "Mekanisk tag­rens", "Tag­maling efter rens"] },
          { label: "Algebehandling tag", services: ["Alge­behandling tegl", "Alge­behandling beton", "Alge­behandling eternit"] },
          { label: "Imprægnering tag", services: ["Imprægnering efter rens", "Nano­imprægnering"] },
          { label: "Fliserens", services: ["Højtryks­rens fliser", "Alge­behandling fliser", "Fuge­rens"] },
          { label: "Belægning", services: ["Imprægnering belægning", "Granit & natursten", "Indkørsel rens"] },
          { label: "Facaderens", services: ["Facade­rens", "Alge­behandling facade", "Graffiti­fjernelse"] },
          { label: "Tagrender", services: ["Tag­rende­rensning", "Inspektion tag­render", "Løv­filter montering"] },
        ],
      },
      {
        key: "Skadedyrsbekæmpelse",
        label: "Skadedyrsbekæmpelse",
        icon: "🐀",
        subcategories: [
          { label: "Insekter", services: ["Hvepse­bekæmpelse", "Myre­bekæmpelse", "Vægge­lus", "Sølv­fisk", "Kakerlakker", "Møl"] },
          { label: "Gnavere", services: ["Rotte­bekæmpelse", "Muse­bekæmpelse", "Mår i loft"] },
          { label: "Fugle", services: ["Due­sikring", "Fugle­net"] },
          { label: "Forebyggende", services: ["Sikrings­aftale erhverv", "Rotte­spærre", "Rådgivning & inspektion"] },
          { label: "Træskadedyr", services: ["Borebille­behandling", "Hus­bukke", "Råd­svamp"] },
        ],
      },
      {
        key: "Skorstensfejer",
        label: "Skorstensfejer",
        icon: "🏠",
        description: "Fejning, eftersyn og rens af skorsten og brændeovn.",
        subcategories: [
          { label: "Fejning", services: ["Lov­pligtig fejning", "Ekstra fejning", "Sod­sugning"] },
          { label: "Eftersyn", services: ["Brænde­ovn­syn", "Pille­ovn­syn", "Røg­rør"] },
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
          { label: "Græs­pleje", services: ["Græs­slåning", "Vertikal­skæring", "Topdressing", "Ny græs­plæne", "Rulle­græs"] },
          { label: "Hæk & buske", services: ["Hække­klipning", "Beskæring buske", "Form­klipning"] },
          { label: "Beskæring & træ­pleje", services: ["Beskæring frugt­træer", "Krone­beskæring", "Stamme­opstamning"] },
          { label: "Træfældning", services: ["Træ­fældning", "Stub­fræsning", "Top­kapning", "Sektions­fældning"] },
          { label: "Lugning & oprydning", services: ["Lugning bede", "Have­oprydning", "Bortkørsel af haveaffald"] },
          { label: "Have­anlæg", services: ["Beplantning", "Bede­anlæg", "Have­projekt", "Drivhus opstilling"] },
          { label: "Vinter­service", services: ["Sne­rydning", "Saltning", "Glatfører­bekæmpelse", "Vinter­abonnement"] },
          { label: "Løvsugning", services: ["Løv­sugning", "Bortkørsel af løv"] },
          { label: "Vand­anlæg", services: ["Damme & bassiner", "Vandings­anlæg"] },
        ],
      },
      {
        key: "Anlægsgartner",
        label: "Anlægsgartner",
        icon: "🌳",
        subcategories: [
          { label: "Belægning", services: ["Fliser & klinker", "Granit­belægning", "Indkørsel", "Terrasser"] },
          { label: "Støtte­mure & trapper", services: ["Støtte­mur", "Have­trapper", "Granit­kanter"] },
          { label: "Beplantning", services: ["Træer & buske", "Græs­plæne", "Bede­anlæg"] },
          { label: "Jordarbejde", services: ["Afgravning", "Drænarbejde", "Terræn­regulering"] },
          { label: "Hegn & læhegn", services: ["Hegn­opsætning", "Læ­hegn", "Pergola"] },
        ],
      },
      {
        key: "Gravstedspleje",
        label: "Gravsteds­pleje",
        icon: "🌷",
        description: "Vedligehold og pyntning af gravsteder.",
        subcategories: [
          { label: "Vedligehold", services: ["Lugning gravsted", "Plæne­klip omkring grav", "Polering af gravsten"] },
          { label: "Pyntning", services: ["Forårs­pyntning", "Sommer­pyntning", "Jule­pyntning"] },
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
          { label: "Tag­arbejde", services: ["Nyt tag", "Udskift­ning af tagsten", "Tag­reparation", "Under­tag"] },
          { label: "Tilbygning & udestue", services: ["Tilbygning", "Udestue", "Carport / skur", "Altan"] },
          { label: "Vinduer & døre", services: ["Vindues­montering", "Dør­montering", "Termo­ruder"] },
          { label: "Indvendig snedkeri", services: ["Indbygget skab", "Køkken­montering", "Trappe­renovering"] },
          { label: "Reparation", services: ["Råd­skader", "Spær & lægter", "Bjælkelag"] },
          { label: "Terrasse & dæk", services: ["Trædæk", "Komposit­terrasse"] },
        ],
      },
      {
        key: "Murer",
        label: "Murer",
        icon: "🧱",
        subcategories: [
          { label: "Murværk", services: ["Nyt murværk", "Reparation murværk", "Sokkel­arbejde"] },
          { label: "Skorstene", services: ["Ny skorsten", "Skorstens­reparation"] },
          { label: "Fliser & klinker", services: ["Bade­værelse fliser", "Køkken fliser", "Klinker", "Mosaik"] },
          { label: "Pudsning", services: ["Indvendig pudsning", "Udvendig pudsning", "Filt­sning"] },
          { label: "Facade", services: ["Facade­renovering", "Fuge­renovering", "Sand­blæsning"] },
          { label: "Bade­værelse", services: ["Total­renovering bad", "Vådrums­membran"] },
        ],
      },
      {
        key: "Maler",
        label: "Maler",
        icon: "🎨",
        subcategories: [
          { label: "Indvendig maling", services: ["Væg­maling", "Loft­maling", "Træværk indvendig", "Radiator­lakering"] },
          { label: "Udvendig maling", services: ["Facade­maling", "Vinduer & døre", "Træværk udvendig", "Stake­hegn"] },
          { label: "Tapetsering", services: ["Tapet­sering", "Fiber­væv", "Glas­væv"] },
          { label: "Spartling & forarbejde", services: ["Vægspartling", "Loft­spartling", "Reparation revner"] },
          { label: "Specialmaling", services: ["Effekt­maling", "Tavle­maling", "Beton­gulv lakering"] },
        ],
      },
      {
        key: "VVS",
        label: "VVS",
        icon: "🚰",
        subcategories: [
          { label: "Vand & sanitet", services: ["Vand­hane", "Toilet udskift­ning", "Bruser & kabine", "Vand­skade"] },
          { label: "Bade­værelse", services: ["Bade­værelses­renovering", "Vådrums­installation"] },
          { label: "Varme & kedel", services: ["Radiator", "Gulv­varme", "Gas­kedel", "Olie­fyr udskift­ning"] },
          { label: "Varmepumpe", services: ["Luft til luft", "Luft til vand", "Jord­varme", "Service­aftale varmepumpe"] },
          { label: "Kloak & afløb", services: ["Kloak­service", "Afløbs­rens", "TV-inspektion", "Drænarbejde"] },
          { label: "Brønd & septik", services: ["Septik­tank tømning", "Brønd­rens", "Pumpe­brønd"] },
          { label: "Akut VVS", services: ["Akut udkald", "Vand­bruds­hjælp"] },
        ],
      },
      {
        key: "Elektriker",
        label: "Elektriker",
        icon: "⚡",
        subcategories: [
          { label: "El-installation", services: ["Stik­kontakter", "Belysning", "El-tavle", "Ny installation nybyg"] },
          { label: "Belysning", services: ["LED-belysning", "Spots", "Have­belysning", "Indbygnings­spot"] },
          { label: "Smart home", services: ["Smart belysning", "Hue / smart kontakter", "Smart­varme"] },
          { label: "Ladeløsninger", services: ["Lade­standere bil", "Lade­boks villa", "Lade­løsning erhverv"] },
          { label: "Solceller", services: ["Solcelle­anlæg", "Batteri / hybrid", "Service af solceller"] },
          { label: "El-tjek & autorisation", services: ["El-eftersyn", "Termografi", "El-rapport hus­handel"] },
          { label: "Akut el", services: ["Akut udkald el", "Strøm­svigt"] },
        ],
      },
      {
        key: "Gulvlægger",
        label: "Gulvlægger",
        icon: "🪵",
        subcategories: [
          { label: "Trægulve", services: ["Plank­egulv", "Park­et", "Slibning & lakering", "Olie­behandling"] },
          { label: "Vinyl & laminat", services: ["Vinyl­gulv", "Laminat", "LVT design­gulv"] },
          { label: "Tæppe & linoleum", services: ["Væg-til-væg tæppe", "Linoleum"] },
          { label: "Industri­gulve", services: ["Epoxy­gulv", "Beton­slibning", "Industri­maling"] },
        ],
      },
      {
        key: "Glarmester",
        label: "Glarmester",
        icon: "🪞",
        subcategories: [
          { label: "Vinduer", services: ["Termo­ruder", "Vindues­reparation", "Akut vindues­skade"] },
          { label: "Spejle & glas", services: ["Spejle", "Glas­vægge", "Bruse­døre", "Glas­hylder"] },
          { label: "Erhverv", services: ["Butiks­ruder", "Sikrings­glas", "Folie­montage"] },
        ],
      },
      {
        key: "Smede",
        label: "Smed",
        icon: "⚙️",
        subcategories: [
          { label: "Stål­arbejde", services: ["Hegn", "Gelænder", "Carport", "Trapper"] },
          { label: "Konstruktion", services: ["Stål­bjælker", "Specialkonstruktion"] },
          { label: "Reparation", services: ["Svejs­ning", "Reparation port"] },
        ],
      },
      {
        key: "Isolering",
        label: "Isolering",
        icon: "🧊",
        description: "Efter­isolering af loft, hulmur og krybe­kælder.",
        subcategories: [
          { label: "Loft", services: ["Loft­isolering", "Skrå vægge"] },
          { label: "Hulmur", services: ["Hulmurs­isolering"] },
          { label: "Krybe­kælder & terræn­dæk", services: ["Krybe­kælder", "Terræn­dæk"] },
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
          { label: "Privat flytning", services: ["Lokal flytning", "Langdistance flytning", "Udlands­flytning", "Senior­flytning"] },
          { label: "Erhvervs­flytning", services: ["Kontor­flytning", "Lager­flytning", "Maskin­flytning"] },
          { label: "Klaver & specialflytning", services: ["Klaver­flytning", "Pengeskab", "Tunge løft"] },
          { label: "Pakke & udpakning", services: ["Pakke­service", "Udpaknings­hjælp", "Møbel­demontering"] },
          { label: "Opbevaring", services: ["Korttids­opbevaring", "Langtids­opbevaring", "Container­opbevaring"] },
          { label: "Bortskaffelse", services: ["Tømning ved flytning", "Bortskaffelse af møbler"] },
        ],
      },
      {
        key: "Vognmand",
        label: "Vognmand & kurer",
        icon: "🚚",
        subcategories: [
          { label: "Levering", services: ["Pakke­levering", "Møbel­transport", "Hvide­vare­levering & montage"] },
          { label: "Container & affald", services: ["Container­udlejning", "Affalds­kørsel", "Genbrugs­plads­kørsel"] },
          { label: "Kran & lift", services: ["Kran­bil", "Lift­vogn"] },
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
          { label: "Bilrengøring", services: ["Indvendig rens", "Udvendig håndvask", "Klargøring til salg", "Lugt­fjernelse"] },
          { label: "Polering & coating", services: ["Polering", "Keramisk coating", "Lak­for­segling"] },
          { label: "Mobilt dækskift", services: ["Dækskift på adressen", "Hjul­opbevaring"] },
          { label: "Stenslag & småskader", services: ["Sten­slag rude", "Smart­repair lak", "Felgreparation"] },
          { label: "Start­hjælp & vej­hjælp", services: ["Start­hjælp", "Mobil mekaniker"] },
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
          { label: "Alarm­systemer", services: ["Tyveri­alarm", "Brand­alarm", "Vand­alarm"] },
          { label: "Video­overvågning", services: ["IP-kamera", "Overvågnings­system", "Dørtelefon med video"] },
          { label: "Lås­smed", services: ["Lås­udskift­ning", "Cylinder­service", "Sikrings­dør", "Akut lås­ning"] },
          { label: "Adgangs­kontrol", services: ["Brik­system", "Kode­låse"] },
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
          { label: "AV-montering", services: ["TV-montering", "Surround / lyd­anlæg", "Projektor & lærred"] },
          { label: "Smart home", services: ["Smart home opsætning", "Stemme­styring", "Smart belysning"] },
          { label: "Netværk & Wi-Fi", services: ["Wi-Fi opsætning", "Mesh-netværk", "Kabel­træk", "Server­skab"] },
          { label: "PC-hjælp", services: ["PC-hjælp på adressen", "Backup & flytning af data"] },
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