import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "sms-paamindelse-kunder",
  keywords: "sms påmindelse, kundepåmindelse, påmindelse før besøg",
  faq: [
    { q: "Er SMS eller mail bedst?", a: "SMS læses hurtigst; mail er god til erhverv og længere beskeder. Mange bruger begge." },
    { q: "Kan jeg vælge pr. kunde?", a: "Ja, i Serviceydere kan påmindelsen sættes for hele virksomheden, pr. kunde eller pr. aftale." },
  ],
  sections: [
    { paragraphs: [
      "Den dyreste kørsel er den, hvor medarbejderen står foran en låst port. En kort påmindelse dagen før fjerner de fleste af de situationer.",
    ] },
    { heading: "Det skal påmindelsen indeholde", list: [
      "Dato for besøget — ikke et gættet klokkeslæt.",
      "Hvilken service der udføres.",
      "Om kunden skal låse op, fjerne bil eller holde hund inde.",
      "Hvordan kunden flytter eller afmelder besøget.",
    ] },
    { heading: "Hvornår skal den sendes?", list: [
      "Fast kunde med fast aftale: 1 dag før.",
      "Ny kunde: 2–3 dage før, så der er tid til at svare.",
      "Erhverv: ofte bedst som mail til kontaktpersonen.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
