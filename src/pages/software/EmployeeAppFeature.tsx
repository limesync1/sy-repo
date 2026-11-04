import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/medarbejder-app",
  metaTitle: "Medarbejder-app til dagens rute | Serviceydere",
  metaDescription:
    "Dagens ruter, manuel tidsregistrering og frivillige før/efter-billeder i én medarbejder-app. Hent Android-appen eller tilføj på iPhone. Prøv gratis i 30 dage.",
  keywords:
    "medarbejder app, dagens rute app, tjek ind tjek ud, timeregistrering service, mobil ruteliste, service app danmark",
  heroEyebrow: "Medarbejder-app",
  heroTitle: "Dagens rute i lommen",
  heroSubtitle:
    "Medarbejderen ser dagens rute, registrerer arbejdstid og markerer besøg som udført. Noter og frivillige før/efter-billeder følger aftalen.",
  breadcrumbLabel: "Medarbejder-app",
  answer:
    "Medarbejder-appen i Serviceydere er den mobile visning, hvor hver medarbejder ser sin egen rute for dagen. Stoppene vises i rækkefølge med adresse, kunde og aftale. Medarbejderen kan registrere den faktiske tid ved hvert stop, tilføje noter og billeder, og planlæggeren ser status i realtid uden at skulle ringe rundt.",
  facts: [
    "Brug browseren, hent Android-appen eller tilføj til hjemmeskærmen på iPhone.",
    "Dagens stop i rækkefølge med adresse og aftale.",
    "Manuel tidsregistrering af den faktiske arbejdstid.",
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
        "Start og stop tidsregistreringen manuelt, og markér besøget som udført.",
        "Tag frivillige før- og efter-billeder direkte fra kamera-knappen.",
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
      a: "Det er valgfrit. Android-brugere kan hente en APK fra Min dag og installere appen. På iPhone åbnes siden i Safari og tilføjes til hjemmeskærmen. Medarbejdervisningen kan også bruges direkte i browseren.",
    },
    {
      q: "Kan medarbejderne se andre end deres egne opgaver?",
      a: "Medarbejderen ser sin egen rute. Adgang til resten af systemet styres fra virksomhedspanelet.",
    },
    {
      q: "Bliver tiderne registreret automatisk?",
      a: "Nej. Medarbejderen starter og stopper tidsregistreringen manuelt. Den registrerede arbejdstid bruges til opfølgning og statistik.",
    },
    {
      q: "Hvad hvis medarbejderen ikke har mobildækning?",
      a: "En allerede indlæst rute kan vises fra den gemte kopi. Markeringer af udførte stop gemmes lokalt og sendes, når forbindelsen kommer tilbage. Billedupload kræver forbindelse. Ruten kan også printes inden dagen starter.",
    },
    {
      q: "Kan medarbejderen tage billeder på opgaven?",
      a: "Ja. Kamera-knappen giver mulighed for frivillige før- og efter-billeder pr. besøg. Virksomheden kan se dokumentationen på aftalen, grupperet efter kørsel.",
    },
  ],
});
export default Page;
