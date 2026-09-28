import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-vintrip",
  keywords: "serviceydere vs vintrip, vintrip alternativ, vinduespudser program, ruteplanlægning vinduespudsning",
  faq: [
    { q: "Hvad er VinTrip?", a: "VinTrip er et dansk program rettet mod vinduespudsere, hvor ture, kunder og fakturering håndteres samlet." },
    { q: "Hvad koster VinTrip?", a: "Vi gengiver ikke priser, vi ikke kan verificere offentligt. Bed VinTrip om en samlet månedspris for jeres antal medarbejdere og hold den op mod vores åbne prisliste." },
    { q: "Hvad er den vigtigste forskel?", a: "Serviceydere er ikke bundet til vinduespudsning og indeholder en markedsplads, der sender nye kunder til virksomheden. Driften og kundetilgangen ligger altså i samme system." },
    { q: "Er Serviceydere sværere at gå i gang med?", a: "Nej. Der er 14 dages prøveperiode, og vi kan importere jeres eksisterende kunder og faste aftaler for 1.495 kr." },
    { q: "Hvad hvis vi kun laver vinduespudsning?", a: "Så virker begge dele. Forskellen viser sig, når I udvider med algebehandling, solceller eller rengøring — eller vil have kunder gennem systemet." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "VinTrip løser vinduespudserens tur og fakturering. Serviceydere løser hele driften for en servicevirksomhed med kørende medarbejdere — på tværs af brancher — og giver samtidig en profil på en markedsplads, hvor kunder finder jer.",
    ]},
    { heading: "Sådan planlægger man en tur hos os", list: [
      "Trækkes opgaverne rundt på dagen med drag & drop, og kørselstiden mellem stoppene regnes med undervejs.",
      "Faste aftaler skrives automatisk frem efter interval, så den tilbagevendende rute ikke skal bygges forfra hver gang.",
      "Systemet advarer ved dobbeltbooking, ferie og helligdage frem for at lade fejlen gå videre til medarbejderen.",
      "Medarbejderen ser dagens rute i appen, tjekker ind og ud og kan lægge noter og billeder på opgaven.",
    ]},
    { heading: "Det der ikke findes i et rent turprogram", list: [
      <>Markedsplads: forespørgsler og bookinger fra kunder i jeres område, se <a href="/software/booking-og-tilbud">booking og tilbud</a>.</>,
      "Flere brancher i samme virksomhed uden at skifte system.",
      "Frit definerbare prisenheder, så prisberegneren regner som I regner.",
      <>Regnskabsintegration til E-conomic og Dinero, se <a href="/software/fakturering-og-regnskab">fakturering og regnskab</a>.</>,
      <>Åbne priser på <a href="/software/priser">/software/priser</a>.</>,
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-software-til-vinduespudsere-2026">Oversigt: bedste software til vinduespudsere 2026</a>,
      <a href="/blog/serviceydere-vs-fenster">Serviceydere vs. Fenster</a>,
      <a href="/blog/serviceydere-vs-skvizbiz">Serviceydere vs. SkvizBiz</a>,
      <a href="/software/vinduespudser">Serviceydere til vinduespudsere</a>,
    ]},
  ],
});
export default Post;