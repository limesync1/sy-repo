import { defineSoftwarePage } from "./defineSoftwarePage";

const PainterSoftware = defineSoftwarePage({
  canonicalPath: "/software/maler",
  metaTitle: "System til malerfirmaer — tilbud pr. m², planlægning og fakturering | Serviceydere",
  metaDescription:
    "Malersystem med prisberegner pr. m², planlægning af svende på flerdagesopgaver, medarbejder-app med billeder og fakturering i E-conomic eller Dinero. Fra 289 kr./md.",
  keywords:
    "system til malerfirma, maler software, program til maler, tilbud maler pr m2, planlægning malerfirma",
  heroEyebrow: "Til malerfirmaer",
  heroTitle: "System til malerfirmaer",
  heroSubtitle:
    "Tilbud pr. m², svende fordelt på opgaverne og fakturering ud fra det, der faktisk er lavet.",
  breadcrumbLabel: "Maler",
  answer:
    "Serviceydere hjælper malerfirmaer med at give hurtige tilbud via en prisberegner pr. m² for vægge, lofter og træværk, fordele svende på opgaver, der strækker sig over flere dage, dokumentere arbejdet med billeder i medarbejder-appen og fakturere med bogføring i E-conomic eller Dinero. Markedspladsen giver samtidig nye private kunder.",
  facts: [
    "Prisberegner pr. m² for vægge, lofter og træværk",
    "Indvendigt og udvendigt arbejde som separate ydelser",
    "Svende fordeles på flerdagesopgaver",
    "Før- og efterbilleder i medarbejder-appen",
    "Bogføring i E-conomic og Dinero",
    "Fra 289 kr./md. — 14 dages gratis prøve uden betalingskort",
  ],
  sections: [
    {
      heading: "Fra m² til tilbud på få minutter",
      paragraphs: [
        "Kunder, der skal have malet, vil gerne have en pris, før nogen kommer ud. Med prisberegneren angiver kunden antal rum, m² og type arbejde og får et vejledende tilbud baseret på jeres egne satser.",
        "Større opgaver kan stadig kræve besigtigelse. Forskellen er, at I kun kører ud til kunder, som allerede har accepteret prisniveauet.",
      ],
    },
    {
      heading: "Det malerfirmaer typisk sætter op først",
      list: [
        "Satser pr. m² for vægge, lofter, træværk og facade.",
        "Tillæg for spartling, høje lofter eller afdækning.",
        "Svende med eget login, så de ser deres egne opgaver.",
        "Regnskabsintegration til E-conomic eller Dinero.",
      ],
    },
    {
      heading: "Dokumentation, der sparer reklamationer",
      paragraphs: [
        "Når svenden tager billeder før og efter i appen, ligger dokumentationen på ordren. Det gør det nemt at svare på spørgsmål fra kunden bagefter og at vise, hvad der blev aftalt og udført.",
      ],
    },
  ],
  faq: [
    { q: "Kan kunden selv regne prisen ud pr. m²?", a: "Ja. Prisberegneren bruger jeres egne satser for vægge, lofter og træværk, så kunden får en vejledende pris med det samme." },
    { q: "Kan en opgave strække sig over flere dage?", a: "Ja. En opgave kan planlægges over flere dage og fordeles på flere svende." },
    { q: "Kan svendene tage billeder af arbejdet?", a: "Ja. Billeder og noter tilføjes i medarbejder-appen og gemmes på ordren." },
    { q: "Hvad koster det?", a: "289 kr./md. i basis plus 59 kr./md. pr. ekstra login. Regnskabsintegration koster 269 kr./md. oveni." },
  ],
  cta: {
    heading: "Læg jeres m²-priser ind og prøv det af",
    body: "Det tager typisk en time at sætte satserne op. Derefter kan kunderne få en pris uden at ringe.",
  },
});
export default PainterSoftware;
