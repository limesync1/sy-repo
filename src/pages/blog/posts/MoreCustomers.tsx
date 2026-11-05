import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "flere-kunder-servicefirma",
  keywords: "flere kunder, markedsføring servicefirma, få kunder vinduespudser",
  faq: [
    { q: "Hvad virker hurtigst?", a: "Naboeffekten på eksisterende ruter og hurtige svar på forespørgsler." },
    { q: "Kan jeg modtage forespørgsler samlet?", a: "Ja, Serviceydere samler forespørgsler fra hjemmeside og Facebook ét sted." },
  ],
  sections: [
    { paragraphs: [
      "Servicefirmaer vokser lokalt. Den bedste nye kunde bor ofte i samme gade som en eksisterende — og det er der gode metoder til at udnytte.",
    ] },
    { heading: "8 metoder", list: [
      "Opret og vedligehold din Google-virksomhedsprofil.",
      "Bed glade kunder om en anmeldelse lige efter besøget.",
      "Læg sedler hos naboerne på dine faste ruter.",
      "Svar på forespørgsler samme dag.",
      "Vis faste priser eller en prisberegner på hjemmesiden.",
      "Tilbyd et fast interval i stedet for enkeltopgaver.",
      "Brug biler og arbejdstøj med logo.",
      "Samarbejd med ejendomsmæglere og boligforeninger.",
    ] },
    { heading: "Mål hvad der virker", list: [
      "Notér hvor hver ny kunde kom fra.",
      "Følg svartid på forespørgsler.",
      "Hold øje med hvor mange der bliver faste kunder.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
