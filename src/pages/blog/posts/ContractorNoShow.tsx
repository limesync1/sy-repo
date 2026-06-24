import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "hvis-haandvaerker-ikke-moeder-op",
  keywords: "håndværker møder ikke op, håndværker udebliver, ophævelse aftale håndværker, forsinket håndværker, dagbod håndværker, ny håndværker erstatning",
  faq: [
    { q: "Hvor lang forsinkelse må håndværkeren have?", a: "Ved aftalt slutdato: ingen automatisk \"slip\". Allerede 1 uges forsinkelse uden forklaring giver dig ret til skriftligt varsel om ophævelse hvis intet sker." },
    { q: "Kan jeg kræve dagbod?", a: "Kun hvis det er aftalt skriftligt. Typisk 0,2–0,5% af opgavens samlede pris pr. arbejdsdag. Skriv det ind i aftalen FØR opgaven starter." },
    { q: "Hvad hvis håndværkeren er forsvundet helt?", a: "Send anbefalet brev til CVR-adressen med 14-dages frist til at genoptage opgaven, ellers ophæves aftalen. Få ny håndværker og opkræv merprisen som erstatning." },
  ],
  sections: [
    { paragraphs: ["Håndværkeren der ikke møder op er en af de mest stressende situationer i en byggesag. Den gode nyhed: forbrugerlovgivningen er klart på din side, hvis du følger trinene rigtigt — og hurtigt."] },
    { heading: "Trin 1: Skriftlig påmindelse (dag 1–3)", paragraphs: ["Email eller SMS med tidsstempel: \"Vi havde aftalt opstart d. X. Du er ikke mødt. Bekræft venligst inden 48 timer hvornår arbejdet starter.\" Bevar tonen professionel — du skal kunne bruge beskeden senere."] },
    { heading: "Trin 2: Anbefalet brev med rimelig frist (dag 5–10)", paragraphs: ["Send anbefalet brev (eller email med læsekvittering) hvor du sætter en rimelig frist — typisk 14 dage — til at genoptage eller starte opgaven. Skriv eksplicit at aftalen ophæves hvis fristen overskrides."] },
    { heading: "Trin 3: Ophævelse + ny håndværker (efter fristen)", paragraphs: ["Send ophævelsesbrev. Find ny håndværker straks og dokumentér både den nye pris og dit tidsforbrug. Merprisen kan kræves som erstatning fra den oprindelige håndværker."] },
    { heading: "Hvad du KAN kræve i erstatning", list: [
      "Merprisen ved at få en anden til at færdiggøre opgaven",
      "Direkte tab (fx leje af alternativ bolig under forsinket badeværelsesrenovering)",
      "Dagbod hvis det er aftalt",
      "Tilbagebetaling af forudbetalinger der ikke er brugt på reelt arbejde",
    ] },
    { heading: "Hvad du IKKE bør gøre", list: [
      "Vente passivt mere end 1 uge \"for at være flink\"",
      "Sende kun mundtlige beskeder — alt skal være skriftligt",
      "Hyre ny håndværker uden først at sende ophævelsesbrev",
      "Betale aconto efter at forsinkelsen er startet",
    ] },
    { heading: "Hvis håndværkeren er gået konkurs", paragraphs: ["Tjek cvr.dk for status. Er firmaet under konkurs, skal du anmelde dit krav til bobestyreren — men forvent typisk at få lidt eller intet retur. Dette er præcis derfor at forudbetaling skal holdes på max 25–30%."] },
  ],
});