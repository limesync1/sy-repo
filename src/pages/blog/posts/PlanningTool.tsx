import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "planlaegningsvaerktoej-servicefirma",
  keywords: "planlægningsværktøj, planlægningsprogram, planlægning servicefirma, vagtplan, ressourceplanlægning",
  faq: [
    { q: "Hvad er forskellen på en kalender og et planlægningsværktøj?", a: "En kalender viser aftaler. Et planlægningsværktøj til service ved også, hvem der skal køre, hvor langt der er mellem stop, og hvornår faste kunder skal have besøg igen." },
  ],
  sections: [
    { paragraphs: [
      "Et almindeligt kalenderprogram kan holde styr på møder. Men servicefirmaer har faste kunder, kørsel mellem adresser og medarbejdere, der bliver syge. Her er syv ting, et planlægningsværktøj til service bør kunne.",
    ] },
    { heading: "Tjeklisten", ordered: [
      "Faste aftaler med intervaller, der selv opretter næste besøg.",
      "Flere medarbejdere med hver sin dag og rute.",
      "Kort og rækkefølge, så kørslen bliver kortere.",
      "Fravær og sygdom — flyt dagens stop til en anden.",
      "Medarbejder-app, så ruten følger med ud.",
      "Ændring af ét besøg eller hele serien.",
      "Kobling til fakturering, så udført arbejde ikke tastes igen.",
    ] },
    { heading: "Sådan vælger du", paragraphs: [
      "Prøv værktøjet med dine egne kunder i en uge. Kan du lave næste uges ruter hurtigere end i dag, er det det rigtige.",
    ] },
    { body: (
      <p>
        Se <a href="/software/ruteplanlaegger">ruteplanlæggeren</a>, <a href="/blog/kapacitetsplanlaegning-servicefirma">kapacitetsplanlægning af arbejdsdagen</a> og <a href="/blog/ruteplanlaegning-excel-til-system">ruteplanlægning i Excel</a>.{" "}
        Læs også <a href="/blog/adresser-ruteplanlaegning-tjekliste">tjeklisten til adresser på ruten</a> og <a href="/blog/google-maps-eller-ruteplanlaegger">Google Maps eller ruteplanlægger</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
