import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fjern-skimmel-paa-fuger-badevaerelse",
  keywords: "skimmel fuger, fjerne skimmel badeværelse, sort skimmel, fuger rens, badeværelse",
  faq: [
    { q: "Er skimmel på fuger farligt?", a: "Sorte og grønne skimmelpletter på silikone- og cementfuger kan give luftvejssymptomer ved langvarig eksponering. Fjern det inden 1–2 uger." },
    { q: "Hvad virker bedst — klor eller eddike?", a: "Klor (natriumhypoklorit) bleger og dræber skimmel mest effektivt — men ætsende. Eddike (8%) virker mildere, bedre til kontinuerlig brug." },
    { q: "Hvornår skal silikonefugen udskiftes?", a: "Når skimmel sidder fast inden i fugen (ikke kun på overfladen), når fugen er løs eller knækket, eller efter 4–7 år. Skær ud, rens, læg ny." },
    { q: "Kan jeg forebygge skimmel?", a: "Tør badeværelset af efter brug, åbn vinduet 10 min, sørg for udsugning, hold luftfugtighed under 60%. Den vigtigste faktor: tør de våde flader." },
    { q: "Hjælper en luftrenser?", a: "Lidt — men ventilation og at tørre fladerne virker mere. En luftrenser fjerner sporer i luften, ikke skimlen i fugerne." },
  ],
  sections: [
    { heading: "Forbered dig — sikkerhed først", list: [
      "Gummi-handsker.",
      "Maske (FFP2) ved klor og store områder.",
      "Åbn vinduet og tænd ventilation.",
      "Beskyttelsesbriller hvis du sprayer opad.",
    ]},
    { heading: "Metode 1 — klor (mest effektivt)", ordered: [
      "Bland 1 del klor med 3 dele vand i sprayflaske (eller brug en færdig skimmelfjerner).",
      "Spray på fugerne, lad virke 15–30 min.",
      "Skrub med en gammel tandbørste.",
      "Skyl grundigt med vand.",
      "Luft minimum 1 time efter.",
    ]},
    { heading: "Metode 2 — eddike (mildere)", ordered: [
      "Brug 8% husholdningseddike i sprayflaske.",
      "Spray på, lad virke 1 time.",
      "Skrub med tandbørste.",
      "Skyl. Gentag dagligt i en uge ved svampig skimmel.",
    ]},
    { heading: "Når skimlen sidder dybt — udskift fugen", ordered: [
      "Skær gamle fuge ud med hobbykniv eller fugefjerner.",
      "Rens med klor, lad tørre helt (24 t).",
      "Pak begge sider af fugen med malertape.",
      "Læg ny silikonefuge (anti-skimmel-type til badeværelser).",
      "Glat med våd finger eller fugepind.",
      "Lad hærde 24 timer før brusebad.",
    ]},
    { heading: "Forebyggelse — gør badeværelset til en dårlig vært for skimmel", list: [
      "Tør silikonefuger med håndklæde efter sidste bad.",
      "Hold udsugning kørende mens du bader + 20 min efter.",
      "Åbn vinduet 5–10 min dagligt.",
      "Brug fugtmåler — under 60% luftfugtighed.",
      "Sæt skimmeltest 1× årligt hvis du har haft problemer.",
    ]},
  ]
});

export default Post;
