import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_UNITS = ["stk", "m²", "m", "timer", "rum", "km", "kg", "kr"];

// Kategori-specifikke retningslinjer baseret på faktiske 2025 danske markedspriser (ekskl. moms).
const CATEGORY_GUIDELINES: Record<string, string> = {
  "Rengøring": `BRANCHE: Rengøring (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Privat rengøring" / "Fast rengøring": 159-229 kr/time ELLER 8-14 kr/m². Brug m² for store boliger.
- "Hovedrengøring": 18-28 kr/m², varighed 4-8 timer. Min 80m², default 100m².
- "Flytterengøring": 22-35 kr/m² (krav om K-mærket niveau). Min 50m², default 80m².
- "Erhvervsrengøring": 6-12 kr/m² (volumen-rabat). Min 100m², default 250m².
- "Vinduespudsning": se egen kategori.
TYPISKE TRIN (vælg de mest relevante 2-4):
- "Boligstørrelse" — m², default 90, min 30, max 400
- "Antal badeværelser" — stk, 180-280 kr/stk, default 1, min 1, max 5
- "Ovnrens" — stk, 250-450 kr/stk, default 0, min 0, max 2
- "Køleskab indvendig rens" — stk, 200-350 kr/stk, default 0, min 0, max 2
- "Vinduer indvendigt" — stk, 25-45 kr/stk, default 0
UNDGÅ: trin der duplikerer m² (fx "antal rum" hvis "boligstørrelse" allerede findes).`,

  "Vinduespudsning": `BRANCHE: Vinduespudsning (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Privat" / "Villa": brug "antal vinduesfag" (et fag = ét rektangel der åbner separat).
- "Erhverv" / "Butik" / "Glasfacade": brug m² glasareal.
- "Tagvinduer/Velux" kræver lift eller stige → markant højere pris/stk.
TYPISKE TRIN:
- "Antal vinduesfag" — stk, 28-48 kr/stk (privat), default 12, min 4, max 80
- "Karme & rammer" — stk, 12-22 kr/stk (tillæg), default 0
- "Tagvinduer / Velux" — stk, 70-140 kr/stk, default 0, min 0, max 15
- "Glasareal (erhverv)" — m², 22-55 kr/m², default 50, min 10, max 1000
- "Etager over stueplan" — stk, 60-180 kr/stk (rentvandsanlæg/lift), default 0, min 0, max 6
ABONNEMENT giver 15-25% rabat — brug LAVERE ende af spændet hvis service er fast/ugentlig/månedlig.`,

  "Haveservice": `BRANCHE: Haveservice / anlægsgartner (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Græsslåning" (fast): 1,5-4 kr/m² pr. klipning ved abonnement, 4-8 kr/m² engangs.
- "Hækklipning": pr. løbende meter, prisen afhænger af højde.
- "Træfældning/beskæring": pr. stk, prisen afhænger af størrelse.
- "Anlæg" (fliser, terrasse): 600-1400 kr/m².
TYPISKE TRIN:
- "Græsplæne" — m², 2-5 kr/m² (abonnement) eller 5-9 kr/m² (engangs), default 200, min 30, max 3000
- "Hækklipning (løbende meter)" — m, 45-90 kr/m (under 2m højde), default 20, min 0, max 300
- "Beskæring af træer/buske" — stk, 350-1400 kr/stk, default 0, min 0, max 20
- "Ukrudtsbekæmpelse fliser" — m², 8-18 kr/m², default 0, min 0, max 200
- "Bortkørsel haveaffald" — m³, 280-550 kr/m³ (inkl. deponi-gebyr), default 0, min 0, max 10`,

  "Flyttehjælp": `BRANCHE: Flyttehjælp / transport (2025 priser ekskl. moms).
UNDERKATEGORI-LOGIK:
- "Privat flytning": pris pr. m² + tillæg.
- "Pianoflytning/specialgods": fast pris pr. genstand (1500-4500 kr).
- "Erhvervsflytning": time-baseret med flere mand.
TYPISKE TRIN:
- "Boligstørrelse" — m², 40-75 kr/m² (op til 80km), default 80, min 30, max 350
- "Etager uden elevator" — stk, 350-650 kr/stk tillæg, default 0, min 0, max 6
- "Afstand mellem adresser" — km, 9-16 kr/km (efter første 25 km), default 15, min 0, max 500
- "Klaver / pengeskab / akvarium" — stk, 1200-3500 kr/stk, default 0, min 0, max 3
- "Pakkeservice (kasser ned)" — timer, 380-520 kr/time pr. mand, default 0, min 0, max 10`,

  "Maler": `BRANCHE: Malerarbejde indvendigt (2025 priser ekskl. moms, inkl. maling).
- "Vægareal" — m², 95-180 kr/m² (2 strøg, normal væg), default 40, min 5, max 300
- "Loft" — m², 110-200 kr/m² (sværere end vægge), default 20, min 5, max 200
- "Døre m. karm" — stk, 450-850 kr/stk (begge sider), default 0, min 0, max 15
- "Vinduer indvendigt" — stk, 380-750 kr/stk, default 0, min 0, max 15
- "Spartling/grundbehandling" — m², 45-95 kr/m² (tillæg ved dårlig overflade), default 0
UNDGÅ at sætte default til 0 på det vigtigste trin (vægareal) — sæt det til en typisk værdi.`,

  "Håndværker": `BRANCHE: Tømrer/snedker (2025 priser ekskl. moms).
- FØRSTE TRIN bør være "Udkald" — stk, 450-650 kr/stk (min=max=default=1) hvis service kræver fremmøde.
- "Timer" — timer, 475-650 kr/time, default 4, min 1, max 40
- "Materialer (estimat)" — kr, 1 kr/kr, default 0, min 0, max 50000
- "Kørsel ud over 25 km" — km, 7-13 kr/km, default 0, min 0, max 200
- "Antal arbejdsdage" — stk, 3800-5800 kr/stk (1 mand inkl. kørsel), default 1, min 1, max 30`,

  "VVS": `BRANCHE: VVS / blikkenslager (2025 priser ekskl. moms).
- FØRSTE TRIN: "Udkald (grundgebyr)" — stk, 650-950 kr/stk (min=max=default=1).
- "Timer" — timer, 625-895 kr/time, default 2, min 1, max 16
- "Nyt blandingsbatteri" — stk, 850-1900 kr/stk (inkl. arbejde, ekskl. armatur), default 0, min 0, max 5
- "Toilet udskiftning" — stk, 2200-3800 kr/stk, default 0, min 0, max 3
- "Akut tillæg (uden for åbningstid)" — stk, 800-1600 kr/stk, default 0, min 0, max 1
- "Kørsel" — km, 9-15 kr/km, default 0, min 0, max 100`,

  "Elektriker": `BRANCHE: Elektriker (2025 priser ekskl. moms).
- FØRSTE TRIN: "Udkald (grundgebyr)" — stk, 575-850 kr/stk (min=max=default=1).
- "Timer" — timer, 565-795 kr/time, default 2, min 1, max 16
- "Nye stikkontakter" — stk, 380-680 kr/stk (inkl. materiale + montering), default 0, min 0, max 20
- "Lampeudtag/spots" — stk, 420-750 kr/stk, default 0, min 0, max 30
- "HFI/HPFI gruppe ny" — stk, 1400-2400 kr/stk, default 0, min 0, max 5
- "Kørsel" — km, 8-14 kr/km, default 0, min 0, max 100`,

  "Sikkerhed": `BRANCHE: Låsesmed / alarm / overvågning (2025 priser ekskl. moms).
- FØRSTE TRIN: "Udkald" — stk, 750-1250 kr/stk (akut udkald højere). min=max=default=1.
- "Timer" — timer, 625-895 kr/time, default 1, min 1, max 8
- "Lås udskiftet" — stk, 850-2400 kr/stk (afhænger af type), default 0, min 0, max 6
- "IP-overvågningskamera (inkl. installation)" — stk, 1800-4200 kr/stk, default 0, min 0, max 10
- "Akut tillæg (nat/weekend)" — stk, 600-1400 kr/stk, default 0, min 0, max 1`,

  "Skadedyr": `BRANCHE: Skadedyrsbekæmpelse (2025 priser ekskl. moms).
- FØRSTE TRIN: "Inspektion + grundgebyr" — stk, 700-1200 kr/stk (min=max=default=1).
- "Timer" — timer, 650-900 kr/time, default 1, min 1, max 8
- "Antal opfølgningsbesøg" — stk, 450-850 kr/stk, default 1, min 0, max 6
- "Areal" — m², 4-12 kr/m² (større områder = lavere pris), default 100, min 30, max 2000`,

  "Bilpleje": `BRANCHE: Bilpleje / autoklargøring (2025 priser ekskl. moms).
- "Udvendig vask + pleje" — stk, 250-450 kr/stk, default 1
- "Indvendig støvsugning + pleje" — stk, 350-650 kr/stk, default 0
- "Polering (lakforsegling)" — stk, 1400-3500 kr/stk, default 0, min 0, max 1
- "Læderpleje sæder" — stk, 600-1400 kr/stk, default 0
- "Motorvask" — stk, 350-700 kr/stk, default 0`,

  "Transport": `BRANCHE: Person- og varetransport / kurer (2025 priser ekskl. moms).
- "Grundgebyr / opstart" — stk, 95-225 kr/stk (min=max=default=1)
- "Kørsel" — km, 11-18 kr/km, default 20, min 1, max 500
- "Ventetid" — timer, 380-520 kr/time, default 0, min 0, max 8
- "Ekstra passager" — stk, 35-80 kr/stk, default 0, min 0, max 7
- "Bagage / pakker over 20 kg" — stk, 25-90 kr/stk, default 0, min 0, max 20`,

  "IT": `BRANCHE: IT-support / webudvikling / konsulent (2025 priser ekskl. moms).
- "Timer (konsulent)" — timer, 695-1295 kr/time, default 4, min 1, max 80
- "Akut support (uden for åbningstid)" — timer, 1295-1895 kr/time, default 0, min 0, max 8
- "Hosting/drift pr. måned" — stk, 195-895 kr/stk, default 0
- "Domæne + opsætning" — stk, 350-650 kr/stk, default 0, min 0, max 5
- "Kørsel onsite" — km, 8-14 kr/km, default 0, min 0, max 200`,

  "Personlig pleje": `BRANCHE: Frisør / kosmetolog / negletekniker / massage (2025 priser ekskl. moms).
- "Hovedbehandling" — stk, 295-695 kr/stk (default=1, min=1, max=1) — tilpas pris til konkret behandling.
- "Tillægsbehandling" — stk, 95-395 kr/stk, default 0, min 0, max 3
- "Varighed" — timer, 450-850 kr/time, default 1, min 0.5, max 4 (brug ENTEN dette ELLER hovedbehandling, ikke begge)
- "Hjemmebesøg-tillæg" — stk, 150-400 kr/stk, default 0, min 0, max 1`,

  "Hund/dyr": `BRANCHE: Hundeluftning / dyrepasning / trimning (2025 priser ekskl. moms).
- "Antal hunde" — stk, 95-185 kr/stk pr. tur, default 1, min 1, max 4
- "Varighed pr. tur" — timer, 0 kr/time (informativt) — hellere "Type tur" som stk.
- "Antal ture pr. uge" — stk, 95-185 kr/stk, default 3, min 1, max 7
- "Pasning pr. døgn" — stk, 195-395 kr/stk, default 0, min 0, max 30
- "Trimning (kort/lang pels)" — stk, 350-850 kr/stk, default 0, min 0, max 3`,

  "Foto/Video": `BRANCHE: Fotograf / videoproduktion (2025 priser ekskl. moms).
- "Optagetid" — timer, 1495-2895 kr/time, default 2, min 1, max 12
- "Antal redigerede billeder" — stk, 25-65 kr/stk, default 25, min 5, max 300
- "Videoredigering" — timer, 695-1195 kr/time, default 0, min 0, max 40
- "Drone-optagelse" — stk, 1495-2895 kr/stk, default 0, min 0, max 1
- "Kørsel" — km, 7-12 kr/km, default 0, min 0, max 300`,

  "Event": `BRANCHE: Event / DJ / catering / underholdning (2025 priser ekskl. moms).
- "Pakke / grundydelse" — stk, 3500-9500 kr/stk (min=max=default=1)
- "Antal gæster" — stk, 95-395 kr/stk (catering), default 30, min 10, max 500
- "Ekstra timer ud over pakke" — timer, 695-1295 kr/time, default 0, min 0, max 6
- "Opsætning/nedtagning" — timer, 495-695 kr/time, default 0, min 0, max 8
- "Kørsel" — km, 8-14 kr/km, default 0, min 0, max 300`,

  "Undervisning": `BRANCHE: Undervisning / coaching / kurser (2025 priser ekskl. moms).
- "Antal lektioner" — stk, 395-895 kr/stk (60 min), default 1, min 1, max 50
- "Forberedelse" — timer, 395-695 kr/time, default 0, min 0, max 10
- "Materialer" — stk, 95-395 kr/stk, default 0, min 0, max 20
- "Online (rabat) / fysisk fremmøde" — kun ét trin — undgå dobbelthed.`,
};

// Bredt søgeordskatalog — bruges når kategori er ukendt eller mangler, eller for at validere
// at AI'en vælger den rigtige enhed til "rummet" som beskrivelsen handler om.
const SEMANTIC_HINTS = `
SEMANTISK FORTOLKNING (brug disse signaler fra service-navn/beskrivelse til at vælge enhed):
- "m²", "kvadratmeter", "areal", "bolig", "lejlighed", "hus", "kontor" → enhed m²
- "vinduer", "vinduesfag", "ruder" → stk (privat) eller m² (erhverv glasareal)
- "antal", "stk", "rum", "værelser", "badeværelser", "døre", "kameraer" → stk
- "løbende meter", "hæk", "hegn", "kabel" → m
- "timer", "konsultation", "session", "lektion" → timer (eller stk hvis fast pris pr. session)
- "kørsel", "afstand", "transport", "km" → km
- "vægt", "kg", "tonnage" → kg
- "budget", "materialer estimeret", "udlæg" → kr (1 kr/kr)
- "abonnement", "fast", "ugentlig", "månedlig" → brug NEDRE prisleje (15-25% rabat)
- "akut", "24/7", "udkald uden for åbningstid" → ekstra tillægstrin
- "hjemmebesøg", "onsite", "kommer ud" → tilføj "Udkald" eller "Kørsel" trin
- "premium", "luksus", "specialist" → øvre prisleje
- "studie", "begynder", "basic" → nedre prisleje

NAVNGIVNING — PRIORITER konkrete branchetermer over generiske ord:
- IKKE "Antal" (alene), "Mængde", "Størrelse" — brug "Antal vinduesfag", "Boligstørrelse i m²" etc.
- IKKE engelske ord — brug danske ("hours" → "timer", "size" → "størrelse").
- Inkluder enheden i label hvis det forbedrer klarhed: "Vægareal (m²)", "Hækklipning (løbende m)".
`;

const FEW_SHOT_EXAMPLES = `
EKSEMPEL 1 — "Hovedrengøring inkl. ovnrens" (Rengøring/Hovedrengøring):
[
  { "label": "Boligstørrelse", "unit": "m²", "price_per_unit": 24, "min_value": 50, "max_value": 350, "default_value": 110 },
  { "label": "Antal badeværelser", "unit": "stk", "price_per_unit": 245, "min_value": 1, "max_value": 5, "default_value": 1 },
  { "label": "Ovnrens", "unit": "stk", "price_per_unit": 375, "min_value": 0, "max_value": 2, "default_value": 1 }
]

EKSEMPEL 2 — "Vinduespudsning villa" (Vinduespudsning/Privat):
[
  { "label": "Antal vinduesfag", "unit": "stk", "price_per_unit": 38, "min_value": 4, "max_value": 60, "default_value": 14 },
  { "label": "Karme & rammer", "unit": "stk", "price_per_unit": 16, "min_value": 0, "max_value": 60, "default_value": 0 },
  { "label": "Tagvinduer / Velux", "unit": "stk", "price_per_unit": 95, "min_value": 0, "max_value": 8, "default_value": 0 }
]

EKSEMPEL 3 — "Akut VVS-udkald" (VVS):
[
  { "label": "Udkald (grundgebyr)", "unit": "stk", "price_per_unit": 825, "min_value": 1, "max_value": 1, "default_value": 1 },
  { "label": "Timer", "unit": "timer", "price_per_unit": 745, "min_value": 1, "max_value": 12, "default_value": 2 },
  { "label": "Akut tillæg (nat/weekend)", "unit": "stk", "price_per_unit": 1195, "min_value": 0, "max_value": 1, "default_value": 0 },
  { "label": "Kørsel", "unit": "km", "price_per_unit": 12, "min_value": 0, "max_value": 80, "default_value": 0 }
]

EKSEMPEL 4 — "Hundeluftning fast aftale" (Hund/dyr, abonnement):
[
  { "label": "Antal hunde", "unit": "stk", "price_per_unit": 125, "min_value": 1, "max_value": 3, "default_value": 1 },
  { "label": "Antal ture pr. uge", "unit": "stk", "price_per_unit": 125, "min_value": 1, "max_value": 7, "default_value": 3 }
]
`;

// Geografiske prisjusteringer.
function geoModifierHint(city?: string): string {
  if (!city) return "";
  const c = city.toLowerCase();
  if (/(københav|frederiksberg|gentofte|hellerup|charlottenlund|lyngby|gladsaxe)/i.test(c)) {
    return `\nGEOGRAFI: ${city} ligger i Hovedstaden — brug ØVRE ende af prisspændet (ca. +10-15% over landsgennemsnit).`;
  }
  if (/(aarhus|århus|odense|aalborg|esbjerg|kolding|vejle|horsens|randers|roskilde|herning)/i.test(c)) {
    return `\nGEOGRAFI: ${city} er en større dansk by — brug MIDTER til øvre ende af prisspændet (landsgennemsnit).`;
  }
  return `\nGEOGRAFI: ${city} er typisk mindre by/yderområde — brug NEDRE til midter ende af prisspændet (-5-10% under landsgennemsnit).`;
}

// Fuzzy matching: hvis kategori er "Hundepasning" eller "Pet care" så match til "Hund/dyr".
const CATEGORY_ALIASES: Array<{ patterns: RegExp[]; key: string }> = [
  { patterns: [/rengør/i, /cleaning/i], key: "Rengøring" },
  { patterns: [/vindues/i, /window/i], key: "Vinduespudsning" },
  { patterns: [/have/i, /garden/i, /gartner/i], key: "Haveservice" },
  { patterns: [/flyt/i, /moving/i], key: "Flyttehjælp" },
  { patterns: [/maler/i, /paint/i], key: "Maler" },
  { patterns: [/tømrer/i, /snedker/i, /håndværk/i, /carpenter/i], key: "Håndværker" },
  { patterns: [/vvs/i, /blikkens/i, /plumber/i], key: "VVS" },
  { patterns: [/elektrik/i, /electrician/i], key: "Elektriker" },
  { patterns: [/låse/i, /alarm/i, /overvåg/i, /security/i], key: "Sikkerhed" },
  { patterns: [/skadedyr/i, /pest/i, /rotte/i, /mus/i], key: "Skadedyr" },
  { patterns: [/bil/i, /auto/i, /car/i], key: "Bilpleje" },
  { patterns: [/transport/i, /kurer/i, /levering/i, /taxi/i, /vognmand/i], key: "Transport" },
  { patterns: [/it[- ]/i, /web/i, /softwar/i, /konsulent/i, /developer/i], key: "IT" },
  { patterns: [/frisør/i, /kosmetolog/i, /massage/i, /negl/i, /skønhed/i, /beauty/i], key: "Personlig pleje" },
  { patterns: [/hund/i, /kat/i, /dyr/i, /pet/i], key: "Hund/dyr" },
  { patterns: [/foto/i, /video/i, /photographer/i], key: "Foto/Video" },
  { patterns: [/event/i, /dj/i, /catering/i, /bryllup/i, /fest/i], key: "Event" },
  { patterns: [/undervis/i, /kursus/i, /coach/i, /teach/i, /tutor/i], key: "Undervisning" },
];

function resolveCategoryKey(category?: string, name?: string, description?: string): string | null {
  if (category && CATEGORY_GUIDELINES[category]) return category;
  const haystack = `${category || ""} ${name || ""} ${description || ""}`.slice(0, 600);
  for (const alias of CATEGORY_ALIASES) {
    if (alias.patterns.some((p) => p.test(haystack))) return alias.key;
  }
  return null;
}

function guidelinesFor(categoryKey: string | null, subcategory?: string): string {
  if (!categoryKey) return "";
  const base = CATEGORY_GUIDELINES[categoryKey];
  if (!base) return "";
  const subHint = subcategory
    ? `\n\nUNDERKATEGORI: ${subcategory} — tilpas trin og priser specifikt til denne underkategori.`
    : "";
  return base + subHint;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authErr } = await supa.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      serviceName,
      serviceCategory,
      subcategory,
      serviceDescription,
      businessName,
      businessDescription,
      businessCategories,
      businessCity,
      intervalOptions,
    } = body || {};

    if (!serviceName || !String(serviceName).trim()) {
      return new Response(JSON.stringify({ error: "serviceName er påkrævet" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ikke konfigureret");

    const businessLine = [
      businessName ? `Navn: ${businessName}` : null,
      Array.isArray(businessCategories) && businessCategories.length > 0
        ? `Brancher: ${businessCategories.join(", ")}`
        : null,
      businessCity ? `By: ${businessCity}` : null,
      businessDescription ? `Beskrivelse: ${businessDescription}` : null,
    ].filter(Boolean).join(" | ");

    const serviceLine = [
      `Servicenavn: ${serviceName}`,
      serviceCategory ? `Kategori: ${serviceCategory}` : null,
      subcategory ? `Underkategori: ${subcategory}` : null,
      serviceDescription ? `Beskrivelse: ${String(serviceDescription).slice(0, 1000)}` : null,
      Array.isArray(intervalOptions) && intervalOptions.length > 0
        ? `Intervaller: ${intervalOptions.join(", ")}`
        : null,
    ].filter(Boolean).join(" | ");

    // Smart fuzzy matching — hvis kategori ikke matcher direkte, prøv at finde via navn/beskrivelse.
    const resolvedCategory = resolveCategoryKey(serviceCategory, serviceName, serviceDescription);
    const categoryGuidelines = guidelinesFor(resolvedCategory, subcategory);
    const geoHint = geoModifierHint(businessCity);
    const isSubscription = Array.isArray(intervalOptions)
      && intervalOptions.some((i: string) => i && i !== "engangskøb");

    const systemPrompt = `Du er ekspert i prissætning på det danske servicemarked (2025) og bygger prisberegnere som matcher MAX ±10% fra reel markedspris.

DIN OPGAVE: Læs servicens NAVN og BESKRIVELSE meget nøje. Find ud af PRÆCIST hvad denne service indebærer — ikke generelt for kategorien, men for netop DENNE udbyder. Skab derefter 2-5 trin der lader kunden vælge omfang så slutprisen passer.

KERNEREGLER:
- 2-4 trin er optimalt. Kun 5 trin hvis det giver kunden reel valgfrihed.
- Hvert trin SKAL være meningsfuldt for netop DENNE service. Ingen generisk fyld.
- Priser i DKK ekskl. moms, pr. enhed. Brug realistiske 2025-tal — IKKE runde tal som 100/500/1000.
  Foretræk præcise markedspriser (fx 245, 380, 1675) for autenticitet.
- Enheder: vælg fra ${ALLOWED_UNITS.join(", ")}. Brug "kr" hvis kunden skal indtaste et beløb (fx materiale-budget).
- min_value <= default_value <= max_value. Alle skal være endelige tal (ingen null).
- default_value SKAL være en realistisk typisk værdi — IKKE 0 medmindre trinnet er valgfrit ekstra.
- Hvis servicen kræver fysisk udkald (VVS, elektriker, låsesmed, mobil mekaniker mv.), gør FØRSTE trin til "Udkald (grundgebyr)" med min=max=default=1.
- Korte præcise danske labels (max 40 tegn). Brug konkrete branchetermer.
- UNDGÅ dobbelt-trin (fx både "boligstørrelse" og "antal rum"; eller både "vinduesfag" og "antal vinduer").
- Hvis beskrivelsen NÆVNER specifikke add-ons ("inkl. ovnrens", "tagvinduer ekstra"), reflekter det enten som obligatorisk (default=1) eller valgfri tilføjelse (default=0).
- Hvis beskrivelsen siger "alt inklusiv" eller "fast pakkepris", gør FØRSTE trin til en pakke (stk, default=1, min=max=1) og brug øvrige trin til reelle ekstra.
- ${isSubscription
    ? "Service tilbydes med ABONNEMENT — brug NEDRE ende af prisspændet (15-25% under engangspris) da kunden binder sig."
    : "Service er primært ENGANGSKØB — brug midter til øvre ende af prisspændet."}
${geoHint}
${SEMANTIC_HINTS}

${categoryGuidelines
    ? `KATEGORI-RETNINGSLINJER (følg disse priser og enheder tæt — afvig kun hvis servicenavnet/beskrivelsen klart kræver det):\n${categoryGuidelines}`
    : "Ukendt kategori — analysér service-navn og beskrivelse semantisk og brug 2025 dansk markedspris. Tjek mentalt mod 2-3 typiske konkurrenter i branchen."}

${FEW_SHOT_EXAMPLES}

KVALITETS-CHECK FØR DU SVARER (gør dette mentalt):
1. Giver mit valg af enheder mening? (ikke "stk" hvis "m²" er mere naturligt)
2. Er default_value en typisk bestilling — ikke 0, ikke max?
3. Vil totalprisen ved DEFAULT-værdier ligge inden for ±10% af reel markedspris?
4. Har jeg undgået dobbelt-trin og generiske labels?
5. Er der et "Udkald" trin hvis servicen kræver fremmøde?`;

    const userPrompt = `Lav en prisberegner-opsætning til denne service.

Virksomhed: ${businessLine || "(ingen oplysninger)"}
Service: ${serviceLine}
${resolvedCategory && resolvedCategory !== serviceCategory
  ? `\n(Note: Vi har gættet at servicen hører under "${resolvedCategory}" baseret på navn/beskrivelse.)`
  : ""}

Returnér 2-5 trin der præcist matcher netop denne service. Læs beskrivelsen nøje og lad trinene afspejle hvad der faktisk indgår — ikke generelle kategori-trin. Følg kategori-retningslinjerne for enheder og prisleje.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_calculator",
              description: "Returnér 2-5 prisberegner-trin specifikt tilpasset servicen.",
              parameters: {
                type: "object",
                properties: {
                  steps: {
                    type: "array",
                    minItems: 2,
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string", description: "Kort dansk label, max 40 tegn" },
                        unit: { type: "string", enum: ALLOWED_UNITS },
                        price_per_unit: { type: "number", description: "Pris i DKK pr. enhed" },
                        min_value: { type: "number" },
                        max_value: { type: "number" },
                        default_value: { type: "number" },
                      },
                      required: ["label", "unit", "price_per_unit", "min_value", "max_value", "default_value"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_calculator" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "For mange forespørgsler. Prøv igen om lidt." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-kreditter opbrugt." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI-generering fejlede");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) throw new Error("Tomt svar fra AI");

    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    const rawSteps = Array.isArray(parsed?.steps) ? parsed.steps : [];

    // Dedupe: undgå to trin med næsten identiske labels (fx "Antal vinduer" og "Vinduer").
    const seenLabels = new Set<string>();

    const steps = rawSteps
      .map((s: any) => {
        const unit = ALLOWED_UNITS.includes(s.unit) ? s.unit : "stk";
        let min = Number(s.min_value);
        let max = Number(s.max_value);
        let def = Number(s.default_value);
        const price = Number(s.price_per_unit);

        // Sikr at min ≤ default ≤ max selv hvis AI'en har lavet inkonsistente tal.
        if (!Number.isFinite(min)) min = 0;
        if (!Number.isFinite(max)) max = Math.max(min + 1, 100);
        if (max < min) [min, max] = [max, min];
        if (!Number.isFinite(def)) def = min;
        if (def < min) def = min;
        if (def > max) def = max;

        return {
          label: String(s.label || "").trim().slice(0, 60),
          unit,
          price_per_unit: Number.isFinite(price) && price >= 0 ? price : 0,
          min_value: min,
          max_value: max,
          default_value: def,
        };
      })
      .filter((s: any) => {
        if (s.label.length === 0 || s.price_per_unit <= 0) return false;
        const key = s.label.toLowerCase().replace(/[^a-zæøå0-9]/g, "");
        if (seenLabels.has(key)) return false;
        seenLabels.add(key);
        return true;
      })
      .slice(0, 5);

    if (steps.length === 0) throw new Error("AI returnerede ingen brugbare trin");

    return new Response(JSON.stringify({ steps, _resolvedCategory: resolvedCategory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-calculator-template error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
