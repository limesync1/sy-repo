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
        subcategories: [
          { label: "Tagrens", services: ["Tag­rens med højtryk", "Mekanisk tag­rens", "Tag­maling efter rens"] },
          { label: "Algebehandling tag", services: ["Alge­behandling tegl", "Alge­behandling beton", "Alge­behandling eternit"] },
          { label: "Imprægnering tag", services: ["Imprægnering efter rens", "Nano­imprægnering"] },
          { label: "Belægning", services: ["Imprægnering belægning", "Granit & natursten", "Indkørsel rens"] },
          { label: "Tagrender", services: ["Tag­rende­rensning", "Inspektion tag­render", "Løv­filter montering"] },
        ],
      },
      {
        key: "Fliserens",
        label: "Fliserens",
        icon: "🧱",
        subcategories: [
          { label: "Fliserens", services: ["Højtryks­rens fliser", "Alge­behandling fliser", "Fuge­rens"] },
          { label: "Belægning", services: ["Imprægnering belægning", "Granit & natursten", "Indkørsel rens"] },
          { label: "Terrasse­rens", services: ["Trædæk rens", "Komposit rens", "Træterrasse imprægnering"] },
        ],
      },
      {
        key: "Facaderens",
        label: "Facaderens",
        icon: "🧱",
        subcategories: [
          { label: "Facaderens", services: ["Facade­rens", "Alge­behandling facade", "Sand­blæsning"] },
          { label: "Graffiti­fjernelse", services: ["Graffiti­fjernelse", "Anti-graffiti behandling"] },
          { label: "Murværk", services: ["Murværks­rens", "Sokkel­rens", "Filt­behandling"] },
        ],
      },
      {
        key: "Solcellerens",
        label: "Solcellerens",
        icon: "☀️",
        subcategories: [
          { label: "Solcelle­rens", services: ["Solcelle­rens", "Solcelle­inspektion", "Termografering solceller"] },
          { label: "Vedligehold", services: ["Forebyggende vedligehold", "Service­aftale solceller"] },
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
  {
    label: "Industri & erhvervsservice",
    industries: [
      {
        key: "Industriservice",
        label: "Industriservice",
        icon: "⚙️",
        subcategories: [
          { label: "Industrirengøring", services: ["Maskin­rengøring", "Produktions­rengøring", "Hal- og lager­rengøring", "Tank­rengøring", "Silo­rengøring"] },
          { label: "Højtryks- & vakuum­spuling", services: ["Højtryks­spuling industri", "Vakuum­sugning", "Tør­is­rensning", "Slam­sugning"] },
          { label: "Maskin­service & vedligehold", services: ["Forebyggende vedligehold", "Maskin­eftersyn", "Reparation af produktions­udstyr", "Smøre­service"] },
          { label: "Ventilation & procesanlæg", services: ["Ventilations­rens industri", "Emhætte- og kanal­rens", "Filter­skift", "Proces­anlæg service"] },
          { label: "Industri­montage", services: ["Maskin­flytning", "Maskin­opstilling", "Rør­montage", "Stål­montage"] },
          { label: "Lovpligtige eftersyn", services: ["Eftersyn af løfte­grej", "Port- og lift­eftersyn", "Termografering el-tavler"] },
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
  /** Søgeord der bruges til smart matching mod servicenavn/underkategori/beskrivelse.
   *  Jo flere ord der matcher → jo højere confidence. */
  keywords?: string[];
  /** Underkategorier denne skabelon er bygget til (giver +3 i score ved direkte match). */
  subcategories?: string[];
  steps: Array<{ label: string; unit: string; price_per_unit: number; min_value: number; max_value: number; default_value: number }>;
}

export const STEP_TEMPLATES_BY_INDUSTRY: Record<string, StepTemplate[]> = {
  "Rengøring": [
    { label: "Privat hjemmerengøring", subcategories: ["Privatrengøring"],
      keywords: ["privat","hjem","ugentlig","14-dages","månedlig","fast"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 11, min_value: 30, max_value: 400, default_value: 90 },
        { label: "Antal badeværelser", unit: "stk", price_per_unit: 195, min_value: 1, max_value: 5, default_value: 1 },
        { label: "Vinduer indvendigt", unit: "stk", price_per_unit: 35, min_value: 0, max_value: 30, default_value: 0 },
      ]},
    { label: "Hovedrengøring", subcategories: ["Hovedrengøring"],
      keywords: ["hoved","forår","grundig","top-til-tå"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 24, min_value: 50, max_value: 400, default_value: 110 },
        { label: "Antal badeværelser", unit: "stk", price_per_unit: 245, min_value: 1, max_value: 5, default_value: 1 },
        { label: "Ovnrens", unit: "stk", price_per_unit: 375, min_value: 0, max_value: 2, default_value: 1 },
        { label: "Køleskab indvendig", unit: "stk", price_per_unit: 245, min_value: 0, max_value: 2, default_value: 0 },
      ]},
    { label: "Flytterengøring (med garanti)", subcategories: ["Flytterengøring"],
      keywords: ["flytter","fraflytning","k-mærket","garanti","tilbageleveret"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 28, min_value: 30, max_value: 350, default_value: 80 },
        { label: "Antal badeværelser", unit: "stk", price_per_unit: 295, min_value: 1, max_value: 5, default_value: 1 },
        { label: "Ovnrens", unit: "stk", price_per_unit: 395, min_value: 0, max_value: 2, default_value: 1 },
        { label: "Køleskab + fryser", unit: "stk", price_per_unit: 295, min_value: 0, max_value: 2, default_value: 1 },
      ]},
    { label: "Dødsbo­rengøring & tømning", subcategories: ["Dødsbo­rengøring"],
      keywords: ["dødsbo","tømning","bortskaffelse","arvinger"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 95, min_value: 25, max_value: 300, default_value: 75 },
        { label: "Bortkørsel m³", unit: "stk", price_per_unit: 850, min_value: 1, max_value: 30, default_value: 8 },
        { label: "Slut­rengøring", unit: "m²", price_per_unit: 28, min_value: 25, max_value: 300, default_value: 75 },
      ]},
    { label: "Kontor­rengøring (fast)", subcategories: ["Kontorrengøring"],
      keywords: ["kontor","erhverv","virksomhed","arbejdsplads","daglig","ugentlig"],
      steps: [
        { label: "Areal", unit: "m²", price_per_unit: 7, min_value: 50, max_value: 2000, default_value: 250 },
        { label: "Antal toiletter", unit: "stk", price_per_unit: 95, min_value: 1, max_value: 20, default_value: 2 },
        { label: "Tømning skraldespande", unit: "stk", price_per_unit: 8, min_value: 1, max_value: 100, default_value: 10 },
      ]},
    { label: "Erhvervsrengøring (industri/lager/butik)", subcategories: ["Erhvervsrengøring"],
      keywords: ["industri","lager","butik","klinik","skole","institution","restaurant"],
      steps: [
        { label: "Areal", unit: "m²", price_per_unit: 9, min_value: 100, max_value: 5000, default_value: 400 },
        { label: "Gulvvask (våd)", unit: "m²", price_per_unit: 5, min_value: 0, max_value: 5000, default_value: 200 },
        { label: "Ekstra opgaver pr. uge", unit: "timer", price_per_unit: 345, min_value: 0, max_value: 20, default_value: 0 },
      ]},
    { label: "Trappevask & opgang", subcategories: ["Trappevask"],
      keywords: ["trappe","opgang","bolig­forening","fælles­arealer"],
      steps: [
        { label: "Antal etager", unit: "stk", price_per_unit: 145, min_value: 1, max_value: 10, default_value: 4 },
        { label: "Antal opgange", unit: "stk", price_per_unit: 245, min_value: 1, max_value: 20, default_value: 1 },
        { label: "Frekvens pr. md.", unit: "stk", price_per_unit: 195, min_value: 1, max_value: 8, default_value: 4 },
      ]},
    { label: "Bygge­rengøring", subcategories: ["Byggerengøring"],
      keywords: ["bygge","nybyg","slut­rengøring","aflevering"],
      steps: [
        { label: "Areal", unit: "m²", price_per_unit: 32, min_value: 30, max_value: 1000, default_value: 150 },
        { label: "Vinduespudsning inkl.", unit: "stk", price_per_unit: 38, min_value: 0, max_value: 80, default_value: 12 },
      ]},
    { label: "Tæpperens i hjemmet", subcategories: ["Tæpperens"],
      keywords: ["tæppe","møbelpolstring","sofa","sæder"],
      steps: [
        { label: "Tæppeareal", unit: "m²", price_per_unit: 95, min_value: 1, max_value: 100, default_value: 12 },
        { label: "Sofa (3-pers.)", unit: "stk", price_per_unit: 695, min_value: 0, max_value: 5, default_value: 0 },
        { label: "Lænestole", unit: "stk", price_per_unit: 295, min_value: 0, max_value: 8, default_value: 0 },
      ]},
  ],
  "Vinduespudsning": [
    { label: "Privat villa (vinduesfag)", subcategories: ["Privat vinduespudsning"],
      keywords: ["villa","privat","hjem","fag","ruder"],
      steps: [
        { label: "Antal vinduesfag", unit: "stk", price_per_unit: 38, min_value: 4, max_value: 80, default_value: 14 },
        { label: "Karme & rammer", unit: "stk", price_per_unit: 16, min_value: 0, max_value: 80, default_value: 0 },
        { label: "Tagvinduer / Velux", unit: "stk", price_per_unit: 95, min_value: 0, max_value: 8, default_value: 0 },
      ]},
    { label: "Erhverv (m² glasareal)", subcategories: ["Erhverv vinduespudsning"],
      keywords: ["butik","kontor","facade","restaurant","glasareal"],
      steps: [
        { label: "Glasareal", unit: "m²", price_per_unit: 38, min_value: 10, max_value: 1000, default_value: 80 },
        { label: "Etager over stuen", unit: "stk", price_per_unit: 145, min_value: 0, max_value: 8, default_value: 0 },
      ]},
    { label: "Glasfacader & højhuse", subcategories: ["Glasfacader & højhuse"],
      keywords: ["højhus","facade","lift","reb","klatre"],
      steps: [
        { label: "Glasareal", unit: "m²", price_per_unit: 65, min_value: 20, max_value: 5000, default_value: 250 },
        { label: "Etager (lift/reb)", unit: "stk", price_per_unit: 425, min_value: 1, max_value: 30, default_value: 5 },
      ]},
    { label: "Rentvands­anlæg (stang)", subcategories: ["Rentvands­anlæg"],
      keywords: ["rentvand","stang","op til 20m"],
      steps: [
        { label: "Antal vinduesfag", unit: "stk", price_per_unit: 32, min_value: 4, max_value: 100, default_value: 18 },
        { label: "Etager over stuen", unit: "stk", price_per_unit: 95, min_value: 0, max_value: 6, default_value: 1 },
      ]},
    { label: "Solcelle­rens", subcategories: ["Solceller"],
      keywords: ["solcelle","solpanel","panel"],
      steps: [
        { label: "Antal paneler", unit: "stk", price_per_unit: 45, min_value: 4, max_value: 200, default_value: 24 },
      ]},
    { label: "Tagvinduer / glas­tage", subcategories: ["Ovenlys & glas­tage"],
      keywords: ["ovenlys","velux","glastag","vinter­have"],
      steps: [
        { label: "Antal tagvinduer", unit: "stk", price_per_unit: 145, min_value: 1, max_value: 20, default_value: 4 },
        { label: "Glas­tag areal", unit: "m²", price_per_unit: 85, min_value: 0, max_value: 100, default_value: 0 },
      ]},
  ],
  "Algebehandling": [
    { label: "Algebehandling tag", keywords: ["tag","tag­plader","tegl","eternit"],
      steps: [
        { label: "Tagareal", unit: "m²", price_per_unit: 38, min_value: 30, max_value: 500, default_value: 130 },
        { label: "Imprægnering", unit: "m²", price_per_unit: 28, min_value: 0, max_value: 500, default_value: 130 },
      ]},
    { label: "Algebehandling fliser & terrasse", keywords: ["fliser","terrasse","indkørsel","belægning"],
      steps: [
        { label: "Fliseareal", unit: "m²", price_per_unit: 28, min_value: 10, max_value: 500, default_value: 60 },
        { label: "Højtryksspuling", unit: "m²", price_per_unit: 22, min_value: 0, max_value: 500, default_value: 0 },
      ]},
    { label: "Facade­algebehandling", keywords: ["facade","mur","puds"],
      steps: [
        { label: "Facadeareal", unit: "m²", price_per_unit: 42, min_value: 20, max_value: 500, default_value: 90 },
      ]},
  ],
  "Haveservice": [
    { label: "Græsslåning (abonnement)", subcategories: ["Havevedligehold"],
      keywords: ["græs","plæne","slåning","klipning"],
      steps: [
        { label: "Plæneareal", unit: "m²", price_per_unit: 3, min_value: 50, max_value: 5000, default_value: 250 },
        { label: "Kantklipning", unit: "m", price_per_unit: 7, min_value: 0, max_value: 200, default_value: 25 },
      ]},
    { label: "Hækkeklipning", keywords: ["hæk","hækklipning","løbende meter"],
      steps: [
        { label: "Hæklængde", unit: "m", price_per_unit: 65, min_value: 1, max_value: 200, default_value: 15 },
        { label: "Højde over 2m", unit: "stk", price_per_unit: 25, min_value: 0, max_value: 200, default_value: 0 },
      ]},
    { label: "Træfældning & beskæring", subcategories: ["Træfældning"],
      keywords: ["træ","fældning","beskæring","stub","klatre"],
      steps: [
        { label: "Træer (op til 8m)", unit: "stk", price_per_unit: 1450, min_value: 1, max_value: 20, default_value: 1 },
        { label: "Beskæring", unit: "stk", price_per_unit: 695, min_value: 0, max_value: 30, default_value: 0 },
        { label: "Stubbefræsning", unit: "stk", price_per_unit: 895, min_value: 0, max_value: 10, default_value: 0 },
      ]},
    { label: "Anlæg (fliser/terrasse)", subcategories: ["Anlægsarbejde"],
      keywords: ["anlæg","fliser","terrasse","belægning","beplantning"],
      steps: [
        { label: "Areal", unit: "m²", price_per_unit: 895, min_value: 5, max_value: 200, default_value: 25 },
        { label: "Bortkørsel jord/affald", unit: "stk", price_per_unit: 695, min_value: 0, max_value: 20, default_value: 2 },
      ]},
    { label: "Ukrudtsbekæmpelse fliser", keywords: ["ukrudt","mos","fliser"],
      steps: [
        { label: "Fliseareal", unit: "m²", price_per_unit: 14, min_value: 10, max_value: 500, default_value: 60 },
      ]},
  ],
  "Maler": [
    { label: "Indvendig maling", subcategories: ["Indvendig maling"],
      keywords: ["indvendig","væg","loft","stue","værelse"],
      steps: [
        { label: "Vægareal", unit: "m²", price_per_unit: 145, min_value: 5, max_value: 500, default_value: 45 },
        { label: "Loftareal", unit: "m²", price_per_unit: 165, min_value: 0, max_value: 200, default_value: 20 },
        { label: "Døre m. karm", unit: "stk", price_per_unit: 645, min_value: 0, max_value: 15, default_value: 0 },
      ]},
    { label: "Udvendig facademaling", subcategories: ["Udvendig maling"],
      keywords: ["facade","udvendig","mur","træværk"],
      steps: [
        { label: "Facadeareal", unit: "m²", price_per_unit: 195, min_value: 20, max_value: 500, default_value: 80 },
        { label: "Træværk (vinduer/døre)", unit: "stk", price_per_unit: 495, min_value: 0, max_value: 30, default_value: 4 },
      ]},
    { label: "Tapetsering", subcategories: ["Tapetsering"],
      keywords: ["tapet","fibervæv"],
      steps: [
        { label: "Vægareal", unit: "m²", price_per_unit: 235, min_value: 5, max_value: 200, default_value: 25 },
      ]},
  ],
  "Tømrer": [
    { label: "Tømrer (timepris + materialer)", keywords: ["tømrer","snedker","reparation","montering"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 545, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 545, min_value: 1, max_value: 40, default_value: 4 },
        { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 50000, default_value: 0 },
      ]},
    { label: "Tagarbejde", subcategories: ["Tagarbejde"],
      keywords: ["tag","tagsten","spær","undertag"],
      steps: [
        { label: "Tagareal", unit: "m²", price_per_unit: 695, min_value: 20, max_value: 400, default_value: 100 },
        { label: "Stillads/lift", unit: "stk", price_per_unit: 4500, min_value: 0, max_value: 1, default_value: 1 },
      ]},
    { label: "Altan / tilbygning", subcategories: ["Altan","Tilbygning"],
      keywords: ["altan","tilbygning","carport"],
      steps: [
        { label: "Areal", unit: "m²", price_per_unit: 8500, min_value: 4, max_value: 60, default_value: 12 },
      ]},
  ],
  "Murer": [
    { label: "Murer (timepris)", keywords: ["murer","murværk"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 595, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 565, min_value: 1, max_value: 60, default_value: 6 },
        { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 80000, default_value: 0 },
      ]},
    { label: "Flisearbejde", subcategories: ["Flisearbejde"],
      keywords: ["fliser","klinker","badeværelse"],
      steps: [
        { label: "Fliseareal", unit: "m²", price_per_unit: 945, min_value: 5, max_value: 100, default_value: 15 },
      ]},
  ],
  "VVS": [
    { label: "VVS akut udkald", keywords: ["akut","udkald","døgn","weekend","nat"],
      steps: [
        { label: "Udkald (akut)", unit: "stk", price_per_unit: 1195, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 845, min_value: 1, max_value: 8, default_value: 1 },
        { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 30000, default_value: 0 },
      ]},
    { label: "VVS standard", keywords: ["vvs","blikkenslager","installation"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 745, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 695, min_value: 1, max_value: 16, default_value: 2 },
        { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 30000, default_value: 0 },
      ]},
    { label: "Toilet / vandhane udskiftning", subcategories: ["Vandinstallation"],
      keywords: ["toilet","vandhane","blandingsbatteri","håndvask"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 745, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Toilet udskiftning", unit: "stk", price_per_unit: 2895, min_value: 0, max_value: 3, default_value: 1 },
        { label: "Blandingsbatteri", unit: "stk", price_per_unit: 1395, min_value: 0, max_value: 5, default_value: 0 },
      ]},
    { label: "Varmeinstallation", subcategories: ["Varmeinstallation"],
      keywords: ["varme","radiator","gulvvarme","varmepumpe"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 845, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 745, min_value: 1, max_value: 40, default_value: 6 },
        { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 80000, default_value: 0 },
      ]},
  ],
  "Elektriker": [
    { label: "Elektriker akut", keywords: ["akut","udkald","døgn","weekend"],
      steps: [
        { label: "Udkald (akut)", unit: "stk", price_per_unit: 1095, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 795, min_value: 1, max_value: 8, default_value: 1 },
        { label: "Materialer", unit: "kr", price_per_unit: 1, min_value: 0, max_value: 20000, default_value: 0 },
      ]},
    { label: "Elinstallation", subcategories: ["Elinstallation"],
      keywords: ["stikkontakt","lampeudtag","spots","installation"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 695, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Stikkontakter", unit: "stk", price_per_unit: 495, min_value: 0, max_value: 30, default_value: 2 },
        { label: "Lampeudtag/spots", unit: "stk", price_per_unit: 545, min_value: 0, max_value: 30, default_value: 0 },
        { label: "HFI/HPFI gruppe", unit: "stk", price_per_unit: 1895, min_value: 0, max_value: 5, default_value: 0 },
      ]},
    { label: "El-tjek (eftersyn)", subcategories: ["EL-tjek"],
      keywords: ["eftersyn","el-tjek","sikkerhed","elftersynsrapport"],
      steps: [
        { label: "Eftersyn (grundgebyr)", unit: "stk", price_per_unit: 1495, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Antal el-grupper", unit: "stk", price_per_unit: 145, min_value: 1, max_value: 30, default_value: 8 },
      ]},
  ],
  "Flyttehjælp": [
    { label: "Lokal flytning (privat)", subcategories: ["Privat flytning"],
      keywords: ["lokal","privat","flytning","lejlighed","hus"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 55, min_value: 30, max_value: 350, default_value: 80 },
        { label: "Etager uden elevator", unit: "stk", price_per_unit: 495, min_value: 0, max_value: 8, default_value: 0 },
        { label: "Klaver/tungt gods", unit: "stk", price_per_unit: 2295, min_value: 0, max_value: 3, default_value: 0 },
      ]},
    { label: "Langdistance flytning", keywords: ["langdistance","over land","jylland-sjælland"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 75, min_value: 30, max_value: 350, default_value: 80 },
        { label: "Afstand", unit: "km", price_per_unit: 14, min_value: 25, max_value: 500, default_value: 150 },
      ]},
    { label: "Erhvervsflytning", subcategories: ["Erhvervsflytning"],
      keywords: ["kontor","erhverv","virksomhed","lager"],
      steps: [
        { label: "Antal mand", unit: "stk", price_per_unit: 545, min_value: 2, max_value: 8, default_value: 3 },
        { label: "Timer", unit: "timer", price_per_unit: 1, min_value: 1, max_value: 40, default_value: 8 },
      ]},
    { label: "Pakkeservice", keywords: ["pakke","kasser","ned­pakning"],
      steps: [
        { label: "Boligstørrelse", unit: "m²", price_per_unit: 25, min_value: 30, max_value: 300, default_value: 80 },
        { label: "Antal mand­timer", unit: "timer", price_per_unit: 445, min_value: 1, max_value: 20, default_value: 4 },
      ]},
  ],
  "Skorstensfejer": [
    { label: "Lovpligtig fejning", keywords: ["lovpligtig","fejning","skorsten","brændeovn"],
      steps: [
        { label: "Antal skorstene", unit: "stk", price_per_unit: 395, min_value: 1, max_value: 5, default_value: 1 },
        { label: "Antal brændeovne", unit: "stk", price_per_unit: 295, min_value: 0, max_value: 5, default_value: 1 },
      ]},
  ],
  "Isolering": [
    { label: "Loftisolering", keywords: ["loft","isolering","granulat"],
      steps: [
        { label: "Loftareal", unit: "m²", price_per_unit: 145, min_value: 20, max_value: 400, default_value: 130 },
      ]},
    { label: "Hulmursisolering", keywords: ["hulmur","facade","granulat"],
      steps: [
        { label: "Facadeareal", unit: "m²", price_per_unit: 215, min_value: 20, max_value: 400, default_value: 110 },
      ]},
  ],
  "Gravstedspleje": [
    { label: "Årlig gravstedspleje", keywords: ["gravsted","kirkegård","grav"],
      steps: [
        { label: "Antal besøg pr. år", unit: "stk", price_per_unit: 295, min_value: 1, max_value: 24, default_value: 8 },
        { label: "Gravsteds­størrelse", unit: "m²", price_per_unit: 95, min_value: 1, max_value: 20, default_value: 4 },
      ]},
  ],
  "Autoservice": [
    { label: "Mobil bilrengøring", keywords: ["bil","auto","klargøring","detailing"],
      steps: [
        { label: "Bilstørrelse (S/M/L)", unit: "stk", price_per_unit: 695, min_value: 1, max_value: 3, default_value: 2 },
        { label: "Indvendig pleje", unit: "stk", price_per_unit: 445, min_value: 0, max_value: 1, default_value: 1 },
        { label: "Polering", unit: "timer", price_per_unit: 595, min_value: 0, max_value: 6, default_value: 0 },
      ]},
  ],
  "Skadedyrsbekæmpelse": [
    { label: "Skadedyr (rotter/mus/insekter)", keywords: ["rotte","mus","insekt","skadedyr","væggelus"],
      steps: [
        { label: "Inspektion + grundgebyr", unit: "stk", price_per_unit: 945, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Areal", unit: "m²", price_per_unit: 8, min_value: 30, max_value: 2000, default_value: 100 },
        { label: "Opfølgningsbesøg", unit: "stk", price_per_unit: 595, min_value: 0, max_value: 6, default_value: 1 },
      ]},
  ],
  "Sikkerhed": [
    // (industriservice-templates ligger nedenfor)
    { label: "Låsesmed udkald", keywords: ["lås","låsesmed","døroplukning"],
      steps: [
        { label: "Udkald", unit: "stk", price_per_unit: 945, min_value: 1, max_value: 1, default_value: 1 },
        { label: "Arbejdstimer", unit: "timer", price_per_unit: 745, min_value: 1, max_value: 4, default_value: 1 },
        { label: "Lås udskiftet", unit: "stk", price_per_unit: 1495, min_value: 0, max_value: 6, default_value: 0 },
      ]},
    { label: "Alarm/overvågning installation", subcategories: ["Alarmsystemer","Videoovervågning"],
      keywords: ["alarm","kamera","overvågning","ip"],
      steps: [
        { label: "Centralenhed", unit: "stk", price_per_unit: 2895, min_value: 1, max_value: 1, default_value: 1 },
        { label: "IP-kameraer", unit: "stk", price_per_unit: 2495, min_value: 0, max_value: 10, default_value: 2 },
        { label: "Bevægelses­sensorer", unit: "stk", price_per_unit: 695, min_value: 0, max_value: 15, default_value: 4 },
      ]},
  ],
  "Anlægsgartner": [
    { label: "Anlægs­arbejde (fliser/belægning)", keywords: ["anlæg","fliser","belægning","indkørsel"],
      steps: [
        { label: "Areal", unit: "m²", price_per_unit: 945, min_value: 10, max_value: 300, default_value: 40 },
        { label: "Afgravning + bortkørsel", unit: "m²", price_per_unit: 295, min_value: 0, max_value: 300, default_value: 40 },
      ]},
  ],
  "Gulvlægger": [
    { label: "Gulvlægning", keywords: ["gulv","trægulv","vinyl","laminat","epoxy"],
      steps: [
        { label: "Gulvareal", unit: "m²", price_per_unit: 295, min_value: 10, max_value: 300, default_value: 40 },
        { label: "Afretning af underlag", unit: "m²", price_per_unit: 95, min_value: 0, max_value: 300, default_value: 0 },
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
  "Fliserens",
  "Facaderens",
  "Solcellerens",
  "Haveservice",
  "Tømrer",
  "Murer",
  "Maler",
  "VVS",
  "Elektriker",
  "Flyttehjælp",
  "Skadedyrsbekæmpelse",
  "Anlægsgartner",
  "Gulvlægger",
  "Skorstensfejer",
  "Sikkerhed",
];

/** Returnér Industry-objekter for top-kategorierne (filtrerer ukendte). */
export const topCategories = (): Industry[] =>
  TOP_CATEGORY_KEYS.map((k) => findIndustry(k)).filter((i): i is Industry => !!i);

/* ───────────── Søgning i hele branchekataloget ─────────────
 * Bruges af SearchSuggest, /tilbud, /virksomheder mfl. så brugere kan
 * finde EN HVER branche — også dem der ikke er på top-listen — ved at
 * skrive et label, en underbranche, et service-navn eller et nøgleord.
 * Returnerer altid hele branche-objektet (så filtre/navigation kan
 * fortsætte med branche-keyen) plus den valgfri match-grund så vi kan
 * vise "via 'tagrens'" eller "via 'Trappevask'" i autocomplete. */
export type IndustrySearchHit = {
  industry: Industry;
  /** Det undertekst-match som førte til hittet (subcategory- eller
   *  service-label, eller keyword). Tom hvis det er selve branche-labelen
   *  der matchede. */
  matchedVia?: string;
  /** Højere = mere relevant — bruges til at sortere resultater. */
  score: number;
};

const _norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

export const searchIndustries = (
  query: string,
  opts: { limit?: number; preferTopKeys?: boolean } = {},
): IndustrySearchHit[] => {
  const term = _norm(query.trim());
  if (!term) return [];
  const limit = opts.limit ?? 20;
  const topSet = new Set(TOP_CATEGORY_KEYS);
  const hits = new Map<string, IndustrySearchHit>();

  const consider = (industry: Industry, matchedVia: string | undefined, baseScore: number) => {
    const existing = hits.get(industry.key);
    const bonus = opts.preferTopKeys && topSet.has(industry.key) ? 5 : 0;
    const score = baseScore + bonus;
    if (!existing || existing.score < score) {
      hits.set(industry.key, { industry, matchedVia, score });
    }
  };

  for (const ind of ALL_INDUSTRIES) {
    const label = _norm(ind.label);
    const key = _norm(ind.key);
    if (label.startsWith(term)) { consider(ind, undefined, 100); continue; }
    if (label.includes(term)) { consider(ind, undefined, 80); continue; }
    if (key.includes(term)) { consider(ind, undefined, 70); continue; }

    for (const sub of ind.subcategories) {
      const subLabel = _norm(sub.label);
      if (subLabel.includes(term)) {
        consider(ind, sub.label, subLabel.startsWith(term) ? 60 : 50);
        break;
      }
      const serviceMatch = sub.services?.find((svc) => _norm(svc).includes(term));
      if (serviceMatch) {
        consider(ind, serviceMatch, 40);
        break;
      }
    }

    const stepTemplates = STEP_TEMPLATES_BY_INDUSTRY[ind.key] ?? [];
    for (const tpl of stepTemplates) {
      if (tpl.keywords?.some((kw) => _norm(kw).includes(term))) {
        consider(ind, tpl.label, 30);
        break;
      }
      if (_norm(tpl.label).includes(term)) {
        consider(ind, tpl.label, 35);
        break;
      }
    }
  }

  return Array.from(hits.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};