import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "erhvervsrengoering-tilbud",
  keywords: "erhvervsrengøring tilbud, tilbud på rengøring, kontorrengøring tilbud, rengøringstilbud skabelon",
  faq: [
    { q: "Skal prisen være uden moms?", a: "Ja, erhvervskunder forventer priser uden moms. Skriv gerne prisen med moms også." },
  ],
  sections: [
    { paragraphs: [
      "Erhvervskunder er ofte de mest stabile kunder i et rengøringsfirma. Et klart tilbud gør det nemt for dem at sige ja.",
    ] },
    { heading: "Før du skriver tilbuddet", list: [
      "Besigtig lokalerne og noter m², rum, toiletter og køkken.",
      "Afklar frekvens, fx 2 gange om ugen.",
      "Spørg til adgang, nøgler og alarm.",
    ] },
    { heading: "Det skal tilbuddet indeholde", ordered: [
      "Opgavebeskrivelse pr. område.",
      "Frekvens og faste dage.",
      "Pris pr. besøg eller pr. måned uden moms.",
      "Hvad der ikke er med.",
      "Opsigelse og prisregulering.",
      "Gyldighed.",
    ] },
    { body: (
      <p>
        <a href="/blog/tilbud-skabelon-servicefirma">Tilbud skabelon</a> <a href="/blog/ruteplanlaegning-rengoeringsfirma">ruteplanlægning for rengøringsfirmaer</a> <a href="/blog/start-eget-rengoeringsfirma">start eget rengøringsfirma</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
