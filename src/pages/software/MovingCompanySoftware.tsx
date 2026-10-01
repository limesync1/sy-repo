import { defineSoftwarePage } from "./defineSoftwarePage";

const MovingCompanySoftware = defineSoftwarePage({
  canonicalPath: "/software/flyttefirma",
  metaTitle: "System til flyttefirmaer — tilbud, planlægning og fakturering | Serviceydere",
  metaDescription:
    "Flyttesystem med prisberegner til tilbud, planlægning af biler og hold, medarbejder-app og fakturering med bogføring i E-conomic eller Dinero. Fra 289 kr./md.",
  keywords:
    "system til flyttefirma, flyttefirma software, program til flyttefirma, planlægning flytninger, tilbud flytning software",
  heroEyebrow: "Til flyttefirmaer",
  heroTitle: "System til flyttefirmaer",
  heroSubtitle:
    "Hurtige tilbud, overblik over biler og hold på flyttedagen — og nye kunder fra markedspladsen.",
  breadcrumbLabel: "Flyttefirma",
  answer:
    "Serviceydere samler driften i et flyttefirma: en prisberegner, hvor kunden selv får en pris ud fra antal værelser, etage og afstand, planlægning af hvilket hold og hvilken bil der kører hvilken flytning, en medarbejder-app med adresser og noter og fakturering ud fra den faktisk brugte tid med bogføring i E-conomic eller Dinero. Oveni ligger markedspladsen, hvor private finder og booker jer direkte.",
  facts: [
    "Prisberegner med værelser, etage, elevator og afstand",
    "Fast pris eller timepris pr. opgave",
    "Hold og biler planlægges på samme dag",
    "Medarbejdere ser adresse, adgangsforhold og noter i appen",
    "Faktisk brugt tid registreres og kan faktureres",
    "Fra 289 kr./md. — 14 dages gratis prøve uden betalingskort",
  ],
  sections: [
    {
      heading: "Tilbuddet er der, hvor flyttefirmaer vinder eller taber",
      paragraphs: [
        "De fleste kunder indhenter tre tilbud og vælger det, der kommer hurtigst med en klar pris. Når hvert tilbud kræver et opkald og en besigtigelse, taber man de små og mellemstore flytninger til den, der svarer først.",
        "Med prisberegneren på jeres side får kunden et realistisk prisniveau med det samme, og I får en bestilling med alle oplysninger: fra- og til-adresse, etager, elevator, mængde og ønsket dato.",
      ],
    },
    {
      heading: "Det flyttefirmaer typisk sætter op først",
      list: [
        "Prisberegner med jeres egne satser for værelser, etager og kørsel.",
        "Ydelser som nedpakning, opbevaring, flytterengøring og bortkørsel.",
        "Medarbejdere og hold med eget login.",
        "Regnskabsintegration, så færdige flytninger bogføres automatisk.",
      ],
    },
    {
      heading: "Flytning plus rengøring i samme ordre",
      paragraphs: [
        "Mange flyttefirmaer sælger også flytterengøring. I Serviceydere kan begge ydelser ligge på samme ordre, så kunden får ét tilbud og én faktura, og I kan planlægge rengøringsholdet dagen efter flytningen.",
      ],
    },
  ],
  faq: [
    { q: "Kan kunden selv beregne prisen på en flytning?", a: "Ja. Prisberegneren bruger jeres egne satser for antal værelser, etager, elevator og afstand, så kunden får en vejledende pris med det samme." },
    { q: "Kan vi både køre fast pris og timepris?", a: "Ja. Hver ydelse kan have fast pris, timepris eller beregnet pris, og I kan justere prisen på den enkelte ordre, før den bekræftes." },
    { q: "Hvad koster det for et flyttefirma med fire medarbejdere?", a: "289 kr./md. i basis plus 59 kr./md. pr. ekstra login. Regnskabsintegration koster 269 kr./md. oveni." },
    { q: "Kan vi sælge flytterengøring sammen med flytningen?", a: "Ja. Ydelserne kan ligge på samme ordre, så kunden får ét samlet tilbud og én faktura." },
  ],
  cta: {
    heading: "Sæt jeres priser op og få den første bestilling",
    body: "Det tager typisk under en time at lægge jeres satser ind i prisberegneren. Derefter kan kunderne få en pris med det samme.",
  },
});
export default MovingCompanySoftware;
