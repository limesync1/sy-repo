import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-skvizbiz",
  keywords: "serviceydere vs skvizbiz, skvizbiz alternativ, program til vinduespudsere, skvizbiz pris",
  faq: [
    { q: "Hvad er SkvizBiz?", a: "SkvizBiz er et dansk onlineprogram udviklet specifikt til vinduespudsere. Det samler kundestyring, planlægning, fakturering, betalingspåmindelser og regnskab, og er ifølge deres egen side registreret hos Erhvervsstyrelsen som godkendt standardbogføringssystem." },
    { q: "Hvad koster SkvizBiz?", a: "SkvizBiz oplyser priserne offentligt: en Lite-pakke med 1.495 kr. i oprettelse og 100 kr./md., og en fuld version med 3.495 kr. i oprettelse og 399 kr./md. Ekstra medarbejderlogins koster 0 kr., mens moduler som finans, prisberegner og API koster ekstra. Alle priser ekskl. moms." },
    { q: "Hvad koster Serviceydere til sammenligning?", a: "289 kr./md. i basis med ruteplanlægning inkluderet, plus 59 kr./md. pr. medarbejderlogin og 269 kr./md. for regnskabsintegration. Opstart 2.269 kr. Alle priser ekskl. moms." },
    { q: "Hvem er billigst?", a: "Det afhænger af antal medarbejdere. Er I mange, kan SkvizBiz blive billigere, fordi ekstra logins er gratis hos dem. Er I få, er Serviceydere billigere at komme i gang med og i månedlig drift." },
    { q: "Hvad er den reelle forskel?", a: "SkvizBiz er et administrationsprogram til én branche med indbygget bogføring. Serviceydere er et brancheuafhængigt driftssystem med visuel ruteplanlægning og en markedsplads, der giver nye kunder." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "SkvizBiz er et gennemarbejdet administrationsprogram til vinduespudsere med bogføring indbygget. Serviceydere er et driftssystem med visuel ruteplanlægning på tværs af brancher, kombineret med en markedsplads der skaffer nye kunder. Er bogføring i selve programmet det vigtigste for dig, er SkvizBiz stærkt. Er det ruterne og kundetilgangen, er vi det.",
    ]},
    { heading: "Det SkvizBiz gør godt — sagt lige ud", list: [
      "Bygget specifikt til vinduespudsning gennem mange år, i samarbejde med firmaer i branchen.",
      "Registreret hos Erhvervsstyrelsen som godkendt standardbogføringssystem, så regnskabet kan ligge i samme program.",
      "Ekstra medarbejderlogins koster 0 kr., hvilket er en fordel for større hold.",
      "Priserne står offentligt på deres side, hvilket langtfra alle i branchen gør.",
      "Gratis prøvemåned med telefonsupport.",
    ]},
    { heading: "Hvor Serviceydere er anderledes", list: [
      <>Visuel <a href="/software/ruteplanlaegger">ruteplanlægger</a> med drag & drop, beregnet kørselstid, ETA og advarsler ved dobbeltbooking, ferie og helligdage.</>,
      "Brancheuafhængigt: tilføjer I algebehandling, solcellevask eller rengøring, er det bare en ny service — ikke et nyt system.",
      <>Markedsplads: I får en profilside på Serviceydere.dk, hvor kunder selv finder og booker jer. Se <a href="/software/booking-og-tilbud">booking og tilbud</a>.</>,
      <><a href="/software/medarbejder-app">Medarbejder-app</a> med dagens rute, tjek ind og ud, noter og billeder.</>,
      "Bogføring sker via integration til E-conomic eller Dinero frem for i selve programmet.",
    ]},
    { heading: "Prisen afhænger af, hvor mange I er", paragraphs: [
      "Regnestykket vender forskelligt alt efter størrelse, og det skal man vide inden man vælger. Serviceydere koster 289 kr./md. plus 59 kr. pr. medarbejderlogin. SkvizBiz' fulde version koster 399 kr./md. med gratis logins.",
      "Er I én til to mand, er Serviceydere billigst i drift og har markant lavere opstart (2.269 kr. mod 3.495 kr. for SkvizBiz' fulde version). Er I otte mand, tipper regnestykket den anden vej, fordi vores logins koster penge og deres ikke gør. Det er værd at regne på med jeres egne tal.",
    ]},
    { heading: "Hvem skal vælge hvad", list: [
      "Vælg SkvizBiz hvis: I laver udelukkende vinduespudsning, vil have bogføringen i samme program, og er mange medarbejdere.",
      "Vælg Serviceydere hvis: ruteplanlægningen er jeres flaskehals, I laver eller vil lave flere ydelser, og I gerne vil have nye kunder gennem systemet.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-software-til-vinduespudsere-2026">Oversigt: bedste software til vinduespudsere 2026</a>,
      <a href="/blog/serviceydere-vs-fenster">Serviceydere vs. Fenster</a>,
      <a href="/software/vinduespudser">Serviceydere til vinduespudsere</a>,
      <a href="/software/priser">Vores priser</a>,
    ]},
  ],
});
export default Post;