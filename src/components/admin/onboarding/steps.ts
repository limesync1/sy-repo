// Trin-definitioner til "Kom godt i gang" i virksomhedspanelet.
//
// Ét trin = én handling = ét deep link. Teksterne er bevidst korte: titlen
// maks fire ord, `short` én linje, og `body`/`tip` vises først når kortet er
// udfoldet. `requires` gater CTA'en indtil forudsætningerne er på plads
// (samme mønster som Discord's onboarding-krav).
//
// Trinene er delt i to spor — som Discords "New Member To Do's" viser vi
// aldrig mere end en håndfuld obligatoriske opgaver ad gangen. Resten ligger
// i "næste niveau" og tæller ikke med i fremgangen.
import {
  Tags, Calculator, UserPlus, Wrench, ShoppingCart, Route as RouteIcon,
  type LucideIcon,
} from "lucide-react";
import type { OnboardingCounts } from "@/hooks/useOnboardingSignals";

export type OnboardingStepId =
  | "categories" | "accounting" | "employees" | "services" | "order" | "route";

/** Hvad virksomheden primært vil bruge platformen til. Styrer hvilke trin der vises. */
export type OnboardingFocus = "routes" | "jobs" | "both";

export const FOCUS_OPTIONS: { value: OnboardingFocus; title: string; body: string }[] = [
  { value: "routes", title: "Faste aftaler og ruter", body: "Tilbagevendende besøg som planlægges på ruter." },
  { value: "jobs", title: "Enkeltopgaver og tilbud", body: "Opgaver ad gangen — uden fast ruteplan." },
  { value: "both", title: "Begge dele", body: "Både faste aftaler og løse opgaver." },
];

export type StepRequirement = {
  label: string;
  met: (c: OnboardingCounts) => boolean;
  /** Fane man skal hen for at opfylde kravet. */
  tab: string;
};

export type OnboardingStep = {
  id: OnboardingStepId;
  icon: LucideIcon;
  title: string;
  short: string;
  body: string;
  tip?: string;
  /** Fane CTA'en åbner. Kan afhænge af status. */
  tab: (c: OnboardingCounts) => string;
  /** Valgfri deep-link-handling der åbner den rigtige dialog med det samme. */
  action?: (c: OnboardingCounts) => string | null;
  cta: (c: OnboardingCounts) => string;
  isDone: (c: OnboardingCounts) => boolean;
  requires?: StepRequirement[];
  /** Skjul trinet for virksomheder hvis fokus ikke passer. */
  appliesTo?: (focus: OnboardingFocus) => boolean;
};

/** Obligatoriske trin — tælleren og badgen bygger på disse. */
export const CORE_STEPS: OnboardingStep[] = [
  {
    id: "categories",
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
    id: "services",
    icon: Wrench,
    title: "Opret services",
    short: "Fast pris, timepris eller prisberegner.",
    body:
      "Opret de ydelser I sælger. Services er det kunder bestiller, og det prisen på hver aftale bygger på.",
    tip: "Start med 2-3 services I kender godt — resten kan tilføjes løbende.",
    tab: () => "services",
    action: (c) => (c.servicesCount > 0 ? null : "new"),
    cta: (c) => (c.servicesCount > 0 ? "Se services" : "Opret service"),
    isDone: (c) => c.servicesCount > 0,
    requires: [
      { label: "Mindst én branche valgt", met: (c) => c.categoriesCount > 0, tab: "settings" },
    ],
  },
  {
    id: "employees",
    icon: UserPlus,
    title: "Opret medarbejdere",
    short: "Hver medarbejder får eget login til medarbejder-appen.",
    body:
      "Tilføj jeres team under Medarbejdere. De ser deres egne ruter, opgaver og kundeoplysninger i appen.",
    tip: "Er I solo? Opret jer selv — så kan I se flowet fra medarbejderens side.",
    tab: () => "employees",
    action: (c) => (c.employeesCount > 0 ? null : "new"),
    cta: (c) => (c.employeesCount > 0 ? "Se team" : "Tilføj medarbejder"),
    isDone: (c) => c.employeesCount > 0,
  },
  {
    id: "order",
    icon: ShoppingCart,
    title: "Første bestilling",
    short: "Kunden kan oprettes direkte i bestillingen.",
    body:
      "Klik \"Opret bestilling\" under Aftaler eller Ruter. Vælg services, antal og dato — nye kunder oprettes undervejs.",
    tip: "En bestilling kan indeholde flere aftaler (fx ugentlig rengøring). Hver aftale bliver et stop på en rute.",
    tab: () => "orders",
    action: (c) => (c.ordersCount > 0 ? null : "new"),
    cta: (c) => (c.ordersCount > 0 ? "Se aftaler" : "Opret bestilling"),
    isDone: (c) => c.ordersCount > 0,
    requires: [
      { label: "Mindst én service oprettet", met: (c) => c.servicesCount > 0, tab: "services" },
    ],
  },
  {
    id: "route",
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
    appliesTo: (focus) => focus !== "jobs",
  },
];

/** Frivillige trin — vises foldet sammen og blokerer ikke opstarten. */
export const NEXT_LEVEL_STEPS: OnboardingStep[] = [
  {
    id: "accounting",
    icon: Calculator,
    title: "Forbind regnskab",
    short: "Fakturaer oprettes automatisk når en aftale afsluttes.",
    body:
      "Slå regnskab til under Indstillinger → Ekstra funktioner, og forbind e-conomic, Billy, Dinero eller Zenegy. Så bogføres bestillinger automatisk.",
    tip: "Kan sættes op når som helst — indtil da bogfører I selv.",
    tab: (c) => (c.accountingFeatureEnabled ? "accounting" : "settings"),
    cta: (c) =>
      c.accountingActive ? "Se status" : c.accountingFeatureEnabled ? "Forbind" : "Aktivér",
    isDone: (c) => c.accountingFeatureEnabled && c.accountingActive,
  },
];

export const ALL_STEPS = [...CORE_STEPS, ...NEXT_LEVEL_STEPS];

/** Trin der gælder for et givent fokus. */
export const coreStepsForFocus = (focus: OnboardingFocus) =>
  CORE_STEPS.filter((s) => !s.appliesTo || s.appliesTo(focus));

export const getStep = (id: OnboardingStepId) => ALL_STEPS.find((s) => s.id === id)!;
