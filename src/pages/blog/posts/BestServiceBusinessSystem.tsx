import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "bedste-system-til-servicevirksomheder-2026",
  keywords: "bedste system til servicevirksomheder, ruteplanlægning software danmark, ordrestyring 2026, sammenligning systemer service",
  faq: [
    { q: "Hvad er det vigtigste, når man vælger system?", a: "At systemet matcher den type arbejde, I faktisk laver. Mange stop pr. dag kræver ruteplanlægning; få lange sager kræver sagsstyring; faste aftaler kræver stærke gentagelser." },
    { q: "Er det bedste system det dyreste?", a: "Nej. Det bedste system er det, medarbejderne rent faktisk bruger. Et system der ikke bliver brugt på vejen, giver ingen data at fakturere ud fra." },
    { q: "Kan ét system dække både drift og nye kunder?", a: "Det er sjældent, men det er præcis kombinationen i Serviceydere: driftssystem og markedsplads i samme platform." },
    { q: "Hvor lang tid tager et skifte?", a: "Med importerede kunder kan de fleste have en realistisk uge planlagt samme dag. Fuld overgang tager typisk nogle uger." },
    { q: "Hvad skal man tjekke inden man binder sig?", a: "Datamigrering ind, dataeksport ud, understøttelse af jeres intervaller og prisenheder, mobilbrug for medarbejderne, og integration til jeres regnskabsprogram." },
  ],
  sections: [
    { heading: "Der findes ikke ét bedste system — der findes et bedste match", paragraphs: [
      "Danske servicevirksomheder vælger typisk mellem fire typer værktøj: branchesystemer, sagsstyring, klassisk ordrestyring og regneark. De løser hver deres problem, og valget bør styres af hvordan jeres dage ser ud — ikke af hvem der markedsfører mest.",
    ]},
    { heading: "De fire typer", list: [
      "Branchesystem: dybe værktøjer til ét fag. Stærkt hvis I aldrig laver andet.",
      "Sagsstyring: bygget om projektet med timer og materialer. Stærkt ved få, lange sager.",
      "Ordrestyring: styr på ordrer og fakturering, men planlægningen ligger uden for systemet.",
      "Regneark og kalender: gratis og fleksibelt, indtil antallet af aftaler overhaler overblikket.",
    ]},
    { heading: "Hvor Serviceydere passer ind", paragraphs: [
      "Serviceydere er et driftssystem bygget om ruten og den tilbagevendende aftale, kombineret med en markedsplads der giver nye opgaver. Det er brancheuafhængigt, så en virksomhed kan dække flere fag uden at skifte system.",
    ], list: [
      <><a href="/software/ruteplanlaegger">Ruteplanlægger</a> med drag & drop, kørselstid, ETA og konfliktadvarsler.</>,
      <><a href="/software/medarbejder-app">Medarbejder-app</a> med tjek ind og ud.</>,
      <><a href="/software/booking-og-tilbud">Online booking og tilbud</a> fra egen profilside.</>,
      <><a href="/software/fakturering-og-regnskab">Fakturering</a> med E-conomic og Dinero.</>,
    ]},
    { heading: "Sammenligninger", list: [
      <a href="/blog/serviceydere-vs-cleanmanager">Serviceydere vs. Cleanmanager</a>,
      <a href="/blog/serviceydere-vs-minuba">Serviceydere vs. Minuba</a>,
      <a href="/blog/serviceydere-vs-ordrestyring">Serviceydere vs. klassisk ordrestyring</a>,
      <a href="/blog/serviceydere-vs-regneark">Serviceydere vs. regneark og kalender</a>,
      <a href="/software">Alt om Serviceydere-systemet</a>,
    ]},
    { heading: "Tjekliste inden du vælger", list: [
      "Hvor mange stop har en medarbejder på en typisk dag?",
      "Hvor stor en del af omsætningen er faste, tilbagevendende aftaler?",
      "Hvordan afregner I — timer, fast pris eller enheder som m²?",
      "Skal medarbejderne kunne bruge det på egen telefon uden oplæring?",
      "Kan systemet bogføre i jeres regnskabsprogram?",
      "Kan I få jeres data ud igen, hvis I skifter?",
    ]},
  ],
});
export default Post;
