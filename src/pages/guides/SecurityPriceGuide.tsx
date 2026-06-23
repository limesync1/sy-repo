import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/sikkerhed",
  metaTitle: "Sikkerhed pris 2026 — alarm, kameraer & lås | Serviceydere",
  metaDescription:
    "Hvad koster et alarmsystem, sikkerhedskameraer og en bedre lås i 2026? Etablering, abonnement og hvad forsikringen kræver.",
  keywords: "alarm pris, sikkerhedskamera pris, godkendt lås, sikringsniveau, alarmselskaber",
  heroEyebrow: "Prisguide · Opdateret august 2026",
  heroTitle: "Hvad koster sikring af din bolig i 2026?",
  heroSubtitle:
    "Alarm, kameraer, smart locks og forstærkede døre — pris pr. komponent, abonnement til vagtcentral og hvilke krav forsikringen stiller.",
  breadcrumbLabel: "Sikkerhed",
  ctaCategory: "Sikkerhed",
  publishedAt: "2026-08-05",
  quickFacts: [
    <>Alarm-startsæt: <strong>3.500–9.000 kr.</strong> + installation</>,
    <>Vagtcentral-abonnement: <strong>199–449 kr./md.</strong></>,
    <>4 udendørs IP-kameraer: <strong>8.000–18.000 kr.</strong> installeret</>,
    <>Godkendt lås (sikringsklasse blå): <strong>2.500–5.500 kr.</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Alarmsystem startsæt", price: "3.500–9.000 kr.", note: "Centralenhed + sensorer" },
      { label: "Installation alarm", price: "1.500–4.500 kr.", note: "Standard parcelhus" },
      { label: "Vagtcentral abonnement", price: "199–449 kr./md.", note: "Inkl. udrykning" },
      { label: "Sikkerhedskamera (1 stk)", price: "1.500–4.500 kr.", note: "Inkl. installation" },
      { label: "Smart lock", price: "2.000–4.500 kr.", note: "Inkl. montering" },
      { label: "Godkendt lås (klasse blå)", price: "2.500–5.500 kr.", note: "Inkl. montering" },
      { label: "Sikringskasse til værdier", price: "2.500–8.000 kr.", note: "EN 1143-1" },
    ],
    footnote: "Vejledende priser inkl. moms. Mange forsikringer giver præmierabat ved certificeret alarm.",
  },
  sections: [
    {
      heading: "Hvad kræver din forsikring egentlig?",
      paragraphs: [
        "De fleste danske husforsikringer kræver mindst lås i sikringsklasse blå på yderdøre, hvis du vil opretholde fuld tyveridækning. Ved værdier > 100.000 kr. (smykker, kunst) kræves typisk certificeret alarm tilsluttet vagtcentral.",
        "Ring til selskabet inden du investerer — du kan ofte få 5–15% præmierabat på en godkendt løsning.",
      ],
    },
    {
      heading: "Hvad bør et alarmsystem indeholde?",
      list: [
        "Centralenhed med backup-batteri og 4G/wifi.",
        "Mindst 2 bevægelsessensorer i stueetage.",
        "Magnetkontakter på hoveddør, terrassedør og evt. vinduer.",
        "Røg-/varmesensor (brand er hyppigere end indbrud).",
        "Sirenei høj klasse (mindst 100 dB) — afskrækker indbrudstyve.",
      ],
    },
    {
      heading: "Kameraer — hvor og hvordan",
      paragraphs: [
        "Placér kameraer ved hoveddør, indkørsel, baghave og terrassedør. Husk skiltning — det er lovkrav, og det er også afskrækkende. Cloudoptagelser bør være krypterede.",
        "GDPR: kameraer må ikke filme naboens grund eller offentlig vej i detaljer. Brug privacy zones i opsætningen.",
      ],
    },
    {
      heading: "Røde flag ved alarmselskaber",
      list: [
        "Lange bindingsperioder (> 12 mdr.) uden lovlig opsigelse.",
        "Skjulte gebyrer ved opsigelse.",
        "Ikke-certificeret vagtcentral (kig efter SikkerhedsBranchen-medlem).",
        "Insisterer på fysisk salgsbesøg uden at give skriftligt tilbud først.",
      ],
    },
  ],
  faq: [
    { q: "Hvad giver mest sikring pr. krone?", a: "En godkendt lås (sikringsklasse blå) på alle yderdøre giver mest sikring pr. krone — 80% af indbrudstyve giver op, hvis det tager mere end 2 minutter at komme ind." },
    { q: "Er det nødvendigt med vagtcentral?", a: "Til en parcelhus med almindelige værdier er en alarm med push-notifikation til mobilen ofte nok. Vagtcentral bliver vigtig hvis du har stort indbo, er meget væk fra hjemmet, eller hvis forsikringen kræver det." },
    { q: "Kan jeg selv installere alarm?", a: "Du må gerne selv installere et trådløst startsæt fra fx Verisure eller G4S. Men hvis installation skal være godkendt af forsikringen, kræves typisk certificeret installatør." },
    { q: "Hvad koster det at bryde et abonnement?", a: "Tjek altid kontrakten. Ved aggressive selskaber har vi set opsigelsesgebyrer på 1.500–5.000 kr. — det er en af de hyppigste klagepunkter i branchen." },
  ],
  cta: {
    heading: "Klar til at sikre boligen?",
    body: "Få op til 3 gratis tilbud fra autoriserede alarm- og låsesmede — sammenlign produkter, abonnement og installation.",
    secondaryLabel: "Se sikkerhedsfirmaer",
    secondaryHref: "/virksomheder?category=Sikkerhed",
  },
});