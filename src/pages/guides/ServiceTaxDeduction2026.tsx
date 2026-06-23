import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "servicefradrag" (1.900/md, KDI 23).
export default defineGuidePage({
  canonicalPath: "/guides/servicefradrag-2026",
  metaTitle: "Servicefradrag 2026 — komplet guide til serviceydelser i hjemmet | Serviceydere",
  metaDescription:
    "Servicefradrag 2026: hvor meget kan du trække fra, hvilke ydelser er omfattet, krav til digital betaling og hvordan du indberetter via TastSelv.",
  keywords:
    "servicefradrag 2026, servicefradrag, boligjob servicefradrag, fradrag rengøring, fradrag haveservice, fradrag vinduespudser",
  heroEyebrow: "Skatteguide · Opdateret 2026",
  heroTitle: "Servicefradrag 2026 — sådan får du fradrag for serviceydelser",
  heroSubtitle:
    "Træk op til 12.300 kr. fra pr. voksen for rengøring, vinduespudsning, havearbejde og børnepasning i hjemmet. Komplet guide til godkendte ydelser, krav og indberetning.",
  breadcrumbLabel: "Servicefradrag 2026",
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Maks. fradrag: <strong>12.300 kr.</strong> pr. voksen i 2026</>,
    <>Husstand med 2 voksne: <strong>24.600 kr.</strong> samlet</>,
    <>Skatteværdi: ca. <strong>26%</strong> — reel besparelse ~6.400 kr. pr. husstand</>,
    <>Krav: <strong>digital betaling</strong> + faktura fra momsregistreret firma</>,
  ],
  priceTable: {
    headers: { label: "Ydelse", price: "Omfattet?", note: "Typisk timepris" },
    rows: [
      { label: "Rengøring (privat)", price: "Ja", note: "250–450 kr./t" },
      { label: "Vinduespudsning indvendigt", price: "Ja", note: "Pr. besøg fra 400 kr." },
      { label: "Almindelig havearbejde", price: "Ja", note: "350–550 kr./t" },
      { label: "Græsslåning, hækklipning", price: "Ja", note: "350–500 kr./t" },
      { label: "Snerydning og saltning", price: "Ja", note: "Pr. opgave fra 400 kr." },
      { label: "Børnepasning (i hjemmet)", price: "Ja", note: "180–280 kr./t" },
      { label: "Madlavning (i hjemmet)", price: "Ja", note: "Aftalt pris" },
      { label: "Tøjvask, strygning", price: "Ja", note: "Pr. opgave" },
      { label: "Almindelig håndværker", price: "Nej", note: "Se Håndværkerfradrag" },
    ],
    footnote:
      "Kun arbejdsløn kan trækkes fra — ikke materialer. Børnepasning skal ske i barnets hjem eller hos en privat passer (ikke kommunal pasning).",
  },
  sections: [
    {
      heading: "Hvad er Servicefradraget?",
      paragraphs: [
        "Servicefradraget (officielt \"Servicedelen\" af BoligJobordningen) giver dig fradrag for arbejdsløn på serviceydelser udført i din helårs- eller fritidsbolig.",
        "Beløbsgrænsen i 2026 er 12.300 kr. pr. voksen i husstanden. To voksne = 24.600 kr. samlet. Med en skatteværdi på ca. 26% svarer det til en reel skattebesparelse på ca. 6.400 kr.",
      ],
    },
    {
      heading: "Godkendte serviceydelser i 2026",
      list: [
        <><strong>Rengøring</strong> — almindelig rengøring og hovedrengøring, inkl. vinduespudsning indvendigt.</>,
        <><strong>Haveservice</strong> — græsslåning, hækklipning, lugning, beskæring og almindelig vedligehold.</>,
        <><strong>Snerydning</strong> — også fortov og indkørsel, hvis det er din pligt.</>,
        <><strong>Børnepasning</strong> — barnet skal være under 18 og passes i barnets hjem.</>,
        <><strong>Madlavning</strong> i hjemmet (fx aflastning til ældre eller travle familier).</>,
        <><strong>Tøjvask og strygning</strong> hvor opgaven udføres i dit hjem.</>,
      ],
    },
    {
      heading: "Hvad er IKKE omfattet?",
      list: [
        <>Almindelig håndværker (hører under <a href="/guides/haandvaerkerfradrag-2026">Håndværkerfradraget</a> eller falder helt udenfor).</>,
        <>Materialer (rengøringsmidler, gødning, etc.) — kun arbejdsløn.</>,
        <>Ydelser udført af nære familiemedlemmer.</>,
        <>Kommunal hjemmehjælp eller offentligt finansierede ydelser.</>,
        <>Bilvask og pasning af kæledyr.</>,
      ],
    },
    {
      heading: "Krav for at få fradraget",
      ordered: [
        <><strong>Digital betaling</strong> — MobilePay, bankoverførsel, betalingskort. Kontant tæller ikke.</>,
        <><strong>Momsregistreret virksomhed</strong> — privatpersoner uden CVR kan IKKE udløse fradrag.</>,
        <><strong>Faktura med CVR</strong> der specificerer arbejdsløn og evt. materialer adskilt.</>,
        <><strong>Udført i din bolig</strong> — helårsbolig eller fritidsbolig som du ejer/lejer.</>,
        <><strong>Indberetning via TastSelv</strong> på Forskudsopgørelsen eller Årsopgørelsen.</>,
      ],
    },
    {
      heading: "Eksempel: Fast rengøring",
      paragraphs: [
        "Rengøring hver 14. dag à 2 timer = 26 besøg om året. Timepris 295 kr. = 590 kr./besøg = 15.340 kr./år.",
        "To voksne kan tilsammen trække 24.600 kr. fra — så hele udgiften er dækket af fradraget. Skatteværdi: ~3.988 kr. tilbage i skat.",
      ],
    },
    {
      heading: "Sådan indberetter du fradraget",
      ordered: [
        <>Log ind på <strong>TastSelv</strong> hos SKAT med MitID.</>,
        <>Vælg <strong>"Servicefradrag"</strong> under Forskudsopgørelsen.</>,
        <>Indtast forventet beløb for året — beløbet justerer dit månedlige skattetræk.</>,
        <>Korriger på Årsopgørelsen hvis det reelle forbrug afviger.</>,
        <>Gem fakturaer i <strong>3 år</strong> som dokumentation.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvor meget kan jeg trække fra som servicefradrag i 2026?", a: "Op til 12.300 kr. pr. voksen i husstanden. To voksne = 24.600 kr. samlet. Skatteværdi ~26%, så reel besparelse er ca. 6.400 kr." },
    { q: "Hvilke serviceydelser er omfattet?", a: "Rengøring, vinduespudsning indvendigt, almindelig havearbejde, snerydning, børnepasning i hjemmet, madlavning og tøjvask — så længe det udføres af et momsregistreret firma." },
    { q: "Kan jeg bruge en rengøringshjælp uden CVR?", a: "Nej. Servicefradraget kræver at firmaet er momsregistreret og kan udstede faktura med CVR-nummer. Privatpersoner uden CVR udløser ikke fradrag." },
    { q: "Tæller udvendig vinduespudsning?", a: "Ja, både indvendig og udvendig vinduespudsning er omfattet — så længe det udføres som almindelig serviceydelse på din bolig." },
    { q: "Kan jeg kombinere servicefradrag og håndværkerfradrag?", a: "Ja. Du kan bruge begge dele samme år. Maks. samlet pr. voksen i 2026: 20.900 kr. (8.600 + 12.300)." },
    { q: "Skal jeg gemme kvitteringer?", a: "Ja — i mindst 3 år. SKAT kan bede om dokumentation ved stikprøvekontrol." },
  ],
  cta: {
    heading: "Klar til at bruge servicefradraget?",
    body: "Få op til 3 gratis tilbud fra rengøringsfirmaer, havefolk eller vinduespudsere — alle med CVR og fradragsret.",
    secondaryLabel: "Se alle kategorier",
    secondaryHref: "/virksomheder",
  },
});