import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "software-til-havemand",
  keywords: "software havemand, haveservice planlægning, anlægsgartner system",
  faq: [
    { q: "Kan vejret flytte besøg?", a: "Ja, besøg og hele ruter kan flyttes til en anden dag." },
    { q: "Kan medarbejderne se noter om haven?", a: "Ja, adgangsnoter og kundenoter vises på stoppet." },
  ],
  sections: [
    { paragraphs: [
      "Haveservice er sæsonarbejde med mange faste kunder i højsæsonen. Det kræver ruter, der hænger sammen, og intervaller, der passer til opgaven.",
    ] },
    { heading: "Typiske intervaller i haveservice", list: [
      "Græsslåning: hver uge eller hver 14. dag i sæsonen.",
      "Hækklipning: 1–2 gange årligt.",
      "Ukrudt og bede: hver 2.–4. uge.",
      "Løv og oprydning: efterår.",
    ] },
    { heading: "Sådan holder du ruterne tætte", list: [
      "Saml kunder i samme område på samme dag.",
      "Lad nye kunder starte på en eksisterende rute.",
      "Optimér rækkefølgen, når der kommer nye stop.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
