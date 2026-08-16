/**
 * Underdatabehandlere for virksomhedspanelet.
 *
 * Listen er sammenstillet ud fra de tjenester, systemet rent faktisk kalder
 * (edge functions, integrationer og udsendelse). Den vises både på
 * /underdatabehandlere og i databehandleraftalen, så virksomheden har ét
 * sted at se, hvem der kan komme i berøring med kundedata.
 *
 * Vigtigt: "Behandler personoplysninger" markerer om tjenesten kan modtage
 * oplysninger om virksomhedens egne kunder. Tjenester markeret som
 * "tilvalg" bruges kun, hvis virksomheden selv slår funktionen til.
 */
export type SubProcessor = {
  name: string;
  purpose: string;
  /** Hvilke typer oplysninger tjenesten kan modtage. */
  data: string;
  /** Hvor behandlingen foregår, så vidt vi er oplyst. */
  location: string;
  optional?: boolean;
};

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: "Vores platform- og hostingleverandør (database, login, filer og e-mailudsendelse)",
    purpose: "Drift af selve platformen: database, brugerlogin, filopbevaring, serverfunktioner og udsendelse af system-e-mails. Databasen og filerne ligger på infrastruktur i EU.",
    data: "Alle oplysninger virksomheden lægger i panelet: kunder, adresser, kontaktpersoner, aftaler, ruter, medarbejdere, beskeder og logs.",
    location: "EU",
  },
  {
    name: "Stripe",
    purpose: "Betaling af virksomhedens eget abonnement på Serviceydere.",
    data: "Virksomhedens fakturerings- og betalingsoplysninger. Kortdata indtastes direkte hos Stripe — vi opbevarer dem ikke.",
    location: "EU/USA (Stripes standardkontraktbestemmelser)",
  },
  {
    name: "Twilio",
    purpose: "Afsendelse af SMS-beskeder til kunder og medarbejdere.",
    data: "Telefonnummer og beskedens indhold.",
    location: "EU/USA (standardkontraktbestemmelser)",
    optional: true,
  },
  {
    name: "Mapbox",
    purpose: "Kort, adressesøgning og visning af ruter i ruteplanlæggeren.",
    data: "Adresser og koordinater på de stop, der vises på kortet.",
    location: "EU/USA (standardkontraktbestemmelser)",
  },
  {
    name: "OpenStreetMap / Nominatim og OSRM",
    purpose: "Opslag af adresser til koordinater og beregning af køreruter.",
    data: "Adresser og koordinater. Ingen kundenavne sendes med.",
    location: "EU",
  },
  {
    name: "Dataforsyningen (Styrelsen for Dataforsyning og Infrastruktur)",
    purpose: "Autoudfyldning af danske vejnavne, postnumre og byer.",
    data: "Den adressetekst, brugeren skriver i søgefeltet.",
    location: "Danmark",
  },
  {
    name: "cvrapi.dk",
    purpose: "Opslag af virksomhedsoplysninger ud fra CVR-nummer ved oprettelse og ved erhvervskunder.",
    data: "CVR-nummer og de offentligt tilgængelige virksomhedsdata, der returneres.",
    location: "Danmark",
  },
  {
    name: "e-conomic (Visma)",
    purpose: "Overførsel af fakturagrundlag, når virksomheden selv har tilsluttet regnskabsintegrationen.",
    data: "Kundenavn, adresse, e-mail, CVR og fakturalinjer.",
    location: "EU",
    optional: true,
  },
  {
    name: "Dinero (Visma)",
    purpose: "Overførsel af fakturagrundlag, når virksomheden selv har tilsluttet regnskabsintegrationen.",
    data: "Kundenavn, adresse, e-mail, CVR og fakturalinjer.",
    location: "EU",
    optional: true,
  },
  {
    name: "AI-tjeneste hos vores platformleverandør",
    purpose: "AI-hjælp i panelet: forslag til svar, rutenavne, servicebeskrivelser og hjælp til dataimport.",
    data: "Kun den tekst, brugeren selv sender til funktionen. Data bruges ikke til at træne modeller.",
    location: "EU/USA (standardkontraktbestemmelser)",
    optional: true,
  },
  {
    name: "Open-Meteo",
    purpose: "Vejrudsigt på ruteplanlæggerens dage.",
    data: "Koordinater for det område, ruten ligger i. Ingen kundeoplysninger.",
    location: "EU",
  },
];

/** Version bumpes når listen eller aftaleteksten ændres væsentligt. */
export const DPA_VERSION = "2026-04-27";
