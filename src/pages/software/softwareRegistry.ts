/**
 * Én sandhed for det offentlige produktunivers (/software/*). Bruges af
 * sitemap-generatoren, intern linkning og "relateret"-sektionen på hver
 * produktside, så nye sider automatisk hænger sammen.
 */
export interface SoftwarePageMeta {
  href: string;
  label: string;
  blurb: string;
  priority?: string;
}

export const SOFTWARE_PAGES: SoftwarePageMeta[] = [
  {
    href: "/software",
    label: "Serviceydere software",
    blurb: "Hele systemet: ruteplanlægning, medarbejder-app, booking, fakturering og markedsplads i ét.",
    priority: "0.9",
  },
  {
    href: "/software/ruteplanlaegger",
    label: "Ruteplanlægger",
    blurb: "Planlæg dagens ruter med drag & drop, faste aftaler, kørselstid og konfliktadvarsler.",
    priority: "0.9",
  },
  {
    href: "/software/medarbejder-app",
    label: "Medarbejder-app",
    blurb: "Medarbejderne ser dagens rute, tjekker ind og ud, tilføjer noter og billeder.",
    priority: "0.8",
  },
  {
    href: "/software/booking-og-tilbud",
    label: "Booking og tilbud",
    blurb: "Online booking fra din egen profilside, leads fra markedspladsen og tilbud i ét flow.",
    priority: "0.8",
  },
  {
    href: "/software/fakturering-og-regnskab",
    label: "Fakturering og regnskab",
    blurb: "Fakturer udført arbejde og send det automatisk videre til e-conomic eller Dinero.",
    priority: "0.8",
  },
  {
    href: "/software/brancher",
    label: "Brancher",
    blurb: "Systemet er bygget til alle servicebrancher med kørsel — ikke kun én niche.",
    priority: "0.8",
  },
];

export const softwarePagesExcept = (href: string) =>
  SOFTWARE_PAGES.filter((p) => p.href !== href);
