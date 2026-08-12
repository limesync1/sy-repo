import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-handyhand",
  keywords: "serviceydere vs handyhand, handyhand alternativ, handyhand.dk erfaringer, platform til småopgaver, håndværkerplatform danmark",
  faq: [
    { q: "Hvad er HandyHand.dk?", a: "HandyHand er en dansk platform til småopgaver, hvor private opretter en opgave, og hjælpere — både privatpersoner og firmaer — byder på den. Betaling og aftale håndteres inde på platformen." },
    { q: "Hvad er forskellen på Serviceydere og HandyHand?", a: "HandyHand er bygget til småopgaver og bud fra enkeltpersoner. Serviceydere er en markedsplads for professionelle serviceudbydere med CVR, hvor du beskriver opgaven én gang og modtager uforpligtende tilbud fra relevante firmaer i dit område." },
    { q: "Hvornår giver HandyHand bedst mening?", a: "Til korte, ukomplicerede opgaver som møbelsamling, en flyttekasse-hånd, havehjælp en enkelt eftermiddag eller andre ting hvor prisen er lav og en fagperson ikke er nødvendig." },
    { q: "Hvornår giver Serviceydere bedst mening?", a: "Når opgaven kræver en fagperson eller et firma — fx VVS, el, malerarbejde, tag, flytterengøring, erhvervsrengøring eller fast serviceaftale — og du vil sammenligne konkrete tilbud." },
    { q: "Koster det noget at bruge Serviceydere som privatkunde?", a: "Nej. Det er gratis at beskrive din opgave og modtage tilbud. Du betaler kun det firma du selv vælger." },
    { q: "Er hjælpere på HandyHand forsikrede?", a: "Det afhænger af den enkelte hjælper, da mange er privatpersoner. På Serviceydere er udbyderne registrerede virksomheder med CVR, så ansvarsforsikring og garantiforhold følger deres virksomhed." },
    { q: "Kan jeg få håndværker- eller servicefradrag begge steder?", a: "Fradrag kræver at arbejdet er udført af en momsregistreret virksomhed (eller en person over 18 år for servicefradrag), og at du betaler digitalt. Køb hos et registreret firma er derfor typisk det sikreste udgangspunkt — tjek altid de aktuelle regler på skat.dk." },
  ],
  sections: [
    {
      paragraphs: [
        "HandyHand.dk og Serviceydere løser to forskellige behov, selvom begge handler om at få hjælp til opgaver i og omkring hjemmet. HandyHand er en opgaveplatform med bud fra enkeltpersoner. Serviceydere er en markedsplads for professionelle serviceudbydere med CVR.",
        "Nedenfor får du forskellene, så du kan vælge den platform der passer til netop din opgave — og undgå at bruge tid det forkerte sted.",
      ],
    },
    {
      heading: "Kort fortalt: hvem er hvad?",
      list: [
        <><strong>HandyHand:</strong> opgavebørs. Du opretter en opgave, hjælpere byder, du vælger den billigste eller bedst bedømte.</>,
        <><strong>Serviceydere:</strong> markedsplads for firmaer. Du beskriver opgaven, og relevante virksomheder i dit område sender uforpligtende tilbud.</>,
        <><strong>Typisk opgavestørrelse:</strong> HandyHand er stærkest på små, korte opgaver. Serviceydere dækker både engangsopgaver og løbende aftaler.</>,
        <><strong>Hvem udfører arbejdet:</strong> hos HandyHand ofte en privatperson. Hos Serviceydere en registreret virksomhed.</>,
      ],
    },
    {
      heading: "Fagområder og opgavetyper",
      paragraphs: [
        "Nogle opgaver må kun udføres af autoriserede fagfolk. Det gælder blandt andet fastinstallationer inden for el og VVS. Her er en opgavebørs med privatpersoner ikke det rette sted at lede.",
      ],
      list: [
        "Autorisationskrævende arbejde (el, vand, gas, kloak) → registreret virksomhed.",
        "Fagarbejde med garanti (tag, facade, gulv, maling, murerarbejde) → firma med ansvarsforsikring.",
        "Løbende aftaler (erhvervsrengøring, haveservice, vinduespudsning) → firma med kapacitet til fast rytme.",
        "Enkeltstående småopgaver uden fagkrav (møbelsamling, oprydning, en hjælpende hånd) → opgavebørs kan sagtens være nok.",
      ],
    },
    {
      heading: "Pris og prisform",
      paragraphs: [
        "På en opgavebørs byder hjælpere typisk med en samlet pris eller en timepris på en kort opgave. Fordelen er hurtig prisdannelse; ulempen er at buddet sjældent bygger på en fagligt vurderet opgavebeskrivelse.",
        "På Serviceydere sender firmaerne tilbud ud fra din beskrivelse — ofte som fast pris på afgrænsede opgaver eller timepris på fejlfinding. Fordi flere firmaer regner på samme opgave, kan du sammenligne omfang og forbehold, ikke kun tallet.",
      ],
      body: (
        <p className="text-sm">
          Vil du kende prisniveauet før du beder om tilbud, kan du bruge vores{" "}
          <a href="/guides/priser-2026">prisguides</a> som udgangspunkt.
        </p>
      ),
    },
    {
      heading: "Tryghed, forsikring og ansvar",
      list: [
        "Hvem hæfter hvis noget går i stykker? Hos et firma dækker ansvarsforsikringen typisk skader ved arbejdet.",
        "Reklamation: køb hos en virksomhed giver dig som forbruger et klart udgangspunkt for at klage over mangler.",
        "Dokumentation: faktura fra et CVR-registreret firma er nødvendig, hvis du vil søge fradrag.",
        "Kvalitetssignal: anmeldelser hjælper begge steder, men sig altid ja til at se referencer på større opgaver.",
      ],
    },
    {
      heading: "Sådan vælger du i praksis",
      ordered: [
        "Kan opgaven løses på under et par timer uden fagkrav? Så er en opgavebørs som HandyHand oplagt.",
        "Kræver den autorisation, garanti eller materialer? Bed om tilbud fra firmaer i stedet.",
        "Skal arbejdet gentages (rengøring, have, vinduer)? Vælg et firma med fast kapacitet.",
        "Er du i tvivl om pris? Indhent flere tilbud og sammenlign hvad der er inkluderet — ikke kun beløbet.",
      ],
      body: (
        <p className="text-sm">
          Klar til at prøve? <a href="/tilbud">Beskriv din opgave</a> og modtag uforpligtende tilbud fra
          serviceudbydere i dit område.
        </p>
      ),
    },
    {
      heading: "Læs også",
      list: [
        <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
        <a href="/blog/serviceydere-vs-servicefinder">Serviceydere vs. Servicefinder</a>,
        <a href="/blog/serviceydere-vs-3byggetilbud">Serviceydere vs. 3byggetilbud</a>,
        <a href="/blog/fast-pris-vs-timepris">Fast pris vs. timepris</a>,
        <a href="/blog/serviceydere-vs-helphelper">Serviceydere vs. Helphelper</a>,
      ],
    },
  ],
});
export default Post;
