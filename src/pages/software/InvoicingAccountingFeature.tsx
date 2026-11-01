import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/fakturering-og-regnskab",
  metaTitle: "Automatisk fakturering med e-conomic og Dinero | Serviceydere",
  metaDescription:
    "Fakturér udførte besøg i e-conomic eller Dinero. Vælg faktura efter hvert besøg, hver 14. dag, månedligt eller kvartalsvis. Prøv gratis i 14 dage uden kreditkort.",
  keywords:
    "fakturering servicevirksomhed, E-conomic integration, dinero integration, automatisk bogføring, fakturering rengøringsfirma, abonnementsfakturering",
  heroEyebrow: "Fakturering og regnskab",
  heroTitle: "Udført arbejde bliver til en faktura",
  heroSubtitle:
    "Når et besøg markeres som udført, danner det grundlag for fakturering i e-conomic eller Dinero — efter hvert besøg eller samlet efter dit valgte interval.",
  breadcrumbLabel: "Fakturering og regnskab",
  answer:
    "Fakturering i Serviceydere tager udgangspunkt i udførte besøg. Kunde, service og aftalt pris følger aftalen, og medarbejderen registrerer tiden manuelt. Med en tilkoblet regnskabsintegration faktureres besøgene i e-conomic eller Dinero efter det valgte fakturainterval. Flere besøg kan samles på én faktura, mens kommende, ikke-udførte besøg ikke bliver faktureret.",
  facts: [
    "Fakturagrundlaget kommer fra ruten — ikke fra en huskeseddel.",
    "Automatisk bogføring i E-conomic og Dinero.",
    "Faste aftaler faktureres løbende i den aftalte kadence.",
    "Testkørsel før første rigtige bogføring, så kontoplanen passer.",
    "Overblik over hvad der er udført, faktureret og bogført.",
    "Danske forhold: moms, kontoplan og servicefradrag-relevante oplysninger.",
  ],
  sections: [
    {
      heading: "Fra rute til faktura",
      list: [
        <>Medarbejderen markerer besøget som udført i <Link to="/software/medarbejder-app">medarbejder-appen</Link>.</>,
        "Systemet samler kunde, service, aftalt pris og eventuelle tilkøb.",
        "Fakturaen dannes og kan sendes til kunden.",
        "Er automatisk bogføring aktiv, sendes posteringen videre til regnskabsprogrammet.",
      ],
    },
    {
      heading: "Regnskabsintegration",
      paragraphs: [
        "Forbind e-conomic eller Dinero i virksomhedspanelets Regnskab. Her vælger du også virksomhedens standard for fakturainterval og kan følge status på synkroniseringen.",
      ],
      list: [
        "E-conomic og Dinero er de to understøttede regnskabsprogrammer.",
        "Løbende sundhedstjek af forbindelsen, så en udløbet adgang opdages hurtigt.",
        "Log over hvad der er sendt, så du kan afstemme uden at gætte.",
      ],
    },
    {
      heading: "Saml flere besøg på én faktura",
      paragraphs: [
        "Vælg fakturering efter hvert besøg, hver 14. dag, månedligt eller kvartalsvis. Besøgsinterval og fakturainterval er to forskellige valg: en kunde kan eksempelvis få besøg hver 14. dag og modtage en samlet månedlig faktura.",
        "Virksomhedens standard vælges i Regnskab. Du kan vælge et andet interval for en kunde eller en enkelt aftale. Aftalens valg går forud for kundens valg, som går forud for virksomhedens standard. Hvis du ikke vælger en undtagelse, følger aftalen den gældende standard.",
        "Samlefakturaen indeholder de udførte besøg i perioden. I kundepanelet kan kunden se fakturaen og de aftaler, der indgår i den.",
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
      a: "e-conomic og Dinero. Forbindelsen opsættes i Regnskab, og udførte besøg faktureres efter det valgte fakturainterval.",
    },
    {
      q: "Kan jeg teste bogføringen, før den er live?",
      a: "Ja. Der er en testkørsel, som viser præcis hvilke posteringer der ville blive sendt til regnskabsprogrammet, uden at der bogføres noget.",
    },
    {
      q: "Skal jeg taste udført arbejde ind manuelt?",
      a: "Kunde, service og aftalt pris følger aftalen. Medarbejderen registrerer tiden manuelt og markerer besøget som udført; du skal ikke taste samme besøg ind igen i regnskabsprogrammet.",
    },
    {
      q: "Hvordan håndteres faste aftaler?",
      a: "Aftaler med interval faktureres i takt med de udførte besøg, så aflyste eller pausede besøg ikke faktureres.",
    },
    {
      q: "Kan flere besøg samles på én faktura?",
      a: "Ja. Vælg hver 14. dag, månedligt eller kvartalsvis frem for efter hvert besøg. Du kan vælge standard på virksomheden og undtagelser for den enkelte kunde eller aftale.",
    },
    {
      q: "Kan jeg bruge systemet uden regnskabsintegration?",
      a: "Ja. Du kan fakturere fra systemet og selv håndtere bogføringen. Integrationen er valgfri.",
    },
  ],
});
export default Page;
