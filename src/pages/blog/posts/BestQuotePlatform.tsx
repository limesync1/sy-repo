import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "bedste-platform-til-haandvaerkertilbud-2026",
  keywords: "bedste platform håndværkertilbud, sammenlign serviceplatforme danmark, handyhand 3byggetilbud servicefinder happyhelper, hvor får jeg tilbud på håndværker",
  faq: [
    { q: "Hvilken platform skal jeg vælge?", a: "Det afhænger af opgaven. Småopgaver uden fagkrav passer til opgavebørser. Fagarbejde, garanti og løbende aftaler passer til en markedsplads med registrerede virksomheder." },
    { q: "Kan jeg bruge flere platforme samtidig?", a: "Ja. Det er helt normalt at indhente tilbud flere steder på større opgaver — bare sørg for at give alle firmaer den samme opgavebeskrivelse, så tilbuddene kan sammenlignes." },
    { q: "Koster det noget at indhente tilbud?", a: "Hos Serviceydere er det gratis for privatkunder at beskrive en opgave og modtage uforpligtende tilbud. Vilkårene varierer fra platform til platform." },
    { q: "Hvor mange tilbud bør jeg have?", a: "Tre er en god tommelfingerregel. Det giver et prisspænd og gør det synligt, hvis ét tilbud mangler noget væsentligt." },
    { q: "Hvad afgør prisen mest?", a: "Opgavens omfang, adgangsforhold, materialevalg og hvor travlt firmaerne har i din region. En præcis beskrivelse med billeder giver de mest retvisende priser." },
  ],
  sections: [
    {
      paragraphs: [
        "Der findes efterhånden en håndfuld danske platforme, hvor du kan finde hjælp til opgaver i og omkring hjemmet. De ligner hinanden udefra, men de er bygget til forskellige behov. Denne oversigt hjælper dig med at vælge rigtigt første gang.",
      ],
    },
    {
      heading: "De tre grundtyper",
      list: [
        <><strong>Opgavebørs:</strong> du opretter en opgave, og hjælpere — ofte privatpersoner — byder. Bedst til små, korte opgaver uden fagkrav.</>,
        <><strong>Lead-portal:</strong> din forespørgsel sælges som lead til håndværkere, der kontakter dig. Bedst til afgrænsede byggeprojekter.</>,
        <><strong>Markedsplads for firmaer:</strong> du beskriver opgaven, og relevante virksomheder sender uforpligtende tilbud. Bedst når du vil sammenligne fagfolk og også dække løbende service.</>,
      ],
    },
    {
      heading: "Vælg efter opgaven, ikke efter platformen",
      ordered: [
        "Kræver opgaven autorisation (el, vand, gas, kloak)? Så skal det være en registreret virksomhed.",
        "Er der garanti og forsikring på spil? Vælg firma frem for privatperson.",
        "Skal arbejdet gentages — rengøring, have, vinduer? Vælg en udbyder med kapacitet til fast rytme.",
        "Er det en kort hånd med et møbel eller en flyttekasse? En opgavebørs er hurtigst.",
      ],
    },
    {
      heading: "Sådan får du de bedste tilbud, uanset platform",
      list: [
        "Skriv omfang og mål — m², antal, etage, adgangsforhold.",
        "Vedhæft billeder af opgaven.",
        "Angiv hvem der leverer materialer og står for bortkørsel.",
        "Bed om samme opdeling i alle tilbud: arbejdsløn, materialer, moms, forbehold.",
        "Tjek CVR og ansvarsforsikring før du siger ja.",
      ],
      body: (
        <p className="text-sm">
          Kend prisniveauet på forhånd med vores <a href="/guides/priser-2026">prisguides for 2026</a>.
        </p>
      ),
    },
    {
      heading: "Dybere sammenligninger",
      list: [
        <a href="/blog/serviceydere-vs-handyhand">Serviceydere vs. HandyHand</a>,
        <a href="/blog/serviceydere-vs-3byggetilbud">Serviceydere vs. 3byggetilbud</a>,
        <a href="/blog/serviceydere-vs-servicefinder">Serviceydere vs. Servicefinder</a>,
        <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
        <a href="/blog/serviceydere-vs-helphelper">Serviceydere vs. Helphelper</a>,
        <a href="/blog/fast-pris-vs-timepris">Fast pris vs. timepris</a>,
      ],
    },
  ],
});
export default Post;
