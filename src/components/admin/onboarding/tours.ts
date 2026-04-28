import type { TourDefinition } from "./TourContext";

/**
 * Definitionerne af alle interaktive tours. Hvert step peger på et UI-element
 * via en CSS-selector — typisk `[data-tour="..."]` markører som vi har
 * placeret i de relevante komponenter.
 *
 * Tours navigerer brugeren gennem de rigtige sider — de kører IKKE i en
 * dialog. Brugeren kan se og bruge UI'et mens guiden forklarer.
 */
export const TOURS: Record<string, TourDefinition> = {
  "company-info": {
    id: "company-info",
    completesStepId: "company-info",
    steps: [
      {
        navigateTo: "/virksomhed?tab=settings",
        selector: '#settings-general',
        title: "Virksomhedsoplysninger",
        body: "Her udfylder du navn og en kort beskrivelse. Beskrivelsen vises på din offentlige side og hjælper kunderne med at vælge dig.",
        placement: "right",
      },
      {
        selector: '#settings-contact',
        title: "Kontakt og adresse",
        body: "Tilføj telefon, email og adresse. Adressen bruges til ruteplanlægning og til at vise kunder hvor du holder til.",
        placement: "right",
      },
      {
        selector: '#settings-hours',
        title: "Åbningstider",
        body: "Sæt åbningstider for hver ugedag. Det vises på din profil og styrer hvornår kunder kan booke.",
        placement: "right",
      },
    ],
  },

  "branding": {
    id: "branding",
    completesStepId: "branding",
    steps: [
      {
        navigateTo: "/virksomhed?tab=settings",
        selector: '#settings-branding',
        title: "Logo og forsidebillede",
        body: "Upload jeres logo og et flot forsidebillede. Et professionelt udtryk øger tilliden — og dermed bookinger.",
        placement: "right",
      },
    ],
  },

  "services": {
    id: "services",
    completesStepId: "services",
    steps: [
      {
        navigateTo: "/virksomhed?tab=services",
        selector: '[data-tour="services-create-button"]',
        title: "Opret din første service",
        body: "Klik her for at oprette en ny service. Du kan vælge fast pris, timepris eller en interaktiv prisberegner med m², stk eller timer.",
        placement: "bottom",
      },
      {
        selector: '[data-tour="services-list"]',
        title: "Dine services vises her",
        body: "Når du har oprettet services, kan du redigere dem her — ændre pris, beskrivelse eller deaktivere midlertidigt.",
        placement: "top",
      },
    ],
  },

  "employees": {
    id: "employees",
    completesStepId: "employees",
    steps: [
      {
        navigateTo: "/virksomhed?tab=employees",
        selector: '[data-tour="employees-create-button"]',
        title: "Inviter en medarbejder",
        body: "Klik her for at tilføje en medarbejder. De får automatisk en konto og en email med login-oplysninger til medarbejder-appen.",
        placement: "bottom",
      },
    ],
  },

  "route-planning": {
    id: "route-planning",
    completesStepId: "route-planning",
    steps: [
      {
        navigateTo: "/virksomhed/ruter",
        selector: '[data-tour="routes-calendar"]',
        title: "Ruteplanlæggeren",
        body: "Her ser du dine medarbejderes dag på tidslinjen. Træk uplanlagte opgaver fra siden ind på tidslinjen for at oprette stop.",
        placement: "auto",
      },
      {
        selector: '[data-tour="routes-unassigned"]',
        title: "Uplanlagte opgaver",
        body: "Alle nye bestillinger lander her indtil du planlægger dem. Træk dem ind på en medarbejders tidslinje.",
        placement: "right",
      },
    ],
  },

  "leads": {
    id: "leads",
    completesStepId: "leads",
    steps: [
      {
        navigateTo: "/virksomhed?tab=leads",
        selector: '[data-tour="leads-list"]',
        title: "Dine leads",
        body: "Her ser du forespørgsler fra kunder i dit område. Klik et lead for at se detaljer og sende et tilbud.",
        placement: "auto",
      },
    ],
  },

  "livechat": {
    id: "livechat",
    completesStepId: "livechat",
    steps: [
      {
        navigateTo: "/virksomhed?tab=livechat",
        selector: '[data-tour="livechat-inbox"]',
        title: "Live chat-indbakke",
        body: "Når besøgende skriver på din side, dukker beskeden op her. Hurtige svar = flere kunder.",
        placement: "auto",
      },
    ],
  },

  "billing": {
    id: "billing",
    completesStepId: "billing",
    steps: [
      {
        navigateTo: "/virksomhed?tab=settings",
        selector: '#settings-billing',
        title: "Betaling og kort",
        body: "Tilføj et betalingskort så din konto fortsætter uden afbrydelse efter prøveperioden.",
        placement: "right",
      },
    ],
  },
};