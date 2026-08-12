import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-facebook-grupper",
  keywords: "find håndværker facebook gruppe, facebook grupper håndværker erfaring, serviceydere alternativ facebook, risiko ved at hyre via facebook",
  faq: [
    { q: "Kan man godt finde en god håndværker i en Facebook-gruppe?", a: "Ja, det sker ofte. Men du har ingen struktureret dokumentation for CVR, forsikring eller tidligere arbejde, og anbefalinger i kommentarfelter kan komme fra folk uden erfaring med firmaet." },
    { q: "Hvad er den største risiko?", a: "At du aftaler mundtligt uden skriftligt tilbud og uden at vide, om udbyderen er momsregistreret og forsikret. Det gør det svært at klage over mangler bagefter." },
    { q: "Hvad med fradrag?", a: "Fradrag kræver dokumentation og digital betaling. Kontantbetaling uden faktura giver hverken fradrag eller reklamationsret — tjek de aktuelle regler på skat.dk." },
    { q: "Hvordan gør jeg det trygt, hvis jeg alligevel bruger Facebook?", a: "Bed om CVR-nummer, slå firmaet op i CVR-registret, bed om skriftligt tilbud med omfang og pris, og betal digitalt." },
    { q: "Hvad giver en markedsplads i stedet?", a: "Firmaprofiler, registrerede virksomheder, skriftlige tilbud du kan sammenligne, og en samlet historik på aftalen." },
  ],
  sections: [
    {
      paragraphs: [
        "\"Kan nogen anbefale en maler i området?\" er et af de mest stillede spørgsmål i lokale Facebook-grupper. Det er gratis og hurtigt — men det er også der, de fleste dårlige oplevelser starter.",
      ],
    },
    {
      heading: "Hvad du får i en Facebook-gruppe",
      list: [
        "Hurtige anbefalinger fra naboer.",
        "Ofte kontakt til små, lokale udbydere.",
        "Ingen struktureret dokumentation for CVR, forsikring eller referencer.",
        "Ingen sammenlignelige tilbud — du får navne, ikke priser.",
      ],
    },
    {
      heading: "Hvad du får på en markedsplads",
      list: [
        "Firmaer med CVR og profil du kan læse igennem.",
        "Skriftlige, uforpligtende tilbud på den samme opgavebeskrivelse.",
        "Overblik over hvad der er inkluderet — ikke kun et beløb.",
        "Mulighed for at aftale løbende service, ikke kun én opgave.",
      ],
    },
    {
      heading: "Minimumskravene, uanset hvor du finder hjælpen",
      ordered: [
        "Få CVR-nummer og slå firmaet op.",
        "Bed om skriftligt tilbud med omfang, materialer, moms og tidsplan.",
        "Spørg til ansvarsforsikring.",
        "Betal digitalt — aldrig kontant uden faktura.",
        "Gem al korrespondance.",
      ],
      body: (
        <p className="text-sm">
          Vil du hellere have tilbud på skrift? <a href="/tilbud">Beskriv din opgave</a> og modtag uforpligtende
          tilbud fra registrerede firmaer.
        </p>
      ),
    },
    {
      heading: "Læs også",
      list: [
        <a href="/blog/bedste-platform-til-haandvaerkertilbud-2026">Oversigt: bedste platform til tilbud i 2026</a>,
        <a href="/blog/privat-vs-firma-rengoering">Privat hjælper vs. rengøringsfirma</a>,
        <a href="/blog/serviceydere-vs-handyhand">Serviceydere vs. HandyHand</a>,
      ],
    },
  ],
});
export default Post;
