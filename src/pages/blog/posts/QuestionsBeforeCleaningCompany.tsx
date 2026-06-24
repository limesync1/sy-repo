import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "10-spoergsmaal-foer-du-booker-rengoeringsfirma",
  keywords: "spørgsmål rengøringsfirma, tjekliste rengøring, vælg rengøringsfirma, forsikring rengøring, kvalitetskontrol rengøring, reklamation rengøring",
  faq: [
    { q: "Skal et rengøringsfirma være CVR-registreret?", a: "Ja, hvis du vil bruge BoligJob-fradraget OG hvis du vil have garanti og forsikring. Et CVR-firma kan også indberette timer direkte til SKAT." },
    { q: "Hvilken forsikring skal firmaet have?", a: "Erhvervsansvarsforsikring der dækker skade på dit hjem og ting (typisk 5–10 mio. kr.) samt arbejdsskadeforsikring for medarbejderne." },
    { q: "Må jeg kræve samme person hver gang?", a: "Du må gerne ønske det — og det er ofte muligt ved fast aftale. Det giver bedre kvalitet fordi rengøringsassistenten lærer hjemmet at kende." },
  ],
  sections: [
    { paragraphs: ["Et godt rengøringsfirma har ikke noget imod at svare på spørgsmål — det er faktisk et godt tegn hvis de selv stiller spørgsmål tilbage. De følgende 10 spørgsmål afslører på 5 minutter om firmaet er professionelt eller du skal gå videre."] },
    { heading: "De 10 spørgsmål — print eller skriv af", ordered: [
      "Er I CVR-registreret, og hvad er jeres CVR-nummer?",
      "Har I erhvervsansvarsforsikring — og hvad er forsikringssummen?",
      "Er medarbejderne fastansatte eller løsarbejdere?",
      "Hvem rengør hos mig — den samme hver gang, eller skiftende personale?",
      "Hvilke rengøringsmidler bruger I, og er de svanemærkede?",
      "Hvad sker der hvis den faste medarbejder er syg?",
      "Hvordan håndterer I reklamationer og fejl?",
      "Indberetter I timer direkte til SKAT så jeg får BoligJob-fradrag?",
      "Er der opsigelse på aftalen, og hvor lang?",
      "Kan I sende mig 2–3 referencer fra eksisterende kunder?",
    ] },
    { heading: "Røde flag i svarene", list: [
      "Tøven ved CVR-spørgsmålet eller \"vi sender det senere\"",
      "Ingen erhvervsansvarsforsikring eller meget lav sum (< 2 mio. kr.)",
      "Kun kontant betaling eller MobilePay til privat nummer",
      "Skifter medarbejder hver gang uden forklaring",
      "Vil ikke give referencer",
    ] },
    { heading: "Bonus: spørg hvad de ikke gør", paragraphs: ["De fleste konflikter kommer af forventningsafstemning. Spørg eksplicit: \"Vasker I op? Skifter I sengetøj? Tørrer I støv af på højeste hylde? Renser I gardiner?\" — så ved du præcis hvad der er med."] },
  ],
});