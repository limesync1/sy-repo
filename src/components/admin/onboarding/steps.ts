// Trin-definitioner til "Kom godt i gang" i virksomhedspanelet.
//
// Ét trin = én handling = ét deep link. Teksterne er bevidst korte: titlen
// maks fire ord, `short` én linje, og `body`/`tip` vises først når kortet er
// udfoldet. `requires` bruges til at gate CTA'en indtil forudsætningerne er
// på plads (samme mønster som Discord's onboarding-krav).
import {
  Tags, Calculator, UserPlus, Wrench, ShoppingCart, Route as RouteIcon,
  type LucideIcon,
} from "lucide-react";
import type { OnboardingCounts } from "@/hooks/useOnboardingSignals";

export type OnboardingStepId =
  | "categories" | "accounting" | "employees" | "services" | "order" | "route";

export type StepRequirement = {
  label: string;
  met: (c: OnboardingCounts) => boolean;
  /** Fane man skal hen for at opfylde kravet. */
  tab: string;
};

export type OnboardingStep = {
  id: OnboardingStepId;
  number: number;
  icon: LucideIcon;
  title: string;
  short: string;
  body: string;
  tip?: string;
  /** Fane CTA'en åbner. Kan afhænge af status. */
  tab: (c: OnboardingCounts) => string;
  cta: (c: OnboardingCounts) => string;
  isDone: (c: OnboardingCounts) => boolean;
  requires?: StepRequirement[];
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "categories",
    number: 1,
    icon: Tags,
    title: "Vælg brancher",
    short: "Bestemmer hvor kunder kan finde jer.",
    body:
      "Vælg de brancher og underkategorier I tilbyder (fx Rengøring → Privatrengøring). Det styrer jeres placering i søgningen og hvilke felter der vises på services.",
    tip: "Uden brancher kan kunder ikke finde jer — og service-skabelonerne er tomme.",
    tab: () => "settings",
    cta: (c) => (c.categoriesCount > 0 ? "Rediger" : "Vælg brancher"),
    isDone: (c) => c.categoriesCount > 0,
  },
  {
    id: "accounting",
    number: 2,
    icon: Calculator,
    title: "Forbind regnskab",
    short: "Fakturaer oprettes automatisk når en aftale afsluttes.",
    body:
      "Slå regnskab til under Indstillinger → Ekstra funktioner, og forbind e-conomic, Billy, Dinero eller Zenegy. Så bogføres bestillinger automatisk.",
    tip: "Sæt regnskab op før første rute køres — ellers skal de første bestillinger bogføres manuelt.",
    tab: (c) => (c.accountingFeatureEnabled ? "accounting" : "settings"),
    cta: (c) =>
      c.accountingActive ? "Se status" : c.accountingFeatureEnabled ? "Forbind" : "Aktivér",
    isDone: (c) => !c.accountingFeatureEnabled || c.accountingActive,
  },
  {
    id: "employees",
    number: 3,
    icon: UserPlus,
    title: "Opret medarbejdere",
    short: "Hver medarbejder får eget login til medarbejder-appen.",
    body:
      "Tilføj jeres team under Medarbejdere. De ser deres egne ruter, opgaver og kundeoplysninger i appen.",
    tip: "Er I solo? Opret jer selv — så kan I se flowet fra chaufførens side.",
    tab: () => "employees",
    cta: (c) => (c.employeesCount > 0 ? "Se team" : "Tilføj medarbejder"),
    isDone: (c) => c.employeesCount > 0,
  },
  {
    id: "services",
    number: 4,
    icon: Wrench,
    title: "Opret services",
    short: "Fast pris, timepris eller prisberegner.",
    body:
      "Opret de ydelser I sælger. Services er det kunder bestiller, og det prisen på hver aftale bygger på.",
    tip: "Start med 2-3 services I kender godt — resten kan tilføjes løbende.",
    tab: () => "services",
    cta: (c) => (c.servicesCount > 0 ? "Se services" : "Opret service"),
    isDone: (c) => c.servicesCount > 0,
    requires: [
      { label: "Mindst én branche valgt", met: (c) => c.categoriesCount > 0, tab: "settings" },
    ],
  },
  {
    id: "order",
    number: 5,
    icon: ShoppingCart,
    title: "Første bestilling",
    short: "Kunden kan oprettes direkte i bestillingen.",
    body:
      "Klik \"Opret bestilling\" under Aftaler eller Ruter. Vælg services, antal og dato — nye kunder oprettes undervejs.",
    tip: "En bestilling kan indeholde flere aftaler (fx ugentlig rengøring). Hver aftale bliver et stop på en rute.",
    tab: () => "orders",
    cta: (c) => (c.ordersCount > 0 ? "Se aftaler" : "Opret bestilling"),
    isDone: (c) => c.ordersCount > 0,
    requires: [
      { label: "Mindst én service oprettet", met: (c) => c.servicesCount > 0, tab: "services" },
    ],
  },
  {
    id: "route",
    number: 6,
    icon: RouteIcon,
    title: "Læg på en rute",
    short: "Husk at tildele hvert stop til en medarbejder.",
    body:
      "I Ruteplanlæggeren ligger nye aftaler under \"Aftaler uden rute\". Træk dem på en dato eller opret en ny rute.",
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

export const getStep = (id: OnboardingStepId) =>
  ONBOARDING_STEPS.find((s) => s.id === id)!;
