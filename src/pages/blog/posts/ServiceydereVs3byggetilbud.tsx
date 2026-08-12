import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-3byggetilbud",
  keywords: "serviceydere vs 3byggetilbud, 3byggetilbud alternativ, indhent 3 håndværkertilbud, byggetilbud sammenligning",
  faq: [
    { q: "Hvad er 3byggetilbud?", a: "3byggetilbud er en dansk tilbudsportal, hvor du beskriver en byggeopgave og bliver matchet med håndværkere, der kan give tilbud. Portalen er fokuseret på bygge- og renoveringsopgaver." },
    { q: "Hvad er forskellen på Serviceydere og 3byggetilbud?", a: "3byggetilbud er specialiseret i byggeri og renovering. Serviceydere dækker bredere — både håndværk og serviceydelser som rengøring, flytning, have og vinduespudsning — så du kan bruge samme sted til flere typer opgaver." },
    { q: "Er det gratis at indhente tilbud?", a: "Ja, hos Serviceydere er det gratis for privatkunder at beskrive en opgave og modtage tilbud. Du betaler kun det firma du vælger." },
    { q: "Hvor mange tilbud bør jeg indhente?", a: "Tre er en god tommelfingerregel på større opgaver. Det giver et realistisk prisspænd og gør det tydeligt, hvis ét tilbud mangler noget væsentligt." },
    { q: "Er jeg forpligtet, når jeg modtager tilbud?", a: "Nej. Et tilbud er uforpligtende indtil du accepterer det skriftligt. Bed altid om at få tilbuddet på skrift med omfang, materialer, tidsplan og betalingsplan." },
    { q: "Hvad skal jeg tjekke i et byggetilbud?", a: "Om moms er indregnet, hvad der er med og ikke med, hvem der leverer materialer, hvordan uforudsete forhold håndteres, og om der er en tidsplan og garanti på arbejdet." },
  ],
  sections: [
    {
      paragraphs: [
        "Skal du renovere, bygge om eller have løst en større håndværkeropgave, er tilbudsportaler en effektiv genvej til flere priser på samme opgave. 3byggetilbud er en af de kendte i byggesegmentet. Serviceydere dækker både håndværk og de løbende serviceydelser omkring boligen.",
        "Her får du forskellene — og en tjekliste til at sammenligne tilbud, uanset hvor du indhenter dem.",
      ],
    },
    {
      heading: "Fokus og dækning",
      list: [
        <><strong>3byggetilbud:</strong> bygge- og renoveringsopgaver — tag, vinduer, badeværelse, tilbygning, isolering.</>,
        <><strong>Serviceydere:</strong> håndværk plus service — rengøring, flytning, haveservice, vinduespudsning, skadedyr og mere.</>,
        <><strong>Genbrug:</strong> har du både en renovering og en flytterengøring, kan du klare begge dele samme sted hos Serviceydere.</>,
        <><strong>Løbende aftaler:</strong> Serviceydere understøtter også faste aftaler, ikke kun engangsprojekter.</>,
      ],
    },
    {
      heading: "Sådan bliver dine tilbud sammenlignelige",
      paragraphs: [
        "Den største fejl ved indhentning af tilbud er en for løs opgavebeskrivelse. Får firmaerne forskellige forudsætninger, sammenligner du æbler og pærer.",
      ],
      ordered: [
        "Beskriv opgaven i omfang og mål (m², antal, etage, adgangsforhold).",
        "Skriv hvad du selv leverer — materialer, bortkørsel, maling, container.",
        "Angiv ønsket tidsramme og eventuelle bindinger (fx før indflytning).",
        "Vedhæft billeder. Det er det enkeltgreb der løfter kvaliteten af tilbud mest.",
        "Bed om samme opdeling i alle tilbud: arbejdsløn, materialer, moms, forbehold.",
      ],
    },
    {
      heading: "Tjekliste før du siger ja",
      list: [
        "Er prisen inkl. moms, og er det en fast pris eller et overslag?",
        "Hvad sker der ved uforudsete forhold — fx råd, fugt eller skjulte installationer?",
        "Er der en tidsplan med start- og slutdato?",
        "Hvem har ansvaret for affald og oprydning?",
        "Er firmaet CVR-registreret, og har det ansvarsforsikring?",
        "Er betalingsplanen rimelig? Undgå at betale hele beløbet forud.",
      ],
      body: (
        <p className="text-sm">
          Se prisniveauer før du beder om tilbud i vores <a href="/priser/haandvaerker">håndværker prisguide</a>,{" "}
          <a href="/priser/nyt-tag">tag-prisguide</a> og <a href="/priser/nyt-badevaerelse">badeværelses-prisguide</a>.
        </p>
      ),
    },
    {
      heading: "Hvornår vælger du hvilken?",
      paragraphs: [
        "Er din opgave et rent byggeprojekt, kan en specialiseret byggeportal være et fint sted at starte. Har du flere typer opgaver — eller også løbende service omkring boligen — sparer du tid ved at bruge en bred markedsplads.",
      ],
      body: (
        <p className="text-sm">
          <a href="/tilbud">Beskriv din opgave her</a> og modtag uforpligtende tilbud fra firmaer i dit område.
        </p>
      ),
    },
    {
      heading: "Læs også",
      list: [
        <a href="/blog/serviceydere-vs-handyhand">Serviceydere vs. HandyHand</a>,
        <a href="/blog/serviceydere-vs-servicefinder">Serviceydere vs. Servicefinder</a>,
        <a href="/blog/fast-pris-vs-timepris">Fast pris vs. timepris</a>,
        <a href="/priser/haandvaerker">Håndværker prisguide 2026</a>,
      ],
    },
  ],
});
export default Post;
