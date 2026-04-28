import {
  Building2, Image as ImageIcon, Wrench, Users, Route as RouteIcon,
  MessageCircle, Sparkles, CreditCard, Settings as SettingsIcon, type LucideIcon,
} from "lucide-react";

/**
 * Et onboarding-trin. `enabled(business, plan)` afgør om trinnet vises overhovedet
 * — fx skjules ruteplanlægger-trinnet hvis virksomheden ikke har den feature aktiv.
 * `isDone(ctx)` afgør om trinnet bliver markeret som færdigt automatisk når brugeren
 * har lavet det relevante (fx oprettet sin første service).
 */
export type StepCtx = {
  business: any;
  plan: any;
  servicesCount: number;
  employeesCount: number;
  routesCount: number;
};

export type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Knaptekst der fører brugeren ind i den rigtige fane. */
  cta: string;
  /** Sti relativt til /virksomhed (uden ?tab=) — eller fuld sti med "/virksomhed/...". */
  href: string;
  /** Bestemmer om dette trin overhovedet er relevant for denne virksomhed. */
  enabled: (ctx: StepCtx) => boolean;
  /** Bestemmer om trinnet allerede er gennemført uden at brugeren behøver klikke "færdig". */
  isDone: (ctx: StepCtx) => boolean;
  /** Skønnet tid (kun til visning). */
  estMinutes: number;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "company-info",
    title: "Udfyld virksomhedsoplysninger",
    description: "Adresse, telefon, beskrivelse og åbningstider — så kunderne ved hvem du er.",
    icon: Building2,
    cta: "Åbn indstillinger",
    href: "/virksomhed?tab=settings",
    enabled: () => true,
    isDone: ({ business }) =>
      !!business?.description && !!business?.phone && !!business?.address,
    estMinutes: 3,
  },
  {
    id: "branding",
    title: "Tilføj logo og forsidebillede",
    description: "Et professionelt udtryk gør det nemmere at vinde kundernes tillid.",
    icon: ImageIcon,
    cta: "Tilføj billeder",
    href: "/virksomhed?tab=settings",
    enabled: () => true,
    isDone: ({ business }) => !!business?.logo_url,
    estMinutes: 2,
  },
  {
    id: "services",
    title: "Opret dine første services",
    description: "Tilføj de ydelser du tilbyder med priser eller prisberegnere.",
    icon: Wrench,
    cta: "Opret service",
    href: "/virksomhed?tab=services",
    enabled: () => true,
    isDone: ({ servicesCount }) => servicesCount > 0,
    estMinutes: 5,
  },
  {
    id: "employees",
    title: "Inviter dine medarbejdere",
    description: "Giv dit team adgang til medarbejder-appen og se hvem der laver hvad.",
    icon: Users,
    cta: "Tilføj medarbejder",
    href: "/virksomhed?tab=employees",
    enabled: ({ business }) => !!(business?.settings as any)?.route_planning_enabled,
    isDone: ({ employeesCount }) => employeesCount > 0,
    estMinutes: 3,
  },
  {
    id: "route-planning",
    title: "Lav din første rute",
    description: "Planlæg dagen, tildel stop til medarbejdere og se det hele på kortet.",
    icon: RouteIcon,
    cta: "Åbn ruteplanlægger",
    href: "/virksomhed/ruter",
    enabled: ({ business }) => !!(business?.settings as any)?.route_planning_enabled,
    isDone: ({ routesCount }) => routesCount > 0,
    estMinutes: 4,
  },
  {
    id: "leads",
    title: "Aktivér leads fra Serviceydere",
    description: "Modtag forespørgsler fra kunder i dit område direkte i panelet.",
    icon: Sparkles,
    cta: "Se leads",
    href: "/virksomhed?tab=leads",
    enabled: ({ business }) => !!(business?.settings as any)?.leads_enabled,
    isDone: () => false, // Leads er en passiv feature — bruger markerer selv færdig
    estMinutes: 2,
  },
  {
    id: "livechat",
    title: "Sæt live chat op",
    description: "Svar dine besøgende direkte på din side — øg konvertering markant.",
    icon: MessageCircle,
    cta: "Åbn live chat",
    href: "/virksomhed?tab=livechat",
    enabled: ({ business }) => !!(business?.settings as any)?.livechat_enabled,
    isDone: () => false,
    estMinutes: 2,
  },
];

export const visibleSteps = (ctx: StepCtx) =>
  ONBOARDING_STEPS.filter((s) => s.enabled(ctx));