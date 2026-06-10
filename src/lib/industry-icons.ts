/**
 * Brancheikoner — illustrative SVG-ikoner pr. branche.
 *
 * Bruges på tværs af Services, Aftaler, "Opret bestilling" osv. så vi får et
 * konsistent, genkendeligt branche-ikon i stedet for emoji. Ukendte brancher
 * får et neutralt placeholder-ikon i samme stil indtil et dedikeret ikon
 * uploades.
 */
import cleaningAsset from "@/assets/industry-icons/cleaning.svg.asset.json";
import windowCleaningAsset from "@/assets/industry-icons/window-cleaning.svg.asset.json";
import roofAlgaeAsset from "@/assets/industry-icons/roof-algae.svg.asset.json";
import tileCleaningAsset from "@/assets/industry-icons/tile-cleaning.svg.asset.json";
import facadeCleaningAsset from "@/assets/industry-icons/facade-cleaning.svg.asset.json";
import solarCleaningAsset from "@/assets/industry-icons/solar-cleaning.svg.asset.json";
import blacksmithAsset from "@/assets/industry-icons/blacksmith.svg.asset.json";
import autoserviceAsset from "@/assets/industry-icons/autoservice.svg.asset.json";
import carpenterAsset from "@/assets/industry-icons/carpenter.svg.asset.json";
import chimneySweepAsset from "@/assets/industry-icons/chimney-sweep.svg.asset.json";
import electricianAsset from "@/assets/industry-icons/electrician.svg.asset.json";
import flooringAsset from "@/assets/industry-icons/flooring.svg.asset.json";
import gardenAsset from "@/assets/industry-icons/garden.svg.asset.json";
import graveAsset from "@/assets/industry-icons/grave.svg.asset.json";
import haulageAsset from "@/assets/industry-icons/haulage.svg.asset.json";
import securityAsset from "@/assets/industry-icons/security.svg.asset.json";
import insulationAsset from "@/assets/industry-icons/insulation.svg.asset.json";
import landscapingAsset from "@/assets/industry-icons/landscaping.svg.asset.json";
import masonAsset from "@/assets/industry-icons/mason.svg.asset.json";
import movingAsset from "@/assets/industry-icons/moving.svg.asset.json";
import painterAsset from "@/assets/industry-icons/painter.svg.asset.json";
import pestAsset from "@/assets/industry-icons/pest.svg.asset.json";
import plumbingAsset from "@/assets/industry-icons/plumbing.svg.asset.json";
import windowInstallerAsset from "@/assets/industry-icons/window-installer.svg.asset.json";
import itServiceAsset from "@/assets/industry-icons/it-service.svg.asset.json";
import placeholder from "@/assets/industry-icons/placeholder.svg";

const cleaning = cleaningAsset.url;
const windowCleaning = windowCleaningAsset.url;
const roofAlgae = roofAlgaeAsset.url;
const tileCleaning = tileCleaningAsset.url;
const facadeCleaning = facadeCleaningAsset.url;
const solarCleaning = solarCleaningAsset.url;
const blacksmith = blacksmithAsset.url;
const autoservice = autoserviceAsset.url;
const carpenter = carpenterAsset.url;
const chimneySweep = chimneySweepAsset.url;
const electrician = electricianAsset.url;
const flooring = flooringAsset.url;
const garden = gardenAsset.url;
const grave = graveAsset.url;
const haulage = haulageAsset.url;
const security = securityAsset.url;
const insulation = insulationAsset.url;
const landscaping = landscapingAsset.url;
const mason = masonAsset.url;
const moving = movingAsset.url;
const painter = painterAsset.url;
const pest = pestAsset.url;
const plumbing = plumbingAsset.url;
const windowInstaller = windowInstallerAsset.url;
const itService = itServiceAsset.url;

/**
 * Eksplicitte branche-mapninger (key fra service-taxonomy).
 * Dækker alle 25 udkørende serviceydende brancher.
 */
const INDUSTRY_ASSETS: Record<string, string> = {
  "Rengøring": cleaning,
  "Vinduespudsning": windowCleaning,
  "Algebehandling": roofAlgae,
  "Fliserens": tileCleaning,
  "Facaderens": facadeCleaning,
  "Solcellerens": solarCleaning,
  "Skadedyrsbekæmpelse": pest,
  "Skorstensfejer": chimneySweep,
  "Haveservice": garden,
  "Anlægsgartner": landscaping,
  "Gravstedspleje": grave,
  "Tømrer": carpenter,
  "Murer": mason,
  "Maler": painter,
  "VVS": plumbing,
  "Elektriker": electrician,
  "Gulvlægger": flooring,
  "Glarmester": windowInstaller,
  "Smede": blacksmith,
  "Isolering": insulation,
  "Flyttehjælp": moving,
  "Vognmand": haulage,
  "Autoservice": autoservice,
  "Sikkerhed": security,
  "IT-service": itService,
};

/**
 * Keyword-baseret fallback: hvis underkategori/serviceens navn ramler
 * tydeligt ind i en kendt branche bruger vi det ikon, så fx
 * "Solcellerens" under "Vinduespudsning" stadig får solcelle-ikonet.
 */
const KEYWORD_FALLBACK: Array<[RegExp, string]> = [
  [/solcelle/i, solarCleaning],
  [/flise|fuge|belægning|granit|natursten|indkørsel/i, tileCleaning],
  [/facade|graffiti|murværk|sand.?blæs|filt/i, facadeCleaning],
  [/tag.?rens|alge|imprægn|tagrend/i, roofAlgae],
  [/vindue|rude|karm|rentvand|pure.?water|ovenlys|glas.?tag|glas.?facade|vinter.?have/i, windowCleaning],
  [/skadedyr|skadedyrs|rotte|insekt|hveps|mus|væglus/i, pest],
  [/skorsten|fejning|\bsod\b|brænde.?ovn|pille.?ovn/i, chimneySweep],
  [/gravsted|gravsteds/i, grave],
  [/anlægs|landskab|jordarbejde/i, landscaping],
  [/have|græs|hæk|busk|beskæring|træ.?fældning/i, garden],
  [/tømrer|snedker|tagsten|spær/i, carpenter],
  [/murer|murværk|skorsten|pudsning/i, mason],
  [/maler|maling|tapet|spartling/i, painter],
  [/vvs|kloak|afløb|toilet|bruser|blander|vandhane|varme|radiator|varmepumpe/i, plumbing],
  [/el(ek)?triker|el.?installation|stikkontakt|sikring|lade.?stander/i, electrician],
  [/gulv.?l[æa]gger|trægulv|park|laminat|vinyl|epoxy/i, flooring],
  [/glarmester|glas.?v[æa]g|spejl|bruse.?d[øo]r|term?o.?rude/i, windowInstaller],
  [/smed|svejs|stål|gelænder/i, blacksmith],
  [/isolering|hulmur|loft.?isol/i, insulation],
  [/flytte|opmagasin/i, moving],
  [/vognmand|kurer|fragt|transport|kran|lift/i, haulage],
  [/bil(pleje|rengøring|vask)|mekaniker|dækskift|stenslag/i, autoservice],
  [/sikkerhed|alarm|kamera|overvågning|lås.?smed|adgangs.?kontrol/i, security],
  [/it.?service|netværk|wi.?fi|smart home|pc.?hjælp|tv.?montering|av.?montering/i, itService],
  // Bred rengørings-fallback (mest specifikke matches står over).
  [/rengøring|rens\b|rens$|polering|støvsug|gulvvask/i, cleaning],
];

/** Returnér SVG-asset URL for en branche-key, eller placeholder. */
export function getIndustryIconByKey(key?: string | null): string {
  if (key && INDUSTRY_ASSETS[key]) return INDUSTRY_ASSETS[key];
  return placeholder;
}

export const INDUSTRY_PLACEHOLDER_ICON = placeholder;

/**
 * Returnér SVG-asset URL for en branche. Falder tilbage til en neutral
 * placeholder så alle brancher får et illustrativt ikon.
 *
 * Søger keyword-match i kategori + underkategori + navn, så vi også
 * kan ramme rigtigt når kun servicens navn er kendt (fx
 * "Hovedrengøring af villa" → cleaning-ikon).
 */
export function getIndustryIconAsset(
  category?: string | null,
  subcategory?: string | null,
  name?: string | null,
): string {
  if (category && INDUSTRY_ASSETS[category]) return INDUSTRY_ASSETS[category];

  const haystack = `${name ?? ""} ${subcategory ?? ""} ${category ?? ""}`.trim();
  if (haystack) {
    for (const [re, asset] of KEYWORD_FALLBACK) {
      if (re.test(haystack)) return asset;
    }
  }
  return placeholder;
}
