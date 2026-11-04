import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "sygemelding-omplanlaegning-ruter",
  keywords: "sygemelding medarbejder, omplanlægning, fravær planlægning",
  faq: [
    { q: "Mister jeg tidsregistreringen?", a: "Nej, registreret tid bliver på den medarbejder, der udførte arbejdet." },
    { q: "Kan jeg flytte en hel rute?", a: "Ja, både enkelte stop og hele ruter kan flyttes." },
  ],
  sections: [
    { paragraphs: [
      "Sygdom kommer altid på det værste tidspunkt. Med ruterne samlet ét sted handler det om at flytte stop — ikke om at ringe rundt.",
    ] },
    { heading: "Trin for trin", list: [
      "Marker medarbejderen som syg for dagen.",
      "Se hvilke stop der står uden medarbejder.",
      "Flyt de vigtigste stop til kolleger i nærheden.",
      "Flyt resten til en anden dag.",
      "Kunder med påmindelse kan få besked om ny dato.",
    ] },
    { heading: "Forebyg næste gang", list: [
      "Hav en fast afløser pr. område.",
      "Prioritér erhvervskunder med faste krav.",
      "Hold ruterne korte nok til at kunne tage ekstra stop.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
