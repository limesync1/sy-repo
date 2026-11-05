// Trin-definitioner til "Kom godt i gang" i virksomhedspanelet.
//
// Der findes to spor: fuldt system (drift: services → team → kunder →
// bestilling → rute) og kun profil (synlighed: brancher → profil → services →
// billeder/anmeldelser → offentlig profil). Planen afgør sporet via
// business-capabilities, så guiden altid matcher det virksomheden kan.
// Ét trin = én handling = ét deep link. `requires` gater CTA'en, så man aldrig
// sendes videre før forudsætningerne er på plads.
import {
  Tags, Calculator, UserPlus, Wrench, ShoppingCart, Route as RouteIcon, Building2, Users,
  Bell, Smartphone, MapPin, Image as ImageIcon, Globe, MessageSquare, Rocket,
  type LucideIcon,
} from "lucide-react";
import type { OnboardingCounts } from "@/hooks/useOnboardingSignals";
import type { PlanKind } from "@/lib/business-capabilities";

export type OnboardingStepId =
  | "categories" | "profile" | "services" | "employees" | "customers" | "order" | "route"
  | "notifications" | "accounting" | "employee_app"
  | "area" | "gallery" | "public_profile" | "inquiries" | "upgrade";

export type StepRequirement = {
  label: string;
  met: (c: OnboardingCounts) => boolean;
  tab: string;
};

export type OnboardingStep = {
  id: OnboardingStepId;
  icon: LucideIcon;
  title: string;
  short: string;
  body: string;
  tip?: string;
  tab: (c: OnboardingCounts) => string;
  action?: (c: OnboardingCounts) => string | null;
  /** Åbner virksomhedens offentlige profil i stedet for en fane. */
  opensPublicProfile?: boolean;
  cta: (c: OnboardingCounts) => string;
  isDone: (c: OnboardingCounts) => boolean;
  requires?: StepRequirement[];
};

const hasProfile = (c: OnboardingCounts) => c.hasLogo && c.hasAddress;

const categoriesStep = (title: string, body: string): OnboardingStep => ({
  id: "categories",
  icon: Tags,
  title,
  short: "Bestemmer hvor kunder kan finde jer.",
  body,
  tip: "Uden brancher kan kunder ikke finde jer — og service-skabelonerne er tomme.",
  tab: () => "settings",
  cta: (c) => (c.categoriesCount > 0 ? "Rediger" : "Vælg brancher"),
  isDone: (c) => c.categoriesCount > 0,
});

const servicesStep = (body: string): OnboardingStep => ({
  id: "services",
  icon: Wrench,
  title: "Opret services",
  short: "Fast pris, timepris eller prisberegner.",
  body,
  tip: "Priser indtastes uden moms. Start med 2-3 services I kender godt.",
  tab: () => "services",
  action: (c) => (c.servicesCount > 0 ? null : "new"),
  cta: (c) => (c.servicesCount > 0 ? "Se services" : "Opret service"),
  isDone: (c) => c.servicesCount > 0,
  requires: [{ label: "Mindst én branche valgt", met: (c) => c.categoriesCount > 0, tab: "settings" }],
});

/* ───────────── Fuldt system ───────────── */

export const FULL_CORE_STEPS: OnboardingStep[] = [
  categoriesStep(
    "Vælg brancher",
    "Vælg de brancher og underkategorier I tilbyder (fx Rengøring → Privatrengøring). Det styrer jeres placering i søgningen og hvilke felter der vises på services.",
  ),
  {
    id: "profile",
    icon: Building2,
    title: "Firma og logo",
    short: "Adressen er startpunkt for jeres ruter.",
    body: "Udfyld firmanavn, adresse, telefon og logo under Indstillinger → Min virksomhed. Adressen bruges som start og slut på ruterne, og logoet vises i kundebeskeder.",
    tip: "Brug den adresse, I kører ud fra hver morgen.",
    tab: () => "settings",
    cta: (c) => (hasProfile(c) ? "Rediger" : "Udfyld oplysninger"),
    isDone: hasProfile,
  },
  servicesStep("Opret de ydelser I sælger. Services er det kunder bestiller, og det prisen på hver aftale bygger på."),
  {
    id: "employees",
    icon: UserPlus,
    title: "Opret medarbejdere",
    short: "Hver medarbejder får eget login.",
    body: "Tilføj jeres team under Medarbejdere. De ser deres egne ruter, aftaler og kundeoplysninger i medarbejder-appen.",
    tip: "Arbejder du alene? Opret dig selv — så kan du køre ruterne fra telefonen.",
    tab: () => "employees",
    action: (c) => (c.employeesCount > 0 ? null : "new"),
    cta: (c) => (c.employeesCount > 0 ? "Se team" : "Tilføj medarbejder"),
    isDone: (c) => c.employeesCount > 0,
  },
  {
    id: "customers",
    icon: Users,
    title: "Tilføj kunder",
    short: "Opret selv, eller få data flyttet gratis.",
    body: "Opret jeres kunder under Kunder. Kommer I fra et andet rutesystem, flytter vi jeres kunder og aftaler gratis — skriv til os.",
    tip: "Kunder kan også oprettes direkte, når du laver en bestilling.",
    tab: () => "customers",
    action: (c) => (c.customersCount > 0 ? null : "new"),
    cta: (c) => (c.customersCount > 0 ? "Se kunder" : "Opret kunde"),
    isDone: (c) => c.customersCount > 0 || c.ordersCount > 0,
  },
  {
    id: "order",
    icon: ShoppingCart,
    title: "Første bestilling",
    short: "Service, dato og eventuel gentagelse.",
    body: "Klik \"Opret bestilling\" under Aftaler. Vælg kunde, services, antal, dato og om aftalen skal gentages. Prisen beregnes automatisk.",
    tip: "En fast aftale (fx hver 4. uge) får automatisk sin næste dato, når besøget er udført.",
    tab: () => "orders",
    action: (c) => (c.ordersCount > 0 ? null : "new"),
    cta: (c) => (c.ordersCount > 0 ? "Se aftaler" : "Opret bestilling"),
    isDone: (c) => c.ordersCount > 0,
    requires: [{ label: "Mindst én service oprettet", met: (c) => c.servicesCount > 0, tab: "services" }],
  },
  {
    id: "route",
    icon: RouteIcon,
    title: "Læg på en rute",
    short: "Husk at tildele en medarbejder.",
    body: "I Ruteplanlæggeren ligger nye aftaler under \"Aftaler uden rute\". Træk dem på en dato, opret en rute og tildel en medarbejder.",
    tip: "Uden tildeling ser medarbejderen ikke ruten i sin app.",
    tab: () => "routes",
    cta: () => "Åbn ruteplanlægger",
    isDone: (c) => c.routesCount > 0,
    requires: [
      { label: "Mindst én medarbejder", met: (c) => c.employeesCount > 0, tab: "employees" },
      { label: "Mindst én bestilling", met: (c) => c.ordersCount > 0, tab: "orders" },
    ],
  },
];

export const FULL_NEXT_STEPS: OnboardingStep[] = [
  {
    id: "notifications",
    icon: Bell,
    title: "Kundebeskeder",
    short: "Automatiske påmindelser på mail og SMS.",
    body: "Slå påmindelser til under Indstillinger → Beskeder til kunder. Kunden får datoen for besøget, og du kan sende fra jeres egen mailkonto.",
    tab: () => "settings",
    cta: (c) => (c.notificationsEnabled ? "Rediger" : "Slå til"),
    isDone: (c) => c.notificationsEnabled,
  },
  {
    id: "accounting",
    icon: Calculator,
    title: "Forbind regnskab",
    short: "Fakturalinjer klar, når et besøg er udført.",
    body: "Slå regnskab til under Indstillinger → Pris og betaling, og forbind Billy, Dinero eller e-conomic. Vælg fakturainterval pr. kunde.",
    tip: "Kan sættes op når som helst — indtil da fakturerer I selv.",
    tab: (c) => (c.accountingFeatureEnabled ? "accounting" : "settings"),
    cta: (c) => (c.accountingActive ? "Se status" : c.accountingFeatureEnabled ? "Forbind" : "Aktivér"),
    isDone: (c) => c.accountingFeatureEnabled && c.accountingActive,
  },
  {
    id: "employee_app",
    icon: Smartphone,
    title: "Prøv medarbejder-appen",
    short: "Kør en rute fra telefonen.",
    body: "Log ind som medarbejder på telefonen, start dagen og markér et stop som udført. Så ser du præcis det, dit team ser.",
    tab: () => "employees",
    cta: () => "Se medarbejdere",
    isDone: () => false,
    requires: [{ label: "Mindst én rute", met: (c) => c.routesCount > 0, tab: "routes" }],
  },
];

/* ───────────── Kun profil ───────────── */

export const LISTING_CORE_STEPS: OnboardingStep[] = [
  { ...categoriesStep(
    "Brancher og område",
    "Vælg brancher, underkategorier og den by, I arbejder fra. Det afgør hvilke søgninger og forespørgsler I vises i.",
  ), icon: MapPin },
  {
    id: "profile",
    icon: Building2,
    title: "Profil og logo",
    short: "Beskrivelse, logo og kontakt.",
    body: "Skriv en kort beskrivelse af jeres firma, upload logo og udfyld adresse og telefon under Indstillinger → Min virksomhed.",
    tip: "Skriv som til en kunde: hvad I laver, hvor, og hvorfor man skal vælge jer.",
    tab: () => "settings",
    cta: (c) => (hasProfile(c) && c.hasDescription ? "Rediger" : "Udfyld profil"),
    isDone: (c) => hasProfile(c) && c.hasDescription,
  },
  servicesStep("Opret de ydelser I tilbyder med pris. De vises på jeres offentlige profil, så kunder kan se hvad I laver."),
  {
    id: "gallery",
    icon: ImageIcon,
    title: "Billeder og anmeldelser",
    short: "Tillid sælger.",
    body: "Tilføj et forsidebillede af jeres arbejde under Indstillinger, og bed tilfredse kunder om en anmeldelse via linket under Anmeldelser.",
    tip: "Tre anmeldelser gør en stor forskel for hvem kunderne vælger.",
    tab: (c) => (c.hasCoverImage ? "reviews" : "settings"),
    cta: (c) => (c.hasCoverImage ? "Se anmeldelser" : "Tilføj billede"),
    isDone: (c) => c.hasCoverImage || c.reviewsCount > 0,
  },
  {
    id: "public_profile",
    icon: Globe,
    title: "Se din profil",
    short: "Sådan ser kunderne jer.",
    body: "Åbn jeres offentlige profil, tjek at alt ser rigtigt ud, og del linket på Facebook, i mails og på visitkort.",
    tab: () => "settings",
    opensPublicProfile: true,
    cta: () => "Åbn profil",
    isDone: () => false,
    requires: [{ label: "Mindst én service oprettet", met: (c) => c.servicesCount > 0, tab: "services" }],
  },
];

export const LISTING_NEXT_STEPS: OnboardingStep[] = [
  {
    id: "inquiries",
    icon: MessageSquare,
    title: "Svar på forespørgsler",
    short: "Hurtige svar vinder opgaven.",
    body: "Nye forespørgsler fra kunder lander under Forespørgsler og på mail. Svar hurtigt — de fleste kunder vælger den første, der svarer.",
    tab: () => "leads",
    cta: () => "Se forespørgsler",
    isDone: (c) => c.inquiriesCount > 0,
  },
  {
    id: "upgrade",
    icon: Rocket,
    title: "Prøv det fulde system",
    short: "30 dage gratis med ruter og aftaler.",
    body: "Vil I også styre aftaler, ruter, medarbejdere og fakturering, kan I prøve det fulde system gratis i 30 dage under Indstillinger → Pris og betaling.",
    tab: () => "settings",
    cta: () => "Se muligheder",
    isDone: () => false,
  },
];

export const stepsForPlan = (plan: PlanKind) =>
  plan === "listing"
    ? { core: LISTING_CORE_STEPS, next: LISTING_NEXT_STEPS }
    : { core: FULL_CORE_STEPS, next: FULL_NEXT_STEPS };

/** Video-id for introvideoen øverst i hvert spor. */
export const introVideoId = (plan: PlanKind) => (plan === "listing" ? "intro_listing" : "intro_full");

/** Bagudkompatible navne. */
export const CORE_STEPS = FULL_CORE_STEPS;
export const NEXT_LEVEL_STEPS = FULL_NEXT_STEPS;

export const ALL_STEPS = [...FULL_CORE_STEPS, ...FULL_NEXT_STEPS, ...LISTING_CORE_STEPS, ...LISTING_NEXT_STEPS];

export const getStep = (id: OnboardingStepId) => ALL_STEPS.find((s) => s.id === id)!;
