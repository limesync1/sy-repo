import { defineSoftwarePage } from "./defineSoftwarePage";

const GardenSoftware = defineSoftwarePage({
  canonicalPath: "/software/haveservice",
  metaTitle: "Program til haveservice — sæsonplanlægning og ruter | Serviceydere",
  metaDescription:
    "Planlægningsprogram til haveservice og anlægsgartnere: gentagne besøg, sæsoner, ruter der tåler en aflyst dag, medarbejder-app og fakturering. Fra 289 kr./md.",
  keywords:
    "program til haveservice, software anlægsgartner, planlægning haveservice, ruteplanlægning gartner, system til havefirma",
  heroEyebrow: "Til haveservice",
  heroTitle: "Program til haveservice",
  heroSubtitle:
    "Gentagne besøg, sæsoner og vejr — planlægning der tåler en aflyst dag.",
  breadcrumbLabel: "Haveservice",
  answer:
    "Serviceydere planlægger de tilbagevendende havebesøg: græsslåning hver 14. dag, hækklipning to gange om året og enkeltstående aftaler i samme kalender. Ruterne lægges med drag & drop og optimeret rækkefølge, medarbejderne ser dagens rute på telefonen, og faktureringen bygger på det udførte arbejde. Markedspladsen giver samtidig nye kunder i jeres område.",
  facts: [
    "Gentagne besøg og sæsonaftaler i samme kalender",
    "Flyt en hel dag, når vejret aflyser den",
    "Pris pr. time, pr. m² eller fast sæsonaftale",
    "Medarbejder-app med rute, noter og billeder",
    "Nye kunder fra markedspladsen Serviceydere.dk",
    "Fra 289 kr./md. med ruteplanlægning inkluderet — 14 dages gratis prøve uden betalingskort",
  ],
  sections: [
    {
      heading: "Haveservice er sæson, og sæson er planlægning",
      paragraphs: [
        "Arbejdsmængden i en haveservice svinger voldsomt hen over året, og en aflyst regnvejrsdag skal kunne flyttes uden at vælte resten af ugen. Det er ikke et administrationsproblem — det er et planlægningsproblem, og det er der, et regneark holder op med at hjælpe.",
        "Systemet fremskriver de faste besøg selv, så du ikke opretter den samme græsslåning tyve gange. Skal en dag rykkes, trækker du den, og konsekvensen for rækkefølge, afstand, stopkapacitet og bemanding vises med det samme.",
      ],
    },
    {
      heading: "Det bruges mest i haveservice",
      list: [
        "Intervaller pr. kunde — ugentligt i vækstsæsonen, sjældnere om vinteren.",
        "Sæsonaftaler som hækklipning, opstart og vinterklargøring lagt ind i forvejen.",
        "Snerydning og akutte aftaler oveni de faste ruter.",
        "Billeder fra aftalen, så kunden kan se resultatet uden et ekstra besøg.",
        "Fakturering pr. besøg eller som fast sæsonaftale.",
      ],
    },
    {
      heading: "Hvorfor et bredt system frem for et gartnerprogram",
      paragraphs: [
        "Mange havefirmaer laver også snerydning, algebehandling, fliserens eller lidt anlæg. Et program bygget til én ydelse tvinger jer til at holde resten uden for systemet. Serviceydere er brancheuafhængigt, så en ny ydelse bare er en ny service med sin egen prisenhed.",
      ],
      list: [
        <>Se de andre brancher: <a href="/software/brancher">hvilke brancher systemet dækker</a>.</>,
      ],
    },
  ],
  faq: [
    { q: "Kan systemet håndtere sæsoner?", a: "Ja. Aftaler kan have forskellige intervaller hen over året, og sæsonaftaler kan lægges ind i forvejen, så de dukker op på den rigtige dato." },
    { q: "Hvad sker der, når en dag aflyses på grund af vejr?", a: "Du kan flytte hele dagen eller enkelte stop til en ny dato. Systemet advarer, hvis den nye dag bliver for lang eller kolliderer med noget andet." },
    { q: "Kan vi tage billeder af det udførte arbejde?", a: "Ja. Medarbejderen kan tilføje noter og billeder til aftalen fra telefonen." },
    { q: "Hvad koster det for tre gartnere?", a: "289 kr./md. i basis plus 59 kr./md. pr. login — 466 kr./md. ekskl. moms for tre medarbejdere." },
    { q: "Kan vi også lave snerydning i systemet?", a: "Ja. Snerydning og andre akutte aftaler kan lægges ind sammen med de faste besøg." },
  ],
  cta: {
    heading: "Læg en sæson ind og se om planen holder",
    body: "Opret jeres faste kunder med deres intervaller, og planlæg et par uger frem. Så kan I se, hvor meget kørsel der ligger gemt i rækkefølgen.",
  },
});
export default GardenSoftware;