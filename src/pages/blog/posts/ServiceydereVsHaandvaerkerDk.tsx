import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-haandvaerker-dk",
  keywords: "serviceydere vs håndværker.dk, håndværker.dk alternativ, find håndværker online, håndværkerportal sammenligning",
  faq: [
    { q: "Hvad er Håndværker.dk?", a: "Håndværker.dk er en dansk portal, hvor private beskriver en håndværkeropgave og bliver formidlet videre til håndværkere, der kan byde på opgaven." },
    { q: "Hvordan adskiller Serviceydere sig?", a: "Serviceydere er en bred markedsplads for professionelle serviceudbydere med CVR — både håndværk og løbende service som rengøring, haveservice og vinduespudsning — og du kan se og kontakte firmaerne direkte." },
    { q: "Koster det noget som privatkunde?", a: "Nej. Hos Serviceydere er det gratis at beskrive en opgave og modtage uforpligtende tilbud. Du betaler kun det firma du vælger." },
    { q: "Får jeg de samme firmaer begge steder?", a: "Der kan sagtens være overlap, da mange firmaer er registreret flere steder. Forskellen ligger typisk i hvor mange der reelt svarer på din konkrete opgave." },
    { q: "Hvad skal jeg være opmærksom på?", a: "Tjek at tilbuddet er skriftligt, at moms er indregnet, at firmaet har CVR og ansvarsforsikring, og at det fremgår hvad der ikke er med i prisen." },
  ],
  sections: [
    {
      paragraphs: [
        "Håndværker.dk og Serviceydere bruges begge til at finde nogen, der kan løse en opgave i boligen. Forskellen ligger i bredden og i hvordan kontakten opstår.",
      ],
    },
    {
      heading: "Hovedforskelle",
      list: [
        <><strong>Dækning:</strong> Håndværker.dk er fokuseret på håndværkerfag. Serviceydere dækker både håndværk og serviceydelser.</>,
        <><strong>Kontaktform:</strong> På Serviceydere kan du både beskrive en opgave og selv finde og kontakte et konkret firma.</>,
        <><strong>Løbende aftaler:</strong> Serviceydere understøtter faste aftaler, ikke kun engangsopgaver.</>,
        <><strong>Krav til udbydere:</strong> Serviceydere arbejder med CVR-registrerede virksomheder.</>,
      ],
    },
    {
      heading: "Hvornår vælger du hvad?",
      ordered: [
        "Rent håndværksprojekt og du vil kun have håndværkertilbud? Begge dele fungerer.",
        "Flere typer opgaver på samme tid (fx renovering + flytterengøring)? Brug en bred markedsplads.",
        "Skal opgaven gentages? Vælg en udbyder med kapacitet til fast rytme.",
        "Vil du selv vælge firmaet frem for at blive matchet? Se profilerne og kontakt direkte.",
      ],
      body: (
        <p className="text-sm">
          Se prisniveauer først i <a href="/priser/haandvaerker">håndværker prisguiden</a>, eller{" "}
          <a href="/tilbud">beskriv din opgave</a> og få uforpligtende tilbud.
        </p>
      ),
    },
    {
      heading: "Læs også",
      list: [
        <a href="/blog/bedste-platform-til-haandvaerkertilbud-2026">Oversigt: bedste platform til tilbud i 2026</a>,
        <a href="/blog/serviceydere-vs-3byggetilbud">Serviceydere vs. 3byggetilbud</a>,
        <a href="/blog/serviceydere-vs-handyhand">Serviceydere vs. HandyHand</a>,
        <a href="/blog/fast-pris-vs-timepris">Fast pris vs. timepris</a>,
      ],
    },
  ],
});
export default Post;
