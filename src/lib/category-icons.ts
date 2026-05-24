/**
 * Service-kategori-ikoner — fælles emoji-mapping brugt på tværs af appen
 * (Aftaler, Ruter, "Opret bestilling for kunde" osv.).
 *
 * Holdes ét sted så ikonerne altid er konsistente.
 */
export const CATEGORY_ICONS: Record<string, string> = {
  "Rengøring": "🧹",
  "Håndværker": "🔨",
  "Flyttehjælp": "🚚",
  "Haveservice": "🌿",
  "Maler": "🎨",
  "VVS": "💧",
  "Elektriker": "⚡",
  "Sikkerhed": "🛡️",
};

export const DEFAULT_CATEGORY_ICON = "🧰";

export const getCategoryIcon = (category?: string | null): string => {
  if (!category) return DEFAULT_CATEGORY_ICON;
  return CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON;
};

/**
 * Underkategori-ikoner — keyword-baseret mapping så vi kan dække alle de
 * mange underkategorier i taxonomien (Privatrengøring, Hovedrengøring,
 * Vinduespudsning, Tagrens, Skadedyr, Maler, VVS osv.) uden at skulle
 * opretholde en eksplicit liste på tusindvis af labels.
 *
 * Rækkefølgen betyder noget — første match vinder. Mere specifikke
 * keywords skal stå før mere generelle.
 */
const SUBCATEGORY_KEYWORD_ICONS: Array<[RegExp, string]> = [
  // ─── Rengøring-varianter ───
  // Rækkefølge: mere specifikke matches FØR de brede ("aflevering"/"slut"
  // skal vinde over "bygge"; "flytte" skal vinde over "rengøring").
  [/aflevering|slut.?rengøring|nøgle.?aflever/i, "🔑"],
  [/flytte.?rengøring|flytte/i, "📦"],
  [/dødsbo/i, "🕯️"],
  [/hovedrengøring|forår/i, "✨"],
  [/kontor/i, "🏢"],
  [/erhverv|butik|industri|lager|restaurant|klinik|skole/i, "🏬"],
  [/trappe|opgang|fælles/i, "🪜"],
  // "Bygge­rengøring under arbejde" — selve byggepladsen. Tidligere var
  // det 🚧 (gade-spærring), hvilket gav stop-skilt-associationer.
  [/bygge.?rengøring|bygge.*under arbejde/i, "🏗️"],
  [/bygge/i, "🏗️"],
  [/special|brand|vand|hoarder|desinfic/i, "🧴"],
  [/tæppe|polstring|møbel/i, "🛋️"],
  [/måtte|gardin/i, "🪟"],
  [/privat.*rengøring|hjemme|ugentlig|14-?dag|månedlig|engang/i, "🏠"],
  // Generel rengørings-fallback når intet andet matcher — bedre end "🧰".
  [/rengøring|rens$/i, "🧽"],

  // Vinduer & facader
  [/vindue|rude|karm/i, "🪟"],
  [/glas|ovenlys|vinter.*have/i, "🪟"],
  [/facade|graffiti/i, "🧱"],
  [/solcelle/i, "☀️"],
  [/tagrend/i, "💦"],
  [/tagrens|tag.*rens|alge/i, "🪣"],
  [/imprægn/i, "🛡️"],
  [/flise|belægning|granit|natursten|fuge|indkørsel/i, "🧱"],

  // Skadedyr
  [/skadedyr|insekt|hveps|myre|væg.*lus|sølvfisk|kakerlak|møl/i, "🐜"],
  [/rotte|muse|gnaver|mår/i, "🐭"],
  [/fugl|due/i, "🕊️"],
  [/borebille|hus.*bukke|råd.*svamp|træ.*skadedyr/i, "🪵"],

  // Skorsten
  [/skorsten|fejning|sod|brænde.*ovn|pille.*ovn|røg.*rør/i, "🏚️"],

  // Have
  [/græs|plæne|topdress|vertikal/i, "🌱"],
  [/hæk|busk/i, "🌳"],
  [/beskæring|frugt.*træ|krone|stamme/i, "✂️"],
  [/træ.?fældning|stub|top.*kapning|sektions/i, "🪓"],
  [/lugning|oprydning|haveaffald/i, "🧹"],
  [/anlæg|bede|beplantning|drivhus|have.*projekt/i, "🌷"],
  [/sne|salt|glat|vinter/i, "❄️"],
  [/løv/i, "🍂"],
  [/dam|bassin|vand.*anlæg|vandings/i, "💧"],
  [/gravsted/i, "🪦"],
  [/jord|drænarbejde|terræn|afgravning/i, "🚜"],
  [/hegn|læhegn|pergola/i, "🪧"],

  // Tømrer / Murer / Maler / Bad
  [/tag.*arbejde|tagsten|under.*tag|nyt tag|tag.*reparation/i, "🏠"],
  [/tilbygning|udestue|carport|altan|skur/i, "🏗️"],
  [/dør|vindue.*montering|termo/i, "🚪"],
  [/snedker|skab|køkken.*montering|trappe.*renov/i, "🪚"],
  [/terrasse|trædæk|komposit/i, "🪵"],
  [/spær|bjælke|reparation/i, "🔧"],
  [/murværk|sokkel|pudsning|filt|sand.*blæs/i, "🧱"],
  [/bade.*værelse|vådrum/i, "🛁"],
  [/maling|tapet|fiber|glas.*væv|spartling/i, "🎨"],

  // VVS
  [/vvs|vand|afløb|kloak|toilet|bad|brus|blander/i, "💧"],
  [/varme|radiator|gulvvarme|fjernvarme|varmepumpe/i, "♨️"],

  // El
  [/el(ek)?triker|el.*installation|stik|sikring|gruppetavle/i, "⚡"],
  [/lade.*standar|elbil/i, "🔌"],
  [/belysning|lampe|spot/i, "💡"],
  [/alarm|kamera|overvågning/i, "📹"],

  // Flytte
  [/flytte|transport|opmagasin/i, "📦"],

  // Sikkerhed
  [/lås|nøgle|adgang/i, "🔑"],
  [/brand|røgalarm/i, "🔥"],
];

/**
 * Returnerer ikon for en underkategori — falder tilbage til kategoriens
 * ikon hvis intet keyword matcher, og til standard hvis intet er angivet.
 */
export const getSubcategoryIcon = (
  subcategory?: string | null,
  category?: string | null,
): string => {
  if (subcategory) {
    for (const [re, icon] of SUBCATEGORY_KEYWORD_ICONS) {
      if (re.test(subcategory)) return icon;
    }
  }
  return getCategoryIcon(category);
};