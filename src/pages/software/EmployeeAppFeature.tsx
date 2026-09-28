import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/medarbejder-app",
  metaTitle: "Medarbejder-app til dagens rute | Serviceydere",
  metaDescription:
    "Medarbejderne ser dagens rute på telefonen, tjekker ind og ud, tilføjer noter og billeder — og planlæggeren følger med i realtid. Ingen installation.",
  keywords:
    "medarbejder app, dagens rute app, tjek ind tjek ud, timeregistrering service, mobil ruteliste, service app danmark",
  heroEyebrow: "Medarbejder-app",
  heroTitle: "Dagens rute i lommen",
  heroSubtitle:
    "Medarbejderen åbner sin egen visning, ser hvor turen går hen, tjekker ind og ud på hvert stop og noterer det, kontoret skal vide.",
  breadcrumbLabel: "Medarbejder-app",
  answer:
    "Medarbejder-appen i Serviceydere er den mobile visning, hvor hver medarbejder ser sin egen rute for dagen. Stoppene vises i rækkefølge med adresse, kunde og aftale. Medarbejderen kan registrere den faktiske tid ved hvert stop, tilføje noter og billeder, og planlæggeren ser status i realtid uden at skulle ringe rundt.",
  facts: [
    "Kører i browseren på medarbejderens egen telefon — ingen app-installation.",
    "Dagens stop i rækkefølge med adresse og aftale.",
    "Tjek ind og ud giver reelle tider frem for gæt.",
    "Noter og billeder pr. stop havner direkte på kundens sag.",
    "Navigation til næste adresse med ét tryk.",
    "Print af ruteseddel til de dage hvor telefonen ikke er nok.",
  ],
  sections: [
    {
      heading: "Hvad medarbejderen ser",
      list: [
        "En liste med dagens stop i den rækkefølge, de skal køres.",
        "Detaljer pr. stop: adresse, kontaktperson, aftalte ydelser og særlige forhold som nøgle eller alarmkode.",
        "Knap til navigation, så adressen åbnes i telefonens kortapp.",
        "Tjek ind når arbejdet starter og tjek ud når det er færdigt.",
        "Mulighed for at markere en aftale som ikke udført med en årsag.",
      ],
    },
    {
      heading: "Hvad kontoret får ud af det",
      paragraphs: [
        "Når stoppene tjekkes af, bliver planen til virkelighed. Det giver et grundlag for fakturering og dokumentation af, hvornår besøget blev udført.",
      ],
      list: [
        "Faktiske start- og sluttider pr. stop.",
        "Statistik pr. medarbejder på udført arbejde.",
        "Den faktiske tid registreres præcist i timer, minutter og sekunder.",
        <>Grundlag for <Link to="/software/fakturering-og-regnskab">fakturering</Link> uden dobbelt indtastning.</>,
      ],
    },
    {
      heading: "Kommunikation undervejs",
      paragraphs: [
        "Der er intern chat mellem kontor og medarbejder, så beskeder om en aflyst kunde eller en ekstra opgave ikke drukner i sms'er og private beskeder.",
      ],
    },
  ],
  faq: [
    {
      q: "Skal medarbejderne installere en app?",
      a: "Nej. Medarbejdervisningen åbnes i browseren på telefonen og kan lægges på hjemmeskærmen. Der er ingen app-butik og ingen opdateringer at holde styr på.",
    },
    {
      q: "Kan medarbejderne se andre end deres egne opgaver?",
      a: "Medarbejderen ser sin egen rute. Adgang til resten af systemet styres fra virksomhedspanelet.",
    },
    {
      q: "Bliver tiderne registreret automatisk?",
      a: "Tjek ind og tjek ud registrerer de faktiske tider på hvert stop. De tider bruges til opfølgning, statistik og som grundlag for fakturering.",
    },
    {
      q: "Hvad hvis medarbejderen ikke har mobildækning?",
      a: "Ruten kan printes som ruteseddel inden dagen starter, så der altid er en fysisk plan at falde tilbage på.",
    },
    {
      q: "Kan medarbejderen tage billeder på opgaven?",
      a: "Ja. Billeder og noter kan tilføjes pr. stop og bliver liggende på kundens sag som dokumentation.",
    },
  ],
});
export default Page;
