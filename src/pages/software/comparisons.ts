/**
 * Sammenligninger med andre rutesystemer. Konkurrentdata må KUN komme fra
 * deres egne offentlige sider (se `sources`) og skal have en tjekdato.
 * Kan noget ikke dokumenteres, bruges "unknown" (vises som "Ikke oplyst").
 */
export type Cell = { v: "yes" | "no" | "partial" | "unknown"; note?: string };
export type Row = { group: string; feature: string; us: Cell; them: Cell };
export type Comparison = {
  slug: string;
  name: string;
  tagline: string;
  checked: string;
  sources: { label: string; url: string }[];
  summaryUs: string[];
  summaryThem: string[];
  rows: Row[];
  faq: { q: string; a: string }[];
};

const y = (note?: string): Cell => ({ v: "yes", note });
const n = (note?: string): Cell => ({ v: "no", note });
const p = (note: string): Cell => ({ v: "partial", note });
const u: Cell = { v: "unknown" };

export const comparisons: Comparison[] = [
  {
    slug: "skvizbiz",
    name: "SkvizBiz",
    tagline: "Et program til vinduespudsere og rengøring med indbygget bogføring.",
    checked: "4. november 2026",
    sources: [
      { label: "skvizbiz.dk/priser", url: "https://skvizbiz.dk/priser/" },
      { label: "skvizbiz.dk/hvorfor", url: "https://skvizbiz.dk/hvorfor/" },
      { label: "skvizbiz.dk", url: "https://skvizbiz.dk/" },
    ],
    summaryUs: [
      "Medarbejder-app med stopliste, billedbevis og offline-tilstand",
      "Fakturering direkte til e-conomic eller Dinero",
      "Nye kunder via Serviceyderes markedsplads",
      "Over 50 brancher, ikke kun vinduespudsning",
    ],
    summaryThem: [
      "Eget godkendt bogføringssystem (finansmodul)",
      "Betalingsservice-modul",
      "30 dages gratis prøve",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med optimering", us: y(), them: y() },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y() },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: p("Prisberegner-modul mod betaling") },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y("Egen app til Android"), them: p("Webprogram, der virker på telefonen") },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: u },
      { group: "Medarbejdere", feature: "Virker uden internet", us: y("Udførte besøg sendes, når nettet er tilbage"), them: n("Kræver internet ifølge SkvizBiz") },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: u },
      { group: "Økonomi", feature: "e-conomic", us: y(), them: u },
      { group: "Økonomi", feature: "Dinero", us: y(), them: u },
      { group: "Økonomi", feature: "Egen bogføring", us: n("Bogføring sker i e-conomic eller Dinero"), them: y("Finansmodul, 75 kr./md.") },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Økonomi", feature: "Betalingsservice", us: p("Via dit regnskabsprogram (e-conomic/Dinero)"), them: y("Tilkøb") },
      { group: "Kunder", feature: "SMS-beskeder til kunder", us: y(), them: y() },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Kunder", feature: "Brancher", us: y("Over 50"), them: p("Vinduespudsning og rengøring") },
      { group: "Opstart", feature: "Oprettelsesgebyr", us: p("Se priser"), them: p("1.495 kr. (Lite) / 3.495 kr. (Fuld)") },
      { group: "Opstart", feature: "Månedspris fra", us: p("Se priser"), them: p("100 kr. (Lite, 50 kunder) / 399 kr. (Fuld)") },
      { group: "Opstart", feature: "Gratis flytning af data", us: y(), them: y("Ved fuld version") },
    ],
    faq: [
      { q: "Kan I flytte mine kunder fra SkvizBiz?", a: "Ja. Eksportér dine kunder og aftaler fra SkvizBiz, og send dem til kundeservice. Vi lægger dem ind gratis." },
      { q: "Hvad sker der med min bogføring?", a: "SkvizBiz har eget finansmodul. Hos Serviceydere bogfører du i e-conomic eller Dinero, som fakturaerne sendes direkte til." },
      { q: "Er SkvizBiz bedre til noget?", a: "Ja. Vil du have bogføringen i selve ruteprogrammet, har SkvizBiz det. Hos Serviceydere sker bogføringen i e-conomic eller Dinero, og Betalingsservice tilkobles dér." },
    ],
  },
  {
    slug: "fenster",
    name: "Fenster",
    tagline: "Et program til små og mellemstore vinduespudsere med automatisk kalender.",
    checked: "4. november 2026",
    sources: [
      { label: "partner.fenster.dk/priser", url: "https://partner.fenster.dk/priser/" },
      { label: "partner.fenster.dk/funktioner", url: "https://partner.fenster.dk/funktioner/" },
    ],
    summaryUs: [
      "Ingen grænse på antal kunder i pakken",
      "Både e-conomic og Dinero",
      "Medarbejder-app med offline-tilstand og manuel tidsregistrering",
      "Over 50 brancher og nye kunder via markedsplads",
    ],
    summaryThem: [
      "MobilePay-betaling via Dinero",
      "Trustpilot-anmeldelser (Pro)",
      "Ferieplanlægning (Pro)",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med optimering", us: y(), them: y("Automatisk kalender") },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y() },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: y("10-200 pr. md. efter pakke") },
      { group: "Planlægning", feature: "Ferie og fravær", us: y("Meld ferie og syg – besøgene fordeles automatisk"), them: y("Pro og Premium") },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y("Egen app til Android"), them: u },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: y("Pro og Premium") },
      { group: "Medarbejdere", feature: "Virker uden internet", us: y("Udførte besøg sendes, når nettet er tilbage"), them: u },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: u },
      { group: "Økonomi", feature: "e-conomic", us: y(), them: u },
      { group: "Økonomi", feature: "Dinero", us: y(), them: y() },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Økonomi", feature: "MobilePay", us: p("Via dit regnskabsprogram (e-conomic/Dinero)"), them: y("Via Dinero") },
      { group: "Kunder", feature: "SMS-beskeder til kunder", us: y(), them: y() },
      { group: "Kunder", feature: "Trustpilot-anmeldelser", us: n("Egne anmeldelser på Serviceydere"), them: y("Pro og Premium") },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Kunder", feature: "Brancher", us: y("Over 50"), them: p("Vinduespudsning") },
      { group: "Opstart", feature: "Grænse for antal kunder", us: y("Ingen grænse"), them: p("100 / 500 / 2.000 efter pakke") },
      { group: "Opstart", feature: "Månedspris fra", us: p("Se priser"), them: p("99 / 399 / 1.199 kr.") },
      { group: "Opstart", feature: "Ekstra bruger", us: p("Se priser"), them: p("99 kr./md.") },
      { group: "Opstart", feature: "Gratis prøve", us: y("14 dage, uden kreditkort"), them: n("14 dages fortrydelsesret i stedet") },
      { group: "Opstart", feature: "Gratis flytning af data", us: y(), them: u },
    ],
    faq: [
      { q: "Kan I flytte mine kunder fra Fenster?", a: "Ja. Eksportér dine kunder og aftaler fra Fenster, og send dem til kundeservice. Vi lægger dem ind gratis." },
      { q: "Kan jeg stadig bruge Dinero?", a: "Ja. Serviceydere sender fakturaer til Dinero, og du kan også vælge e-conomic." },
      { q: "Er Fenster bedre til noget?", a: "Ja. Fenster har Trustpilot-anmeldelser indbygget. MobilePay og ferie har Serviceydere også – MobilePay via e-conomic eller Dinero." },
    ],
  },
  {
    slug: "rutemanager",
    name: "Rutemanager",
    tagline: "Ruteplanlægning og kundekartotek til danske vinduespudsere, der kører i browseren.",
    checked: "4. november 2026",
    sources: [
      { label: "rutemanager.dk/priser", url: "https://www.rutemanager.dk/priser" },
      { label: "rutemanager.dk/faq", url: "https://www.rutemanager.dk/faq" },
    ],
    summaryUs: [
      "Egen medarbejder-app, der virker uden internet",
      "Nye kunder via Serviceyderes markedsplads",
      "Over 50 brancher, ikke kun vinduespudsning",
      "Kundeservice flytter dine data for dig",
    ],
    summaryThem: [
      "Gratis pakke op til 10 kunder",
      "Billy-integration",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med optimering", us: y(), them: y("Fra 149 kr./md.") },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y() },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: y() },
      { group: "Planlægning", feature: "Ferie og fravær", us: y("Meld ferie og syg – besøgene fordeles automatisk"), them: u },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y("Egen app til Android"), them: p("Kører i browseren, ingen app") },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: y("Billedlager efter pakke") },
      { group: "Medarbejdere", feature: "Virker uden internet", us: y("Udførte besøg sendes, når nettet er tilbage"), them: u },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: u },
      { group: "Økonomi", feature: "e-conomic og Dinero", us: y(), them: y("Betalte pakker") },
      { group: "Økonomi", feature: "Billy", us: n(), them: y("Betalte pakker") },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Kunder", feature: "SMS-beskeder til kunder", us: y(), them: y("0,35 kr. pr. segment") },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Kunder", feature: "Brancher", us: y("Over 50"), them: p("Vinduespudsning") },
      { group: "Opstart", feature: "Månedspris fra", us: p("Se priser"), them: p("0 kr. (10 kunder) / 149 / 349 / 999 kr.") },
      { group: "Opstart", feature: "Ekstra bruger", us: p("Se priser"), them: p("99 kr./md. på største pakke") },
      { group: "Opstart", feature: "Flytning af data", us: y("Kundeservice gør det gratis"), them: p("Hjælp og CSV-import på betalte pakker") },
    ],
    faq: [
      { q: "Kan I flytte mine kunder fra Rutemanager?", a: "Ja. Eksportér dine kunder, og send filen til kundeservice. Vi lægger kunder, aftaler og services ind for dig gratis." },
      { q: "Skal medarbejderne have internet hele dagen?", a: "Nej. Serviceyderes medarbejder-app gemmer udførte besøg uden net og sender dem, når forbindelsen er tilbage." },
      { q: "Er Rutemanager bedre til noget?", a: "Ja. Rutemanager har en gratis pakke til helt små firmaer med op til 10 kunder og en Billy-integration." },
    ],
  },
  {
    slug: "clientflow",
    name: "Clientflow",
    tagline: "En driftsplatform til vinduespudsere og rengøringsfirmaer med AI-assistent.",
    checked: "4. november 2026",
    sources: [
      { label: "clientflow.nu/da/pricing", url: "https://clientflow.nu/da/pricing" },
      { label: "clientflow.nu", url: "https://clientflow.nu/" },
    ],
    summaryUs: [
      "Nye kunder via Serviceyderes markedsplads",
      "Fakturering til e-conomic eller Dinero med valgfrit interval",
      "Medarbejder-app med offline-tilstand og billedbevis",
      "Over 50 brancher",
    ],
    summaryThem: [
      "AI-assistent og svarforslag",
      "GPS-sporing af biler (Enterprise)",
      "Telefoni-integration (tilkøb)",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med optimering", us: y(), them: y() },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y() },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: p("Kundeportal") },
      { group: "Planlægning", feature: "Ferie og fravær", us: y("Meld ferie og syg – besøgene fordeles automatisk"), them: y("HR-modul i Enterprise") },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y(), them: y() },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: u },
      { group: "Medarbejdere", feature: "Virker uden internet", us: y("Udførte besøg sendes, når nettet er tilbage"), them: u },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: p("Arbejdstid vises i appen") },
      { group: "Medarbejdere", feature: "GPS-sporing", us: p("Telefonens position under kørsel, kun hvis medarbejderen godkender det"), them: y("Enterprise, 99 kr. pr. tracker") },
      { group: "Økonomi", feature: "Fakturering", us: y("e-conomic og Dinero"), them: y() },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Kunder", feature: "SMS-beskeder til kunder", us: y(), them: y("0,35 kr. pr. besked") },
      { group: "Kunder", feature: "Leads og tilbud", us: y("Markedsplads og leads"), them: y("Professional og op") },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Kunder", feature: "Live chat med kunder", us: y(), them: y("Samlet indbakke") },
      { group: "Kunder", feature: "Brancher", us: y("Over 50"), them: p("Vinduespudsning, rengøring og service") },
      { group: "Opstart", feature: "Månedspris fra", us: p("Se priser"), them: p("199 kr. + 99 kr. pr. bruger") },
      { group: "Opstart", feature: "Flytning af data", us: y("Kundeservice gør det gratis"), them: u },
    ],
    faq: [
      { q: "Kan I flytte mine kunder fra Clientflow?", a: "Ja. Eksportér dine kunder og aftaler, og send dem til kundeservice. Vi lægger dem ind gratis." },
      { q: "Sporer Serviceydere mine medarbejdere med GPS?", a: "Kun hvis medarbejderen selv godkender det på sin telefon. Så kan positionen ses under kørsel af ruten. Tiden registreres stadig manuelt." },
      { q: "Er Clientflow bedre til noget?", a: "Ja. Clientflow har AI-assistent, GPS-trackere i bilerne og telefoni-integration. Serviceydere bruger i stedet telefonens position, når medarbejderen godkender det." },
    ],
  },
  {
    slug: "ordrestyring",
    name: "Ordrestyring",
    tagline: "Et sags- og ordrestyringssystem til håndværkere med timer, materialer og kvalitetssikring.",
    checked: "4. november 2026",
    sources: [
      { label: "ordrestyring.dk/priser", url: "https://ordrestyring.dk/priser/" },
    ],
    summaryUs: [
      "Ingen binding og fast månedspris",
      "Ruteplanlægning til faste besøg med interval",
      "Nye kunder via Serviceyderes markedsplads",
      "Kom i gang selv på få minutter, uden opstartsmøde",
    ],
    summaryThem: [
      "Sagsstyring med materialer og kvalitetsskemaer",
      "Lønintegration (fx Dataløn, Danløn, Zenegy)",
      "Over 40 integrationer og API",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med optimering", us: y(), them: u },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y("Service og anlæg") },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: u },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y(), them: u },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: y("Fotodokumentation på ordren") },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: y("Timer på sager") },
      { group: "Medarbejdere", feature: "Kvalitetsskemaer og tjeklister", us: y("Tjeklister med målinger og kundens underskrift"), them: y() },
      { group: "Økonomi", feature: "e-conomic og Dinero", us: y(), them: y("Også Billy og Uniconta") },
      { group: "Økonomi", feature: "Materialer på fakturaen", us: y("Kommer med til e-conomic/Dinero"), them: y() },
      { group: "Økonomi", feature: "Lønsystem", us: n(), them: y() },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Opstart", feature: "Pris", us: p("Se priser"), them: p("Fra 339 kr. pr. bruger/md.") },
      { group: "Opstart", feature: "Binding", us: y("Ingen binding"), them: p("12 måneder (standardlicens)") },
      { group: "Opstart", feature: "Opstart", us: y("Kom selv i gang"), them: p("Opstartsforløb, pris oplyses ved opkald") },
      { group: "Opstart", feature: "Flytning af data", us: y("Kundeservice gør det gratis"), them: p("Varelister indlæses ved opstart") },
    ],
    faq: [
      { q: "Er Serviceydere et alternativ til Ordrestyring?", a: "Ja. Serviceydere har ruteplanlægning til faste besøg og, for håndværkere, materialer på fakturaen og kvalitetssikring med tjeklister og underskrift. Har du brug for lønintegration, passer Ordrestyring bedre." },
      { q: "Er der binding hos Serviceydere?", a: "Nej. Du betaler en fast pris pr. måned og kan stoppe, når du vil." },
      { q: "Er Ordrestyring bedre til noget?", a: "Ja. Ordrestyring har lønintegration og mange integrationer. Materialer og kvalitetssikring har Serviceydere også." },
    ],
  },
  {
    slug: "minuba",
    name: "Minuba",
    tagline: "Et ordrestyrings- og faktureringssystem til håndværks- og servicevirksomheder.",
    checked: "4. november 2026",
    sources: [
      { label: "minuba.dk/pris", url: "https://minuba.dk/pris/" },
      { label: "minuba.dk/minuba-pro", url: "https://minuba.dk/minuba-pro/" },
      { label: "minuba.dk/minuba-go", url: "https://minuba.dk/minuba-go/" },
    ],
    summaryUs: [
      "Ruteplanlægning til faste besøg med interval",
      "Online booking og nye kunder via markedsplads",
      "Medarbejder-app, der virker uden internet",
      "Fast månedspris i stedet for pris pr. brugertype",
    ],
    summaryThem: [
      "Gratis version til op til 2 brugere (GO)",
      "Materialer og aftaler med over 80 grossister (PRO)",
      "Tilbud, kvalitetssikring og rykkerstyring",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med optimering", us: y(), them: u },
      { group: "Planlægning", feature: "Kalender og planlægning", us: y(), them: y() },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y("Serviceaftaler i PRO") },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: u },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y("Android"), them: y("iOS og Android") },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: y("Dokumentation") },
      { group: "Medarbejdere", feature: "Virker uden internet", us: y("Udførte besøg sendes, når nettet er tilbage"), them: u },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: y() },
      { group: "Medarbejdere", feature: "Kvalitetssikring", us: y("Tjeklister, målinger og underskrift"), them: y("PRO") },
      { group: "Økonomi", feature: "Fakturering", us: y("Via e-conomic eller Dinero"), them: y() },
      { group: "Økonomi", feature: "Materialer og grossister", us: p("Materialeliste og prisfiler fra grossister; direkte forbindelse efter aftale"), them: y() },
      { group: "Økonomi", feature: "MobilePay", us: p("Via dit regnskabsprogram (e-conomic/Dinero)"), them: y() },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Kunder", feature: "Tilbud", us: y(), them: y() },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Opstart", feature: "Pris", us: p("Se priser"), them: p("GO gratis (2 brugere). PRO 129-289 kr. pr. bruger/md.") },
      { group: "Opstart", feature: "Flytning af data", us: y("Kundeservice gør det gratis"), them: u },
    ],
    faq: [
      { q: "Er Serviceydere et alternativ til Minuba?", a: "Ja. Serviceydere har materialer, prisfiler fra grossister og kvalitetssikring, og derudover ruteplanlægning og medarbejder-app til faste besøg." },
      { q: "Kan I flytte mine kunder fra Minuba?", a: "Ja. Eksportér dine kunder, og send dem til kundeservice. Vi lægger dem ind gratis." },
      { q: "Er Minuba bedre til noget?", a: "Ja. Minuba har en gratis version til små firmaer og faste forbindelser til over 80 grossister. Serviceydere har 14 dages gratis prøve uden kreditkort, og MobilePay via dit regnskabsprogram." },
    ],
  },
  {
    slug: "ruteklar",
    name: "RuteKlar",
    tagline: "En online platform til servicevirksomheder med ruter, kundekartotek og fakturering.",
    checked: "4. november 2026",
    sources: [{ label: "ruteklar.dk", url: "https://ruteklar.dk/" }],
    summaryUs: [
      "Nye kunder via Serviceyderes markedsplads",
      "Medarbejder-app med billedbevis og offline-tilstand",
      "Fakturering direkte til e-conomic eller Dinero",
      "Kundeservice flytter dine data gratis",
    ],
    summaryThem: [
      "Lav startpris (99 kr./md.)",
      "MobilePay-anmodning ved fakturering",
      "Bogføring som tilkøb",
    ],
    rows: [
      { group: "Planlægning", feature: "Ruteplanlægning med kort", us: y(), them: y("Træk og slip eller automatisk") },
      { group: "Planlægning", feature: "Faste aftaler med interval", us: y(), them: y("Faste ruter") },
      { group: "Planlægning", feature: "Online booking fra kunder", us: y(), them: u },
      { group: "Medarbejdere", feature: "App til medarbejdere", us: y("Egen app til Android"), them: p("Kører i browseren og kan installeres") },
      { group: "Medarbejdere", feature: "Billedbevis ved besøg", us: y(), them: u },
      { group: "Medarbejdere", feature: "Virker uden internet", us: y("Udførte besøg sendes, når nettet er tilbage"), them: u },
      { group: "Medarbejdere", feature: "Tidsregistrering", us: y("Manuel"), them: u },
      { group: "Økonomi", feature: "e-conomic og Dinero", us: y("Fakturaer sendes direkte"), them: p("Eksport med ét klik") },
      { group: "Økonomi", feature: "Egen bogføring", us: n("Bogføring sker i e-conomic eller Dinero"), them: y("Tilkøb") },
      { group: "Økonomi", feature: "MobilePay", us: p("Via dit regnskabsprogram (e-conomic/Dinero)"), them: y("Anmodning ved faktura") },
      { group: "Økonomi", feature: "Vælg fakturainterval pr. kunde", us: y(), them: u },
      { group: "Kunder", feature: "Nye kunder via markedsplads", us: y(), them: u },
      { group: "Opstart", feature: "Månedspris", us: p("Se priser"), them: p("99 kr., 199 kr. ved over 30.000 kr. faktureret måneden før") },
      { group: "Opstart", feature: "Ekstra medarbejder", us: p("Se priser"), them: p("70 kr./md.") },
      { group: "Opstart", feature: "Gratis prøve", us: y("14 dage, uden kreditkort"), them: y("30 dage") },
      { group: "Opstart", feature: "Binding", us: y("Ingen binding"), them: y("Ingen binding") },
      { group: "Opstart", feature: "Flytning af data", us: y("Kundeservice gør det gratis"), them: u },
    ],
    faq: [
      { q: "Kan I flytte mine kunder fra RuteKlar?", a: "Ja. Eksportér dine kunder og aftaler, og send dem til kundeservice. Vi lægger dem ind gratis." },
      { q: "Hvad er forskellen på fakturering?", a: "RuteKlar eksporterer til e-conomic eller Dinero. Serviceydere sender fakturaerne direkte dertil, med det interval du vælger pr. kunde." },
      { q: "Er RuteKlar bedre til noget?", a: "Ja. RuteKlar har en lav startpris og bogføring som tilkøb. MobilePay kan du også bruge med Serviceydere via e-conomic eller Dinero." },
    ],
  },
];

export const comparisonBySlug = (slug?: string) => comparisons.find((c) => c.slug === slug);
