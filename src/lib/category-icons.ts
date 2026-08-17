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
  "Industriservice": "⚙️",
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
  // ─────────────────────────────────────────────────────────────
  // VIGTIGT: Mest specifikke matches ØVERST. Brede keywords som
  // "vand", "bad", "tag" skal stå sidst og være afgrænsede (\b),
  // så fx "rentvandsanlæg" ikke rammer en "vand"-regel beregnet
  // til VVS. Første match vinder.
  // ─────────────────────────────────────────────────────────────

  // ─── Vinduer, glas, facader (skal stå før rengøring/vand) ───
  [/vindue|rude|karm|rentvand|pure.?water/i, "🪟"],
  [/ovenlys|vinter.?have|glas(facade|tag)?/i, "🪟"],
  [/solcelle/i, "☀️"],
  [/graffiti/i, "🎨"],
  [/facade|murværk|sokkel|filt|sand.?blæs/i, "🧱"],
  [/flise|belægning|granit|natursten|fuge|indkørsel/i, "🧱"],

  // ─── Tag (rens, render, reparation) ───
  [/tagrens|tag.?rens|alge.?fjern|alge.?behandl/i, "🪣"],
  [/tagrend/i, "💦"],
  [/imprægn/i, "🛡️"],
  [/tag.?arbejde|tagsten|under.?tag|nyt tag|tag.?reparation/i, "🏠"],
  [/skorsten|fejning|\bsod\b|brænde.?ovn|pille.?ovn|røg.?rør/i, "🏚️"],

  // ─── Rengøring-varianter (specifikke før brede) ───
  [/aflevering|slut.?rengøring|nøgle.?aflever/i, "🔑"],
  [/dødsbo/i, "🕯️"],
  [/hovedrengøring|forår.?rengøring/i, "✨"],
  [/kontor.?rengøring/i, "🏢"],
  [/erhverv|butik|industri|lager|restaurant|klinik|skole/i, "🏬"],
  [/trappe|opgang|fælles.?areal/i, "🪜"],
  [/bygge.?rengøring|bygge.*under arbejde/i, "🏗️"],
  [/desinfic|smitte|covid|virus/i, "🧴"],
  [/brand.?skade|vand.?skade|hoarder|special.?rengøring/i, "🧴"],
  [/tæppe.?rens|polstring|møbel.?rens/i, "🛋️"],
  [/måtte.?rens|gardin.?rens/i, "🧺"],
  [/privat.*rengøring|hjemme.?rengøring|ugentlig.?rengøring|14.?dag|månedlig.?rengøring|engangs.?rengøring/i, "🏠"],
  [/rengøring|rens$/i, "🧽"],

  // ─── Skadedyr ───
  [/skadedyr|insekt|hveps|myre|væg.?lus|sølvfisk|kakerlak|møl\b/i, "🐜"],
  [/rotte|muse|gnaver|\bmår\b/i, "🐭"],
  [/fugl|due/i, "🕊️"],
  [/borebille|hus.?bukke|råd.?svamp|træ.?skadedyr/i, "🪵"],

  // ─── Have ───
  [/græs|plæne|topdress|vertikal/i, "🌱"],
  [/hæk|busk/i, "🌳"],
  [/beskæring|frugt.?træ|krone|stamme/i, "✂️"],
  [/træ.?fældning|stub|top.?kapning|sektions/i, "🪓"],
  [/lugning|oprydning|haveaffald|løv/i, "🍂"],
  [/anlæg|bede|beplantning|drivhus|have.?projekt/i, "🌷"],
  [/sne|salt|glat.?før|vinter.?service/i, "❄️"],
  [/dam|bassin|vandings/i, "💧"],
  [/gravsted/i, "🪦"],
  [/jord.?arbejde|drænarbejde|terræn|afgravning/i, "🚜"],
  [/hegn|læhegn|pergola/i, "🪧"],

  // ─── Bygge / Tømrer / Murer / Maler / Bad ───
  [/tilbygning|udestue|carport|altan|skur/i, "🏗️"],
  [/snedker|skab|køkken.?montering|trappe.?renov/i, "🪚"],
  [/dør.?montering|dør.?udskift|termo.?rude|vindue.?montering/i, "🚪"],
  [/terrasse|trædæk|komposit/i, "🪵"],
  [/bade.?værelse|vådrum/i, "🛁"],
  [/maling|tapet|fiber.?væv|glas.?væv|spartling/i, "🎨"],
  [/spær|bjælke/i, "🔧"],

  // ─── VVS ───
  [/vvs|afløb|kloak|toilet|bruser|blander|vandhane|vandrør|rørarbejde/i, "🚰"],
  [/varme|radiator|gulvvarme|fjernvarme|varmepumpe/i, "♨️"],

  // ─── El ───
  [/el(ek)?triker|el.?installation|stikkontakt|sikring|gruppetavle/i, "⚡"],
  [/lade.?stander|elbil/i, "🔌"],
  [/belysning|lampe|\bspot\b/i, "💡"],
  [/alarm|kamera|overvågning/i, "📹"],

  // ─── Flytte ───
  [/flytte|transport|opmagasin/i, "📦"],

  // ─── Sikkerhed / Lås ───
  [/lås|nøgle.?service|adgangs.?kontrol/i, "🔑"],
  [/brand.?alarm|røgalarm/i, "🔥"],
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