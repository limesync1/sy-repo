import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "start-eget-rengoeringsfirma",
  keywords: "start rengøringsfirma, starte rengøringsvirksomhed, rengøringsfirma CVR, få kunder rengøring, prissætning rengøring",
  faq: [
    { q: "Skal jeg have CVR-nummer?", a: "Ja, hvis du vil fakturere virksomheder og private som selvstændig. Momsregistrering er påkrævet, når omsætningen overstiger 50.000 kr. på 12 måneder." },
    { q: "Hvilken forsikring skal jeg have?", a: "En erhvervs- og produktansvarsforsikring er det vigtigste. Har du ansatte, er arbejdsskadeforsikring lovpligtig." },
    { q: "Hvordan får jeg de første kunder?", a: "Lokalt netværk, en profil på en markedsplads som Serviceydere og et tydeligt tilbud til en afgrænset gruppe, fx privatrengøring hver 14. dag i ét område." },
    { q: "Hvordan sætter jeg prisen?", a: "Regn baglæns fra den løn, du vil have, plus forsikring, kørsel, midler og administration. Mange starter på 350–450 kr. pr. time inkl. moms for privatrengøring." },
  ],
  sections: [
    { paragraphs: ["Et rengøringsfirma kan startes med lav investering, men det er planlægning, priser og faste kunder, der afgør, om det bliver en forretning. Her er de trin, de fleste går igennem det første år."] },
    { heading: "1. Det formelle", list: [
      "CVR-nummer via Virk.dk (enkeltmandsvirksomhed eller ApS)",
      "Momsregistrering, når omsætningen forventes over 50.000 kr.",
      "Erhvervsansvarsforsikring",
      "Bogføringssystem, der lever op til bogføringsloven",
    ] },
    { heading: "2. Vælg en niche", paragraphs: [
      "Privatrengøring, kontorrengøring og flytterengøring kræver forskellige arbejdstider og priser. Det er lettere at blive anbefalet, når du er kendt for én ting i ét område.",
    ] },
    { heading: "3. Planlæg ruterne", paragraphs: [
      "Kørsel mellem kunderne er ubetalt tid. Saml faste kunder geografisk på bestemte dage, så du kan nå flere besøg om dagen.",
    ] },
    { heading: "4. Få styr på driften fra start", ordered: [
      "Faste aftaler med interval i et system frem for i en kalender.",
      "Tjek ind og ud, så timerne er dokumenteret.",
      "Fakturering ud fra udført arbejde.",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/software/rengoering">System til rengøringsfirmaer</Link></li>
        <li><Link to="/opret-virksomhed">Opret din virksomhed på Serviceydere</Link></li>
        <li><Link to="/blog/erhvervsrengoering-pris">Erhvervsrengøring pris</Link></li>
      </ul>
    ) },
  ],
});
