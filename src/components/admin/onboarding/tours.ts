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
        selector: '[data-tour="field-company-name"]',
        title: "Virksomhedsnavn",
        body: "Skriv jeres officielle virksomhedsnavn — det vises som overskrift på jeres side og i søgeresultater.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="field-company-description"]',
        title: "Beskrivelse",
        body: "Fortæl kort hvad I laver og hvad jeres speciale er. 2-3 sætninger er nok — kunder skimmer hurtigt.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="field-phone"]',
        title: "Telefon",
        body: "Det nummer kunderne kan ringe til. Vises på jeres profil og i bekræftelsesmails.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="field-email"]',
        title: "Email",
        body: "Den email I bruger til at modtage henvendelser. Bookings-notifikationer sendes hertil.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="field-address"]',
        title: "Adresse",
        body: "Adressen bruges til ruteplanlægning og til at vise hvor I holder til. Brug forretningsadressen — ikke privat.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="field-zip"]',
        title: "Postnummer",
        body: "Skriv postnummeret — byen udfyldes automatisk.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="hours-presets"]',
        title: "Hurtige presets til åbningstider",
        body: "Klik en preset for at sætte typiske åbningstider med ét klik — fx 'Hverdage 08–16'. Du kan altid finjustere bagefter.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="hours-day-row"]',
        title: "Justér en enkelt dag",
        body: "Slå dagen til/fra med kontakten, og vælg fra-/til-tid. Brug 'Anvend på alle' for at kopiere tiderne til de andre åbne dage.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
    ],
  },

  "branding": {
    id: "branding",
    completesStepId: "branding",
    steps: [
      {
        navigateTo: "/virksomhed?tab=settings",
        selector: '[data-tour="field-logo"]',
        title: "Logo",
        body: "Klik for at uploade jeres logo. Brug en kvadratisk fil (fx 512×512) på en transparent eller hvid baggrund.",
        placement: "auto",
        interactive: true,
        skippable: true,
      },
      {
        selector: '[data-tour="field-cover"]',
        title: "Coverbillede",
        body: "Et bredt 16:9-billede der vises som banner øverst på jeres side. Et godt billede gør stor forskel.",
        placement: "auto",
        interactive: true,
        skippable: true,
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

};