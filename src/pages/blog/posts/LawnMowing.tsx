import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "graesslaaning-guide",
  keywords: "græsslåning, hvor ofte græsslåning, klippehøjde græs, græsslåning pris, fast græsslåning",
  faq: [
    { q: "Hvor kort skal græsset slås?", a: "Omkring 4–5 cm er godt for de fleste plæner. Slå aldrig mere end en tredjedel af længden af ad gangen." },
    { q: "Hvad koster græsslåning?", a: "Prisen afhænger af plænens størrelse og hvor ofte. Se typiske intervaller i vores prisguide for haveservice." },
  ],
  sections: [
    { paragraphs: [
      "En tæt, grøn plæne kræver ikke meget — men den kræver regelmæssighed. Her er reglerne for, hvor tit og hvor kort græsset skal slås.",
    ] },
    { heading: "Hvor ofte?", list: [
      "Forår og forsommer: ca. én gang om ugen.",
      "Højsommer i tørke: sjældnere og lidt længere.",
      "Efterår: hver 14. dag, til væksten stopper.",
    ] },
    { heading: "Gode råd", list: [
      "Skarpe knive giver en sundere plæne.",
      "Slå ikke vådt græs.",
      "Lad gerne klippet ligge som gødning (mulching).",
    ] },
    { heading: "Fast aftale om græsslåning", list: [
      "Fast dag hver uge eller hver 14. dag.",
      "Kantklip og opsamling efter aftale.",
      "Mulighed for servicefradrag for private.",
    ] },
    { body: (
      <p>
        <a href="/priser/haveservice">Haveservice pris</a> · <a href="/guides/have">guide til havemand</a> · <a href="/blog/boligjob-fradrag-2026">servicefradrag 2026</a> · <a href="/tilbud">Indhent gratis tilbud</a> fra lokale firmaer.
      </p>
    ) },
  ],
});
