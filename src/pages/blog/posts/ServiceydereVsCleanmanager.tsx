import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-cleanmanager",
  keywords: "serviceydere vs cleanmanager, cleanmanager alternativ, system til rengøringsfirma, ruteplanlægning rengøring",
  faq: [
    { q: "Hvad er Cleanmanager?", a: "Cleanmanager er et dansk system målrettet rengøringsbranchen med planlægning, timeregistrering og kvalitetssikring. Det er et veletableret valg for rengøringsvirksomheder." },
    { q: "Hvad er den største forskel?", a: "Cleanmanager er specialiseret i rengøring. Serviceydere er brancheuafhængigt og indeholder desuden en markedsplads, hvor virksomheden kan få nye kunder — ikke kun planlægge de eksisterende." },
    { q: "Hvem passer Cleanmanager bedst til?", a: "Rengøringsvirksomheder der udelukkende arbejder med rengøring og har brug for de brancheværktøjer, der er bygget specifikt til faget." },
    { q: "Hvem passer Serviceydere bedst til?", a: "Virksomheder der dækker flere fag eller vil kunne udvide senere, og som gerne vil have drift og kundetilgang i samme system." },
    { q: "Kan jeg flytte mine kunder over?", a: "Ja. Kunder kan importeres fra regneark, og systemet hjælper med at genkende kolonner for adresser, kontaktoplysninger og aftaler." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "Cleanmanager er et branchesystem til rengøring. Serviceydere er et brancheuafhængigt driftssystem med ruteplanlægning kombineret med en markedsplads. Har du udelukkende rengøring og skal bruge fagets specialværktøjer, er et branchesystem en stærk kandidat. Dækker du flere fag — eller vil du også have nye kunder gennem platformen — dækker Serviceydere bredere.",
    ]},
    { heading: "Hvor de ligner hinanden", list: [
      "Planlægning af faste, tilbagevendende kunder.",
      "Registrering af udført arbejde fra medarbejderens telefon.",
      "Kundekartotek, aftaler og historik.",
      "Grundlag for fakturering af udført arbejde.",
    ]},
    { heading: "Hvor Serviceydere adskiller sig", list: [
      <>Markedsplads med nye opgaver oveni driften — se <a href="/software/booking-og-tilbud">booking og tilbud</a>.</>,
      "Brancheuafhængigt: rengøring, vinduer, have, håndværk, flytning og flere i samme system.",
      <>Visuel <a href="/software/ruteplanlaegger">ruteplanlægger</a> med drag & drop, kørselstid, ETA og konfliktadvarsler.</>,
      "Frit definerbare prisenheder: timer, fast pris, m², stk. eller egne enheder.",
      "Profilside med online booking og prisberegner, der kan ligge på virksomhedens eget domæne.",
    ]},
    { heading: "Hvad du bør spørge om, uanset valg", list: [
      "Kan systemet håndtere jeres faktiske intervaller — også de skæve?",
      "Hvor let er det at flytte et helt hold til en anden dag?",
      "Bogfører det direkte i jeres regnskabsprogram? (Serviceydere understøtter e-conomic og Dinero.)",
      "Hvad sker der med jeres data, hvis I skifter igen?",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-system-til-servicevirksomheder-2026">Oversigt: bedste system til servicevirksomheder i 2026</a>,
      <a href="/blog/serviceydere-vs-minuba">Serviceydere vs. Minuba</a>,
      <a href="/software">Alt om Serviceydere-systemet</a>,
    ]},
  ],
});
export default Post;
