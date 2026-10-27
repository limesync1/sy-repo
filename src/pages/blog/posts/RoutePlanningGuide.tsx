import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "ruteplanlaegning-for-servicevirksomheder",
  keywords: "ruteplanlægning, ruteplanlægger, ruteplanlægning servicevirksomhed, planlægning af ruter, faste ruter, ruteplan firma",
  faq: [
    { q: "Hvad er ruteplanlægning?", a: "At bestemme hvilke kunder der besøges hvilken dag, af hvem og i hvilken rækkefølge — så I kører mindst muligt og når flest besøg." },
    { q: "Hvornår skal jeg have et rigtigt værktøj?", a: "Når du har faste kunder med forskellige intervaller, eller mere end én medarbejder. Så bliver regneark og papir hurtigt uoverskuelige." },
    { q: "Kan jeg prøve en ruteplanlægger gratis?", a: "Ja. Serviceydere kan prøves gratis i 14 dage. Du skal ikke bruge kreditkort for at starte." },
  ],
  sections: [
    { paragraphs: [
      "En god rute er ikke bare den korteste vej. Det er den rigtige blanding af kunder, dage, medarbejdere og tid — så dagen kan nås, og kunden får besøg, når det er aftalt.",
      "Her er en enkel metode, der virker, uanset om du har 20 kunder eller 2.000.",
    ] },
    { heading: "1. Start med kunderne, ikke kortet", paragraphs: [
      "Skriv hver kunde op med adresse, interval (fx hver 4. uge) og hvor lang tid besøget tager. Uden tidsforbrug kan du ikke vide, om en dag kan nås.",
    ] },
    { heading: "2. Del dit område op i zoner", paragraphs: [
      "Tegn 4–8 zoner, typisk efter postnummer eller by. Kunder i samme zone ligger på samme dag. Det alene fjerner det meste af den unødige kørsel.",
    ] },
    { heading: "3. Læg zonerne på faste dage", list: [
      "Mandag: zone 1, tirsdag: zone 2 osv.",
      "Kunder med samme interval i samme zone følges ad.",
      "Lad en halv dag om ugen stå fri til nye kunder og ekstraopgaver.",
    ] },
    { heading: "4. Sæt rækkefølgen inden for dagen", paragraphs: [
      "Først nu giver det mening at optimere rækkefølgen. Start tæt på hjemmet eller lageret, kør i en bue og slut, hvor du har kortest hjem.",
    ] },
    { heading: "5. Fordel på medarbejdere", paragraphs: [
      "Giv hver medarbejder sine egne zoner. Kunderne møder de samme ansigter, og medarbejderen lærer adresser, nøgler og særlige ønsker at kende.",
    ] },
    { heading: "6. Følg op hver uge", paragraphs: [
      "Se hvor lang tid besøgene reelt tog. Juster tiderne, flyt kunder der passer bedre i en anden zone, og hold øje med dage der er overbookede.",
    ] },
    { heading: "Sådan hjælper en ruteplanlægger", list: [
      "Den næste aftale oprettes automatisk ud fra intervallet.",
      "Du ser hele måneden og kan trække aftaler mellem dage og medarbejdere.",
      "Rækkefølgen kan optimeres med ét tryk, og køretiden vises pr. medarbejder.",
      "Medarbejderen har dagens rute i sin telefon og markerer, når et besøg er udført.",
    ] },
    { body: <TrialNote /> },
  ],
});
