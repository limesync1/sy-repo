import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "tilbud-skabelon-servicefirma",
  keywords: "tilbud skabelon, tilbudsskabelon, tilbud rengøring skabelon, tilbud vinduespudsning, skriv et tilbud",
  faq: [
    { q: "Skal prisen stå med eller uden moms?", a: "Skriv begge dele tydeligt. Erhvervskunder tænker uden moms, private kunder med moms." },
    { q: "Hvor længe skal et tilbud gælde?", a: "Typisk 14–30 dage. Skriv gyldigheden på tilbuddet." },
  ],
  sections: [
    { paragraphs: [
      "Et godt tilbud er kort, klart og svært at misforstå. Brug skabelonen herunder til rengøring, vinduespudsning, haveservice og andre faste serviceopgaver.",
    ] },
    { heading: "Skabelon: det skal tilbuddet indeholde", ordered: [
      "Dit firmanavn, CVR og kontaktoplysninger.",
      "Kundens navn og adresse.",
      "Beskrivelse af opgaven — hvad er med, og hvad er ikke med.",
      "Pris uden moms og pris med moms.",
      "Interval, fx hver 2. uge, og første forventede dato.",
      "Betalingsbetingelser og fakturering.",
      "Gyldighed og hvordan kunden accepterer.",
    ] },
    { heading: "Tips", list: [
      "Nævn servicefradraget, hvis opgaven er fradragsberettiget for private.",
      "Undgå \"ca.\"-priser — giv hellere en fast pris eller timepris med et loft.",
      "Gør det let at sige ja: et link eller et enkelt svar på mail.",
    ] },
    { body: (
      <p>
        Se <a href="/blog/boligjob-fradrag-2026">servicefradrag 2026</a> og <a href="/blog/bookingsystem-servicefirma">bookingsystem</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
