import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/fakturering-og-regnskab",
  metaTitle: "Fakturering og regnskab med e-conomic og Dinero | Serviceydere",
  metaDescription:
    "Fakturér udført arbejde direkte fra ruten og send det automatisk videre til e-conomic eller Dinero. Ingen dobbelt indtastning, ingen glemte opgaver.",
  keywords:
    "fakturering servicevirksomhed, e-conomic integration, dinero integration, automatisk bogføring, fakturering rengøringsfirma, abonnementsfakturering",
  heroEyebrow: "Fakturering og regnskab",
  heroTitle: "Udført arbejde bliver til en faktura",
  heroSubtitle:
    "Det, medarbejderen tjekker ud, er også det, der faktureres. Og bogføringen sker automatisk i e-conomic eller Dinero.",
  breadcrumbLabel: "Fakturering og regnskab",
  answer:
    "Fakturering i Serviceydere tager udgangspunkt i det arbejde, der faktisk er udført på ruten. Når et stop er tjekket ud, ligger kunde, service, tid og pris klar, så fakturaen kan dannes uden at nogen taster dagen ind igen. Er regnskabsintegrationen slået til, sendes bestillinger og fakturaer automatisk videre til e-conomic eller Dinero.",
  facts: [
    "Fakturagrundlaget kommer fra ruten — ikke fra en huskeseddel.",
    "Automatisk bogføring i e-conomic og Dinero.",
    "Faste aftaler faktureres løbende i den aftalte kadence.",
    "Testkørsel før første rigtige bogføring, så kontoplanen passer.",
    "Overblik over hvad der er udført, faktureret og bogført.",
    "Danske forhold: moms, kontoplan og servicefradrag-relevante oplysninger.",
  ],
  sections: [
    {
      heading: "Fra rute til faktura",
      list: [
        <>Medarbejderen tjekker ud i <Link to="/software/medarbejder-app">medarbejder-appen</Link>, og opgaven markeres som udført.</>,
        "Systemet samler kunde, service, aftalt pris og eventuelle tilkøb.",
        "Fakturaen dannes og kan sendes til kunden.",
        "Er automatisk bogføring aktiv, sendes posteringen videre til regnskabsprogrammet.",
      ],
    },
    {
      heading: "Regnskabsintegration",
      paragraphs: [
        "Integrationen slås til under Indstillinger → Ekstra funktioner, hvor du forbinder e-conomic eller Dinero. Inden den første rigtige bogføring kan du køre en testkørsel, der viser præcis hvad der ville blive sendt afsted — og hvilke konti det rammer.",
      ],
      list: [
        "e-conomic og Dinero er de to understøttede regnskabsprogrammer.",
        "Løbende sundhedstjek af forbindelsen, så en udløbet adgang opdages hurtigt.",
        "Log over hvad der er sendt, så du kan afstemme uden at gætte.",
      ],
    },
    {
      heading: "Faste aftaler og abonnementer",
      paragraphs: [
        "For virksomheder med faste kunder er faktureringen tilbagevendende. Aftaler med interval faktureres i takt med, at besøgene udføres, så en aflyst uge ikke bliver faktureret ved en fejl.",
      ],
    },
    {
      heading: "Hvad det erstatter",
      paragraphs: [
        "Kombinationen af regneark til planlægning, hukommelse til hvad der blev udført, og manuel indtastning i regnskabsprogrammet er der, hvor der typisk tabes penge. Når planlægning, udførelse og fakturering er samme datastrøm, forsvinder både dobbeltarbejdet og de opgaver, der aldrig blev faktureret.",
      ],
    },
  ],
  faq: [
    {
      q: "Hvilke regnskabsprogrammer understøttes?",
      a: "e-conomic og Dinero. Begge forbindes under Indstillinger, og bestillinger og fakturaer kan derefter bogføres automatisk.",
    },
    {
      q: "Kan jeg teste bogføringen, før den er live?",
      a: "Ja. Der er en testkørsel, som viser præcis hvilke posteringer der ville blive sendt til regnskabsprogrammet, uden at der bogføres noget.",
    },
    {
      q: "Skal jeg taste udført arbejde ind manuelt?",
      a: "Nej. Grundlaget kommer fra de stop, medarbejderne har tjekket ud på ruten, så kunde, service og tid allerede er registreret.",
    },
    {
      q: "Hvordan håndteres faste aftaler?",
      a: "Aftaler med interval faktureres i takt med de udførte besøg, så aflyste eller pausede besøg ikke faktureres.",
    },
    {
      q: "Kan jeg bruge systemet uden regnskabsintegration?",
      a: "Ja. Du kan fakturere fra systemet og selv håndtere bogføringen. Integrationen er valgfri.",
    },
  ],
});
export default Page;
