import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "bookingsystem-servicefirma",
  keywords: "booking system, bookingsystem servicefirma, online booking rengøring, booking vinduespudser, bestillingssystem",
  faq: [
    { q: "Kan kunderne vælge fast interval ved booking?", a: "Ja. Kunden kan vælge fx hver 4. uge, og aftalen fortsætter automatisk." },
    { q: "Skal jeg godkende hver booking?", a: "Du bestemmer selv. Nye bestillinger kommer ind som aftaler uden rute, som du kan placere i ruteplanlæggeren." },
  ],
  sections: [
    { paragraphs: [
      "Et bookingsystem lader kunderne bestille selv — døgnet rundt — i stedet for at ringe eller skrive. For servicefirmaer med faste kunder er det vigtigste dog, hvad der sker efter bookingen.",
    ] },
    { heading: "Det skal et bookingsystem til servicefirmaer kunne", list: [
      "Vise dine services med pris uden og med moms.",
      "Tage adresse med automatisk postnummer og by.",
      "Tilbyde faste intervaller, ikke kun enkeltbesøg.",
      "Sende kvittering til kunden med det samme.",
      "Lægge bestillingen direkte ind i din planlægning.",
    ] },
    { heading: "Booking til frisør er ikke booking til service", paragraphs: [
      "Mange bookingsystemer er bygget til tidsbestilling i en butik. Servicefirmaer kører ud til kunden, og opgaven skal passe ind på en rute. Derfor giver det mere mening, at bookingen lander i en ruteplanlægger, hvor du ser, hvilken dag du alligevel er i området.",
    ] },
    { body: (
      <p>
        Læs om <a href="/software/booking-og-tilbud">booking og tilbud</a> og <a href="/blog/kundekartotek-servicefirma">kundekartotek</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
