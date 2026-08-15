import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-fenster",
  keywords: "serviceydere vs fenster, fenster alternativ, program til vinduespudsere, ruteplanlægning vinduespudser",
  faq: [
    { q: "Hvad er Fenster?", a: "Fenster er et dansk system målrettet vinduespudsere, som markedsfører sig på planlægning, kundestyring og fakturering til netop den branche." },
    { q: "Hvad koster Fenster?", a: "Fenster oplyser ikke fuld prisliste offentligt på samme måde som os, så du bør bede dem om et konkret tilbud og sammenligne med vores priser, der står åbent på /software/priser." },
    { q: "Hvad er den vigtigste forskel?", a: "Serviceydere er ikke låst til vinduespudsning. Systemet dækker rengøring, haveservice, håndværk og mere, og indeholder desuden en markedsplads, der sender nye kunder til virksomheden." },
    { q: "Kan jeg flytte mine kunder med over?", a: "Ja. Vi kan importere kundekartotek og faste aftaler fra regneark eller et andet system for 1.495 kr. som engangsbeløb." },
    { q: "Hvem bør vælge et rent vinduespudserprogram?", a: "Hvis I aldrig kommer til at lave andet end vinduespudsning og ikke har brug for at få nye kunder gennem systemet, kan et rent brancheprogram være nok." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "Fenster er lavet til én branche. Serviceydere er lavet til servicevirksomheder med kørende medarbejdere — uanset om I pudser vinduer, gør rent, klipper hæk eller alle tre dele — og lægger en markedsplads oveni, så systemet også skaffer kunder.",
      "Vælger I et rent vinduespudserprogram, binder I jeres administration til den ene ydelse. Den dag I tilføjer algebehandling, solcellevask eller trappevask, står I med et system, der ikke rigtig kan rumme det.",
    ]},
    { heading: "Det I får hos os, som et rent brancheprogram sjældent har", list: [
      <>En <a href="/software/ruteplanlaegger">ruteplanlægger</a> med drag & drop, beregnet kørselstid, ETA pr. stop og advarsler ved dobbeltbooking.</>,
      <>En <a href="/software/medarbejder-app">medarbejder-app</a> med dagens rute, tjek ind og ud, noter og billeder fra opgaven.</>,
      "Frit definerbare prisenheder — kvadratmeter, stk., fag, timer eller jeres egen enhed — så prisberegneren passer til den måde I regner på.",
      <>En profilside på markedspladsen Serviceydere.dk med <a href="/software/booking-og-tilbud">online booking</a>, hvor kunder selv finder jer.</>,
      <>Åbne priser: <a href="/software/priser">289 kr./md.</a> med ruteplanlægning inkluderet, uden at du skal ringe for at få tallet.</>,
    ]},
    { heading: "Når I laver mere end vinduer", paragraphs: [
      "De fleste vinduespudsere sælger med tiden også algebehandling, solcellevask, tagrenderensning eller let rengøring. I Serviceydere er det bare nye services med egne priser og egen varighed — de lander i samme rute og på samme faktura.",
      "Det er den praktiske grund til at vælge et brancheuafhængigt system, selvom I i dag kun pudser vinduer.",
    ]},
    { heading: "Sådan vurderer du de to fair", ordered: [
      "Bed om en samlet månedspris for jeres faktiske antal medarbejdere, inklusive alle moduler.",
      "Læg opstartsgebyr og dataimport oveni og regn på første år.",
      "Prøv at planlægge en helt almindelig uge i begge systemer — det er der forskellen mærkes.",
      "Spørg, hvad der sker den dag I tilføjer en ny ydelse eller en ny by.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-software-til-vinduespudsere-2026">Oversigt: bedste software til vinduespudsere 2026</a>,
      <a href="/blog/serviceydere-vs-skvizbiz">Serviceydere vs. SkvizBiz</a>,
      <a href="/blog/serviceydere-vs-vintrip">Serviceydere vs. VinTrip</a>,
      <a href="/software/vinduespudser">Serviceydere til vinduespudsere</a>,
    ]},
  ],
});
export default Post;