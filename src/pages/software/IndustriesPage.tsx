import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/brancher",
  metaTitle: "Brancher: hvem kan bruge Serviceydere? | Serviceydere",
  metaDescription:
    "Serviceydere er bygget til alle servicebrancher med kørsel — rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyr, autoservice og flere.",
  keywords:
    "system til rengøringsfirma, system til vinduespudser, software til haveservice, ordrestyring håndværker, system til flyttefirma, skadedyrsbekæmpelse software",
  heroEyebrow: "Brancher",
  heroTitle: "Bygget til alle servicebrancher med kørsel",
  heroSubtitle:
    "Vinduespudsning er kun én af dem. Kategorier, services, prisenheder og intervaller defineres af virksomheden — derfor passer systemet til meget forskellige fag.",
  breadcrumbLabel: "Brancher",
  answer:
    "Serviceydere er ikke bygget til én branche. Systemet passer til enhver virksomhed, hvor medarbejdere kører ud til kunder og udfører opgaver — enten som engangsopgaver eller som faste, tilbagevendende aftaler. Fordi services, prisenheder (timer, m², stk.) og intervaller defineres af virksomheden selv, bruger både et rengøringsfirma med 200 ugentlige besøg og en tømrer med projektopgaver den samme planlægning.",
  facts: [
    "Kategorier og underkategorier vælges frit — en virksomhed kan dække flere.",
    "Prisenheder: timepris, fast pris eller beregning på m², stk. og egne enheder.",
    "Faste aftaler og engangsopgaver i samme kalender.",
    "Flere hold på vejen samtidig med hver deres rute.",
    "Samme system uanset om I er 1 eller 40 medarbejdere.",
  ],
  sections: [
    {
      heading: "Brancher systemet dækker",
      list: [
        <><strong>Rengøring</strong> — privat- og erhvervsrengøring med faste ugentlige eller 14-dages besøg. Ruteplanlægning og gentagne aftaler er kernen. <Link to="/priser/rengoering">Prisguide til rengøring</Link>.</>,
        <><strong>Vinduespudsning</strong> — mange korte stop tæt på hinanden, hvor rækkefølgen afgør, om dagen hænger sammen. Ruteoptimering betyder mest her.</>,
        <><strong>Haveservice og anlægsgartneri</strong> — sæsonbetonet arbejde med hækklipning og græsslåning i faste intervaller, der skal kunne pauses om vinteren. <Link to="/priser/haveservice">Prisguide til haveservice</Link>.</>,
        <><strong>Håndværkere</strong> — tømrer, murer, maler, VVS og elektriker med længere opgaver, tilbud og opfølgning. <Link to="/priser/haandvaerker">Prisguide til håndværker</Link>.</>,
        <><strong>Flyttefirmaer</strong> — bemandingstunge enkeltdage hvor flere medarbejdere skal på samme opgave. <Link to="/priser/flyttehjaelp">Prisguide til flyttehjælp</Link>.</>,
        <><strong>Skadedyrsbekæmpelse</strong> — besøg med opfølgning i faste intervaller og dokumentation pr. besøg. <Link to="/priser/skadedyr">Prisguide til skadedyr</Link>.</>,
        <><strong>Algebehandling, facade- og tagrens</strong> — sæsonarbejde med geografisk klyngeplanlægning. <Link to="/priser/algebehandling">Prisguide til algebehandling</Link>.</>,
        <><strong>Skorstensfejning og service på installationer</strong> — lovpligtige eller anbefalede intervaller pr. adresse. <Link to="/priser/skorstensfejer">Prisguide til skorstensfejer</Link>.</>,
        <><strong>Autoservice og mobile værksteder</strong> — opgaver hos kunden med kørsel imellem.</>,
        <><strong>Sikkerhed, alarm og låse</strong> — servicebesøg og udkald. <Link to="/priser/sikkerhed">Prisguide til sikkerhed</Link>.</>,
      ],
    },
    {
      heading: "Hvorfor brancheuafhængighed betyder noget",
      paragraphs: [
        "Mange danske systemer er skrevet til én branche og bærer den brances antagelser med sig: at alt afregnes pr. time, at en opgave altid tager en halv dag, eller at der kun er én servicetype pr. kunde. Det bliver et problem, så snart virksomheden vokser ind i et nabofag — rengøringsfirmaet der også tager vinduer, gartneren der også rydder sne.",
        "I Serviceydere kan en virksomhed have flere kategorier, flere prismodeller og flere typer aftaler side om side. Man skal ikke skifte system for at udvide forretningen.",
      ],
    },
    {
      heading: "Kom i gang i din branche",
      paragraphs: [
        <>Opret virksomheden, vælg jeres kategorier og læg jeres services ind med den prismodel, I bruger i forvejen. Derefter kan I planlægge i <Link to="/software/ruteplanlaegger">ruteplanlæggeren</Link> og tage imod bookinger fra <Link to="/software/booking-og-tilbud">jeres profilside</Link>.</>,
      ],
    },
  ],
  faq: [
    {
      q: "Er Serviceydere kun til vinduespudsning?",
      a: "Nej. Vinduespudsning er én af mange brancher. Systemet bruges også til rengøring, haveservice, håndværk, flytning, skadedyrsbekæmpelse, algebehandling, skorstensfejning, autoservice og sikkerhed.",
    },
    {
      q: "Kan én virksomhed dække flere brancher?",
      a: "Ja. En virksomhed kan have flere kategorier og underkategorier samtidig, med hver deres services og priser.",
    },
    {
      q: "Passer det til en enkeltmandsvirksomhed?",
      a: "Ja. Systemet virker med én medarbejder og skalerer til flere hold på vejen samtidig. Der er ikke et minimum af brugere.",
    },
    {
      q: "Hvad hvis vi afregner på m² i stedet for timer?",
      a: "Prisenheder er frit definerbare. Du kan afregne pr. time, som fast pris eller ud fra enheder som kvadratmeter, styk eller antal vinduer.",
    },
    {
      q: "Kan vi bruge det til både faste aftaler og enkeltopgaver?",
      a: "Ja. Faste aftaler med interval og engangsopgaver ligger i den samme kalender og planlægges på samme måde.",
    },
  ],
});
export default Page;
