import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const CarpentryProject = defineBlogPost({
  slug: "tomrerprojekt-hjemme-trin-for-trin",
  keywords:
    "tømrer projekt, tømrer pris, byggetilladelse, tilbygning tømrer, ab forbruger kontrakt, byggemøde",
  faq: [
    { q: "Hvad koster en tømrer i timen?", a: "Faglært tømrer 525–675 kr./time inkl. moms i 2026. Akkordpriser bruges ofte på større opgaver. Se vores guide til tømrer-timepriser." },
    { q: "Hvornår skal jeg have byggetilladelse?", a: "Til tilbygninger, nye boligenheder og ændringer af bærende konstruktioner. Mindre carporte (under 50 m²) og udhuse (under 35 m²) er typisk fritaget, men skal stadig anmeldes." },
    { q: "Hvad er AB-Forbruger?", a: "Standardvilkår mellem håndværker og forbruger. Giver 5 års garanti, 1- og 5-års gennemgang og klare regler for tilbud, betaling og forsinkelse. Aftal altid AB-Forbruger på opgaver over 25.000 kr." },
    { q: "Hvor stort må forskuddet være?", a: "Maks 20–30 % af kontraktsummen er normalt. Aldrig betal hele beløbet forud. Resten i rater knyttet til milepæle (halvvejs-syn, aflevering, mangelfrist)." },
    { q: "Hvor lang er garantien?", a: "5 år efter AB-Forbruger på selve arbejdet. 10 år på leverede materialer hvis det er fast leverandørgaranti. Reklamationsret i 10 år ved skjulte fejl mod fagmæssig udførelse." },
    { q: "Skal jeg have entrepriseforsikring?", a: "På opgaver over ~100.000 kr. anbefales det. Tømreren skal have erhvervsansvar (8–10 mio. kr. dækning). På større tilbygninger skal du selv tegne all-risk forsikring." },
    { q: "Hvad gør jeg ved uenighed under projektet?", a: "Skriv det ned med det samme, og send mail med foto. Hvis ikke I bliver enige, kan du klage til Håndværkets Ankenævn eller Byggeriets Ankenævn — gratis for forbrugere." },
  ],
  sections: [
    {
      paragraphs: [
        "Et tømrerprojekt kan være alt fra et nyt køkkenskab til en tilbygning på 40 m². Forskellen mellem et godt og et dårligt forløb ligger i forberedelsen, kontrakten og kommunikationen. Her er de syv trin der gør forskellen — plus 2026-priser og røde flag.",
      ],
    },
    {
      heading: "Trin 1 — Definér projektet",
      paragraphs: [
        "Skriv ned: hvad skal laves, hvilke mål (m², antal), hvilke materialer du foretrækker, og hvilken kvalitet (standard, mellem, høj). Lav skitser eller find inspirationsbilleder. Jo skarpere brief, jo skarpere tilbud — og jo nemmere bliver det at sammenligne 2–3 tilbud æble-til-æble.",
      ],
    },
    {
      heading: "Trin 2 — Afklar tilladelser",
      list: [
        "Tilbygninger > 0 m²: byggetilladelse",
        "Carport/udhus 35–50 m²: anmeldelsespligt, ikke tilladelse",
        "Ændring af bærende konstruktion: byggetilladelse + statiker",
        "Ny anvendelse (loft → bolig): byggetilladelse + brand- og isoleringskrav",
        "Facadeændring (vinduer flyttet, nye åbninger): tilladelse",
        "Sagsbehandlingstid: 6–12 uger i de fleste kommuner",
      ],
      body: (
        <p>
          Læs mere i <Link to="/blog/hvornaar-skal-du-have-byggetilladelse">hvornår skal du have byggetilladelse</Link>.
        </p>
      ),
    },
    {
      heading: "Trin 3 — Indhent 2–3 tilbud",
      paragraphs: [
        "Send samme detaljerede beskrivelse til 2–3 tømrere. Bed om opdelt tilbud: arbejdsløn, materialer, byggepladsudgifter (container, stillads, strøm), og en tidsplan. Ved store opgaver: bed om referencer fra lignende projekter, og besøg gerne et færdigt projekt.",
      ],
      body: (
        <p>
          Brug vores tjeklister: <Link to="/blog/7-spoergsmaal-foer-du-booker-haandvaerker">7 spørgsmål før du booker håndværker</Link>{" "}
          og <Link to="/blog/saadan-laeser-du-haandvaerkertilbud">sådan læser du håndværkertilbud</Link>.
        </p>
      ),
    },
    {
      heading: "Trin 4 — Kontrakt",
      list: [
        "Skriv opgavebeskrivelse + tegninger ind som bilag",
        "Betalingsplan i rater (fx 25 % opstart, 50 % efter halvvejs-syn, 25 % efter aflevering)",
        "Dagbod ved forsinkelse uden gyldig grund (typisk 0,5–1 ‰ pr. dag)",
        "Henvisning til AB-Forbruger 2019",
        "Forsikringer (erhvervsansvar + entreprise)",
        "Aftale om ændringsbestillinger (skal være skriftlige før de udføres)",
      ],
    },
    {
      heading: "Trin 5 — Byggemøder under arbejdet",
      paragraphs: [
        "Aftal ugentlige korte byggemøder (15 min) hvor I gennemgår fremdrift, ændringsønsker og eventuelle uforudsete forhold. Alt aftalt skriftligt — sms eller mail tæller. Et godt referat = ingen senere uenighed.",
      ],
    },
    {
      heading: "Trin 6 — Afleveringsforretning",
      paragraphs: [
        "Når opgaven er færdig holdes en afleveringsforretning. I går rundt sammen og noterer eventuelle fejl/mangler i en mangelliste. Tømreren får en frist (typisk 14 dage) til at udbedre. Sidste rate udbetales først, når mangellisten er afsluttet.",
      ],
    },
    {
      heading: "Trin 7 — 1- og 5-års gennemgang",
      paragraphs: [
        "Ved AB-Forbruger har du ret til en 1-års og 5-års gennemgang. Brug den! Ofte dukker små sætningsskader, fugespringere eller utætheder først op efter et år. Indkald skriftligt 2–4 uger inden gennemgangen.",
      ],
    },
    {
      heading: "Røde flag",
      list: [
        "Vil have hele beløbet forud eller stort forskud (> 30 %)",
        "Intet skriftligt tilbud, eller tilbud uden materialeliste",
        "Kan ikke fremvise CVR + erhvervsansvarsforsikring",
        "Insisterer på 'sort' arbejde — du mister garanti og forsikring",
        "Vil ikke bruge AB-Forbruger",
        "Ekstrem lav pris (under markedsniveau med 30 %+)",
      ],
      body: (
        <p>
          Se også <Link to="/blog/roede-flag-i-haandvaerkertilbud">røde flag i håndværkertilbud</Link> og{" "}
          <Link to="/blog/dine-rettigheder-ved-fejl-i-haandvaerkerarbejde">dine rettigheder ved fejl</Link>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/toemrer-timepris-2026">Tømrer timepris 2026</Link></li>
          <li><Link to="/blog/saadan-bestiller-du-haandvaerker-rigtigt">Sådan bestiller du håndværker rigtigt</Link></li>
          <li><Link to="/blog/aconto-vs-slutfaktura">Aconto vs. slutfaktura</Link></li>
          <li><Link to="/blog/garantitider-paa-haandvaerkerarbejde">Garantitider på håndværkerarbejde</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default CarpentryProject;