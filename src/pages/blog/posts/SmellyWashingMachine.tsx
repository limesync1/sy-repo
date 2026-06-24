import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "lugt-i-vaskemaskine-loesninger",
  keywords: "lugt i vaskemaskine, vaskemaskine lugter, rens vaskemaskine, skimmel vaskemaskine",
  faq: [
    { q: "Hvorfor lugter min vaskemaskine?", a: "Bakterier og skimmel i pakningen, sæberum og afløbsfilteret. Skyldes typisk lave temperaturer + lukket dør + rester af sæbe/skyllemiddel." },
    { q: "Hjælper det at køre maskinen tom på 90°?", a: "Ja — kør 1× månedligt på 90° med 2 dl 8% eddike eller en specifik vaskemaskine-rens. Mere effektivt end blegemiddel." },
    { q: "Skal jeg lade døren stå åben efter vask?", a: "Ja, altid. Den vigtigste vane for at undgå lugt. Også sæberum trækkes ud." },
    { q: "Hvor finder jeg afløbsfilteret?", a: "Nederst foran på maskinen bag en lille klap. Læg en flad bakke under (der kommer 1–2 dl vand) og skru af. Rens hår, mønter, papir-rester — sæt på igen." },
    { q: "Hvor ofte skal pakningen tørres af?", a: "1× ugentligt med eddike-fugtet klud. Bag overgangen samles snavs og fugt — det er der lugten oftest sidder." },
  ],
  sections: [
    { heading: "Akut afhjælpning (gør i dag)", ordered: [
      "Kør tom maskine på 90° med 2 dl 8% eddike i tromlen.",
      "Mens den kører: tør sæberum med eddike-klud (træk det ud — kan vaskes under hanen).",
      "Tør pakningen af — også INDEN i folderne — med eddike-klud.",
      "Rens afløbsfilter (nederst foran på maskinen).",
      "Lad dør + sæberum stå åbent natten over.",
    ]},
    { heading: "Forebyggelse — månedligt", list: [
      "Tom 90° vask med eddike eller vaskemaskine-rens.",
      "Afløbsfilter renses.",
      "Sæberum trækkes ud, rengøres, lufttørres.",
      "Bagside af maskine støvsuges (støv ophober varme + fugt).",
    ]},
    { heading: "Daglige vaner der fjerner lugten for godt", list: [
      "Lad dør stå åben mellem vaske.",
      "Træk sæberum lidt ud — så det kan tørre.",
      "Tør pakningen med håndklæde efter sidste vask.",
      "Brug ikke for meget skyllemiddel (1 hætte er nok — mere giver bare bakterier).",
      "Vask 1–2× månedligt på 60° eller højere.",
    ]},
    { heading: "Hvis lugten ikke forsvinder", list: [
      "Tjek afløbsslange — kan være knækket eller stå i pyt-vand bag maskinen.",
      "Vandlåsen i vasken/afløbet — kan være kilden til lugten.",
      "Pakningen kan være rådnet — udskiftes for 300–600 kr.",
      "Ring service hvis du har prøvet alt 2 uger uden held.",
    ]},
  ]
});

export default Post;
