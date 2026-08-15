import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/booking-og-tilbud",
  metaTitle: "Online booking og tilbudsstyring | Serviceydere",
  metaDescription:
    "Få online booking på din egen profilside, modtag leads fra markedspladsen og send tilbud fra samme system. Bookinger bliver til stop på ruten.",
  keywords:
    "online booking servicevirksomhed, tilbudsstyring, leads håndværker, booking system rengøring, prisberegner hjemmeside, kundeportal",
  heroEyebrow: "Booking og tilbud",
  heroTitle: "Kunden booker selv — du planlægger bare",
  heroSubtitle:
    "En profilside med priser, anmeldelser og booking, leads fra markedspladsen og tilbud der kan godkendes online. Alt lander samme sted.",
  breadcrumbLabel: "Booking og tilbud",
  answer:
    "Booking og tilbud i Serviceydere dækker hele vejen fra en interesseret kunde til en planlagt opgave. Virksomheden får en profilside med services, priser og online booking, modtager forespørgsler fra markedspladsen på serviceydere.dk, og kan sende tilbud som kunden godkender med ét klik. En godkendt booking bliver til en opgave, der kan lægges på ruten.",
  facts: [
    "Egen profilside med services, priser, billeder, åbningstider og anmeldelser.",
    "Online booking direkte fra profilsiden — også uden for åbningstid.",
    "Prisberegnere: fast pris, timepris eller beregning på m², stk. og andre enheder.",
    "Leads fra markedspladsen når en kunde beder om tilbud i dit område.",
    "Tilbud kan godkendes af kunden via link, uden login.",
    "Godkendt booking bliver til et stop, du kan planlægge.",
  ],
  sections: [
    {
      heading: "Profilsiden er dit udstillingsvindue",
      paragraphs: [
        "Profilsiden fungerer som en lille hjemmeside: hvem I er, hvilke services I tilbyder, hvad de koster, hvilke områder I dækker, og hvad tidligere kunder siger. Har virksomheden sit eget domæne, kan profilsiden ligge der i stedet.",
      ],
      list: [
        "Services med beskrivelse, varighed og prismodel.",
        "Prisberegner så kunden får et realistisk tal frem for et 'kontakt os'.",
        "Anmeldelser fra kunder med en bekræftet booking.",
        "Livechat, så tvivl kan afklares inden bestilling.",
      ],
    },
    {
      heading: "Leads fra markedspladsen",
      paragraphs: [
        <>Når en kunde beder om tilbud på <Link to="/tilbud">serviceydere.dk</Link>, matches forespørgslen med relevante virksomheder i området. Du ser opgaven, kundens beskrivelse og adresseområde og kan svare med et tilbud direkte i systemet.</>,
      ],
    },
    {
      heading: "Fra tilbud til plan",
      list: [
        "Tilbud oprettes fra dine eksisterende services, så priser er ens hver gang.",
        "Kunden godkender via et link — ingen konto, ingen printer, ingen underskrift på papir.",
        <>Godkendte opgaver kan trækkes direkte ind i <Link to="/software/ruteplanlaegger">ruteplanlæggeren</Link>.</>,
        "Faste aftaler oprettes med interval, så du kun sælger dem én gang.",
      ],
    },
    {
      heading: "Kundens side af det",
      paragraphs: [
        "Kunder kan følge deres bestillinger i en kundeportal med kommende besøg, historik og dokumenter. Det fjerner en stor del af de opkald, der bare handler om 'hvornår kommer I?'.",
      ],
    },
  ],
  faq: [
    {
      q: "Får jeg kunder gennem Serviceydere?",
      a: "Ja. Ud over dine egne kunder kan du modtage forespørgsler fra markedspladsen, hvor private og virksomheder søger efter udbydere i deres område. Du vælger selv, hvilke opgaver du byder på.",
    },
    {
      q: "Kan kunden booke uden at ringe?",
      a: "Ja. Profilsiden har online booking, hvor kunden vælger service og tidspunkt. Bookingen lander i virksomhedspanelet og kan planlægges ind på en rute.",
    },
    {
      q: "Kan jeg vise priser uden at binde mig?",
      a: "Ja. Du kan vise fast pris, timepris eller en prisberegner der regner ud fra fx antal kvadratmeter. Beregningen er et estimat, og du bekræfter den endelige pris i tilbuddet.",
    },
    {
      q: "Kan jeg bruge min egen hjemmeside i stedet?",
      a: "Profilsiden kan ligge på virksomhedens eget domæne, så kunder oplever den som jeres egen side, mens booking og priser stadig styres fra systemet.",
    },
    {
      q: "Hvad sker der, når kunden godkender et tilbud?",
      a: "Opgaven bliver oprettet i systemet med kunde, service og pris, og den kan planlægges på en medarbejders rute. Er det en fast aftale, fremskrives kommende besøg automatisk.",
    },
  ],
});
export default Page;
