import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "kundekartotek-servicefirma",
  keywords: "kundekartotek, kundekartotek program, kundedatabase servicefirma, kundesystem, kundeoversigt",
  faq: [
    { q: "Kan jeg bruge Excel som kundekartotek?", a: "Ja, i starten. Når du har faste kunder med intervaller, flere medarbejdere eller fakturering, bliver regnearket hurtigt for lille." },
    { q: "Kan jeg flytte mine kunder fra et regneark?", a: "Ja. Kunder kan importeres, så du ikke skal taste dem ind igen." },
  ],
  sections: [
    { paragraphs: [
      "Et kundekartotek er listen over dine kunder — men i et servicefirma er det meget mere end navne og telefonnumre. Det er her, du ved hvornår kunden skal have besøg næste gang, hvad det koster, og hvem der kører derud.",
    ] },
    { heading: "Det skal et kundekartotek indeholde", list: [
      "Navn, adresse og kontaktoplysninger.",
      "Privat eller erhverv, evt. CVR.",
      "Aftalte services og pris uden moms.",
      "Interval — fx hver 4. uge.",
      "Noter: nøgle, kode, hund, særlige ønsker.",
      "Historik over udførte besøg og fakturaer.",
    ] },
    { heading: "Hvornår regnearket bliver for lille", list: [
      "Du glemmer at ringe til kunder, der skulle have haft besøg.",
      "Medarbejderne har ikke adgang til noterne ude hos kunden.",
      "Fakturaer skrives manuelt ud fra regnearket.",
      "Det tager lang tid at finde ud af, hvem der bor tæt på hinanden.",
    ] },
    { heading: "Kunder, aftaler og ruter i ét", paragraphs: [
      "Det største skridt er, når kundekartoteket hænger sammen med kalenderen. Så opretter faste aftaler selv næste besøg, kunden lander på den rigtige rute, og udført arbejde kan faktureres uden at taste igen.",
    ] },
    { body: (
      <p>
        Se <a href="/blog/ruteplanlaegning-for-servicevirksomheder">guide til ruteplanlægning</a> og <a href="/blog/bookingsystem-servicefirma">bookingsystem til servicefirmaer</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
