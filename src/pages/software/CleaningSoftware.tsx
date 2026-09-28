import { defineSoftwarePage } from "./defineSoftwarePage";

const CleaningSoftware = defineSoftwarePage({
  canonicalPath: "/software/rengoering",
  metaTitle: "System til rengøringsfirmaer — planlægning, timer og fakturering | Serviceydere",
  metaDescription:
    "Rengøringssystem med faste aftaler, nøglestyring, medarbejder-app med tjek ind og ud, timer der kan faktureres og bogføring i E-conomic eller Dinero. Fra 289 kr./md.",
  keywords:
    "system til rengøringsfirma, rengøringsprogram, planlægning rengøring, software rengøringsvirksomhed, timeregistrering rengøring",
  heroEyebrow: "Til rengøringsfirmaer",
  heroTitle: "System til rengøringsfirmaer",
  heroSubtitle:
    "Faste aftaler, nøgler og adgangsforhold, timer der kan faktureres — og nye kunder oveni.",
  breadcrumbLabel: "Rengøring",
  answer:
    "Serviceydere samler driften i et rengøringsfirma: faste aftaler med egne intervaller, planlægning af hvem der kører hvorhen, medarbejder-app hvor der tjekkes ind og ud på adressen, og fakturering på grundlag af det udførte arbejde med bogføring i E-conomic eller Dinero. Oveni ligger en markedsplads, hvor private og virksomheder finder og booker jer direkte.",
  facts: [
    "Privat- og erhvervsrengøring i samme system",
    "Nøgler, koder og alarmoplysninger på kunden",
    "Tjek ind og ud giver dokumenterede timer",
    "Pris pr. time, pr. m² eller fast månedspris",
    "Bogføring i E-conomic og Dinero",
    "Fra 289 kr./md. med ruteplanlægning inkluderet — 14 dages gratis prøve uden betalingskort",
  ],
  sections: [
    {
      heading: "Fra plan til faktura uden mellemregninger",
      paragraphs: [
        "De fleste rengøringsfirmaer taber ikke penge på prisen, men på afstanden mellem hvad der blev planlagt, hvad der blev udført, og hvad der blev faktureret. Når de tre ting lever i hver sin kalender, hvert sit regneark og hver sin hukommelse, forsvinder der timer.",
        "I Serviceydere er det den samme datastrøm: aftalen bliver til et stop på en rute, medarbejderen tjekker ind og ud på adressen, og faktureringen bygger på registreringen frem for på et skøn.",
      ],
    },
    {
      heading: "Det rengøringsfirmaer typisk sætter op først",
      list: [
        "Faste kunder med interval: ugentligt, hver 14. dag, månedligt eller efter egen kadence.",
        "Adgangsforhold pr. kunde — nøgle, kode, alarm, hvor man parkerer.",
        "Medarbejdere med eget login, så de kun ser deres egen dag.",
        "Prisenheder der matcher jeres afregning: timer, m² eller fast månedspris.",
        "Regnskabsintegration, så bestillinger bogføres automatisk.",
      ],
    },
    {
      heading: "Nicheprogram eller bredt system",
      paragraphs: [
        "Der findes gode danske systemer bygget udelukkende til rengøring, og har I kun rengøring og skal bruge fagets specialværktøjer, er de en reel mulighed. Vi er ærlige om det.",
        "Serviceydere giver mening, hvis I også laver vinduespudsning, algebehandling eller flyttehjælp — eller kunne finde på det. Så skal I ikke skifte system for at tage en ny ydelse ind, og markedspladsen giver kundetilgang, som et rent administrationssystem ikke gør.",
      ],
      list: [
        <>Sammenligning: <a href="/blog/serviceydere-vs-cleanmanager">Serviceydere vs. Cleanmanager</a>.</>,
      ],
    },
  ],
  faq: [
    { q: "Kan jeg se, om medarbejderen har været på adressen?", a: "Ja. Medarbejderen tjekker ind og ud på opgaven i appen, og der kan tilføjes noter og billeder. Det er registreringen, faktureringen bygger på." },
    { q: "Håndterer systemet både privat- og erhvervsrengøring?", a: "Ja. De kan ligge side om side med hver deres priser, intervaller og kontaktpersoner." },
    { q: "Hvad koster det for et firma med fem rengøringsassistenter?", a: "289 kr./md. i basis plus 59 kr./md. pr. login — altså 584 kr./md. ekskl. moms for fem. Regnskabsintegration koster 269 kr./md. oveni." },
    { q: "Kan vi holde styr på nøgler?", a: "Adgangsoplysninger noteres på kunden, så de følger opgaven ud til den medarbejder, der skal bruge dem, i stedet for at ligge i en mappe på kontoret." },
    { q: "Skal vi være på markedspladsen for at bruge systemet?", a: "Nej. I kan bruge driftssystemet uden en offentlig profil, og I kan bruge markedspladsen uden at bruge planlægningen." },
  ],
  cta: {
    heading: "Sæt jeres faste kunder op og planlæg en uge",
    body: "Det tager typisk en formiddag at lægge de faste aftaler ind. Derefter kan I se, om planen holder mod virkeligheden.",
  },
});
export default CleaningSoftware;