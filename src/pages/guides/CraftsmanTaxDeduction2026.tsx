import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "håndværkerfradrag" (5.400/md, KDI 28) + "håndværkerfradrag 2026".
// Højeste-volumen keyword vi targeterer. Skal være den ultimative reference-side.
export default defineGuidePage({
  canonicalPath: "/guides/haandvaerkerfradrag-2026",
  metaTitle: "Håndværkerfradrag 2026 — komplet guide, beløb & godkendte ydelser | Serviceydere",
  metaDescription:
    "Komplet guide til Håndværkerfradraget 2026: beløbsgrænser, hvilke ydelser er omfattet, krav til betaling og dokumentation, plus eksempler.",
  keywords:
    "håndværkerfradrag 2026, håndværkerfradrag, boligjob 2026, hvad kan trækkes fra håndværker, håndværkerfradrag beløb",
  heroEyebrow: "Skatteguide · Opdateret 2026",
  heroTitle: "Håndværkerfradrag 2026 — komplet guide",
  heroSubtitle:
    "Alt du skal vide om Håndværkerfradraget i 2026: beløbsgrænser, godkendte ydelser, krav til digital betaling, dokumentation og praktiske regneeksempler.",
  breadcrumbLabel: "Håndværkerfradrag 2026",
  // Kategori = Økonomi, så vi sender ikke en specifik branche videre — bruger
  // klikker selv på "Få tilbud" til den rette håndværker.
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Håndværker-del: <strong>8.600 kr.</strong> pr. voksen i 2026</>,
    <>Service-del: <strong>12.300 kr.</strong> pr. voksen i 2026</>,
    <>Krav: <strong>digital betaling</strong> (MobilePay, kort, bankoverførsel)</>,
    <>Du indberetter selv via <strong>TastSelv</strong> hos SKAT</>,
  ],
  priceTable: {
    headers: { label: "Type", price: "Maks. fradrag/voksen", note: "Skatteværdi (~26%)" },
    rows: [
      { label: "Håndværkerfradrag (energi & klima)", price: "8.600 kr.", note: "≈ 2.236 kr." },
      { label: "Servicefradrag (rengøring m.m.)", price: "12.300 kr.", note: "≈ 3.198 kr." },
      { label: "Samlet maks. pr. voksen", price: "20.900 kr.", note: "≈ 5.434 kr." },
      { label: "Husstand med 2 voksne", price: "41.800 kr.", note: "≈ 10.868 kr." },
    ],
    footnote:
      "Skatteværdien er fradragets værdi i kroner og øre — det du reelt sparer i skat. Beløbene gælder 2026 og kan ændres af Folketinget.",
  },
  sections: [
    {
      heading: "Hvad er Håndværkerfradraget?",
      paragraphs: [
        "Håndværkerfradraget (officielt kaldet \"Håndværkerdelen\" af BoligJobordningen) giver dig fradrag for arbejdslønnen på udvalgte håndværkerydelser i og omkring din bolig. Det er kun arbejdsløn der kan trækkes fra — ikke materialer.",
        "I 2026 kan du trække op til 8.600 kr. fra pr. voksen i husstanden. To voksne = 17.200 kr. samlet. Med en skatteværdi på ca. 26% svarer det til en reel besparelse på ca. 4.500 kr. for en husstand.",
      ],
    },
    {
      heading: "Godkendte ydelser i 2026",
      list: [
        <><strong>Energi- og klimaforbedringer</strong> — varmepumpe, isolering, energiruder, solceller, batterilager, ladestander til elbil.</>,
        <>Installation af <strong>nye vinduer og døre</strong> (energirude-niveau A).</>,
        <>Udskiftning af <strong>tag</strong> i kombination med efterisolering.</>,
        <><strong>Tilslutning af fjernvarme</strong>.</>,
        <>Installation af <strong>regnvandsopsamling</strong>.</>,
        <>Hævning eller udskiftning af <strong>fundament</strong> ved energirenovering.</>,
      ],
    },
    {
      heading: "Hvad er IKKE omfattet?",
      list: [
        <>Almindelig vedligehold uden energi-effekt (fx maling, dørudskiftning til standard-dør).</>,
        <>Nybyggeri og tilbygninger (kun renovering af eksisterende).</>,
        <>Have- og terrassearbejder (hører under Servicefradraget).</>,
        <>Materialer — kun arbejdsløn er fradragsberettiget.</>,
        <>Arbejder udført af nære familiemedlemmer eller virksomheder du selv ejer.</>,
      ],
    },
    {
      heading: "Krav for at få fradraget",
      ordered: [
        <><strong>Digital betaling</strong> — MobilePay, bankoverførsel, betalingskort. Kontant accepteres IKKE.</>,
        <><strong>Faktura med CVR</strong> — virksomheden skal være momsregistreret og fakturaen indeholde CVR-nummer.</>,
        <><strong>Specifikation</strong> — arbejdsløn og materialer skal fremgå adskilt på fakturaen.</>,
        <><strong>Udført i din bolig</strong> — helårsbolig eller fritidsbolig som du ejer eller lejer.</>,
        <><strong>Indberetning</strong> — du indberetter selv beløbet på TastSelv hos SKAT.</>,
      ],
    },
    {
      heading: "Eksempel: Varmepumpe-installation",
      paragraphs: [
        "Faktura: 95.000 kr. inkl. moms — fordelt på 65.000 kr. for varmepumpen (materiale) og 30.000 kr. for installationen (arbejdsløn).",
        "Du kan trække de 30.000 kr. fra — men maks. 8.600 kr. pr. voksen. To voksne i husstanden = fradrag på 17.200 kr. Skatteværdi: ~4.470 kr.",
      ],
    },
    {
      heading: "Sådan indberetter du fradraget",
      ordered: [
        <>Log ind på <strong>TastSelv</strong> hos SKAT (skat.dk) med MitID.</>,
        <>Find <strong>"Servicefradrag / Håndværkerfradrag"</strong> under Forskudsopgørelsen eller Årsopgørelsen.</>,
        <>Indtast <strong>virksomhedens CVR</strong> og fakturaens fradragsberettigede beløb.</>,
        <>Gem fakturaen i <strong>3 år</strong> som dokumentation.</>,
        <>Fradraget kan indtastes løbende på forskudsopgørelsen — så får du pengene allerede i indkomstskattetrækket.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvor meget kan jeg trække fra som håndværkerfradrag i 2026?", a: "Op til 8.600 kr. pr. voksen i husstanden. To voksne kan dermed trække 17.200 kr. samlet. Skatteværdien er ca. 26%, så reel besparelse er ca. 4.470 kr." },
    { q: "Hvad er forskellen på Håndværker- og Servicefradraget?", a: "Håndværkerfradraget dækker energi- og klimaforbedringer (varmepumpe, isolering, energiruder). Servicefradraget dækker serviceydelser i hjemmet (rengøring, vinduespudsning, havearbejde). Du kan bruge begge dele samme år." },
    { q: "Kan jeg trække maling og almindelige håndværkerydelser fra?", a: "Nej. Almindelig vedligehold uden energi-effekt er IKKE omfattet i 2026 — kun energi- og klimaforbedringer." },
    { q: "Hvad er kravet til betaling?", a: "Digital betaling: MobilePay, bankoverførsel eller betalingskort. Kontant accepteres ikke. Faktura skal være fra et momsregistreret firma med CVR-nummer." },
    { q: "Hvornår skal jeg indberette fradraget?", a: "Du kan indberette løbende på Forskudsopgørelsen (så får du pengene via mindre skattetræk) eller én gang årligt på Årsopgørelsen. Gem fakturaer i 3 år som dokumentation." },
    { q: "Kan jeg bruge fradraget på fritidsboligen?", a: "Ja. Både helårsbolig og fritidsbolig er omfattet, så længe du selv ejer eller lejer den." },
    { q: "Kan begge ægtefæller bruge fradraget?", a: "Ja. Hver voksen i husstanden kan trække op til 8.600 kr. fra som håndværkerfradrag og 12.300 kr. som servicefradrag i 2026." },
  ],
  cta: {
    heading: "Klar til at få håndværkertilbud?",
    body: "Få op til 3 gratis tilbud fra håndværkere der kan udstede faktura med fradragsret. Vælg det bedste tilbud — og brug fradraget.",
    secondaryLabel: "Se alle kategorier",
    secondaryHref: "/virksomheder",
  },
});