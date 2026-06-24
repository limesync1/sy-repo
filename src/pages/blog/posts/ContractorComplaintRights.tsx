import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "dine-rettigheder-ved-fejl-i-haandvaerkerarbejde",
  keywords: "reklamation håndværker, mangler håndværkerarbejde, AB-Forbruger garanti, 1-års gennemgang, 5-års gennemgang, klage håndværker, byggeklagenævnet",
  faq: [
    { q: "Hvor lang tid har jeg til at reklamere?", a: "Køberetten giver 24 måneder til at gøre mangler gældende. AB-Forbruger giver herudover ret til 1- og 5-års gennemgang ved opgaver over 30.000 kr." },
    { q: "Skal reklamation være skriftlig?", a: "Ja, altid. Email er nok. Send straks du opdager fejlen — \"inden rimelig tid\" tolkes typisk som 2–4 uger. Vent ikke." },
    { q: "Hvad er Byggeriets Ankenævn?", a: "Et uafhængigt nævn der behandler tvister mellem forbruger og håndværker. Gebyret er 300 kr., og afgørelsen er bindende hvis håndværkeren er medlem af en relevant brancheforening." },
  ],
  sections: [
    { paragraphs: ["Når en håndværkeropgave er udført med mangler — fliser der falder af, maling der skaller, nyt køkken med skæve skuffer — har du som forbruger konkrete rettigheder. Men de aktiveres KUN hvis du reagerer rigtigt og i tide."] },
    { heading: "Dine 3 grundlæggende rettigheder", ordered: [
      "Afhjælpning — håndværkeren skal udbedre manglen uden ekstra omkostning.",
      "Omlevering — ved store fejl kan du kræve at arbejdet laves om.",
      "Forholdsmæssigt afslag eller ophævelse — hvis afhjælpning ikke sker eller fejler 2–3 gange.",
    ] },
    { heading: "Trin-for-trin: sådan reklamerer du", ordered: [
      "Dokumentér manglen (foto, video, dato).",
      "Send skriftlig reklamation pr. email med klar beskrivelse + frist (typisk 14 dage).",
      "Tilbagehold 5–10% af slutbetalingen indtil manglen er udbedret.",
      "Hvis håndværkeren afviser eller ignorerer: send rykker + anbefalet brev.",
      "Indbring sagen for Byggeriets Ankenævn (eller Forbrugerklagenævnet for ikke-byggeopgaver).",
      "Som sidste skridt: civilt søgsmål — typisk relevant ved beløb over 50.000 kr.",
    ] },
    { heading: "1- og 5-års gennemgang (AB-Forbruger)", paragraphs: ["Ved opgaver over 30.000 kr. inkl. moms har du KRAV på en 1-års og 5-års gennemgang. Det er din gratis chance for at få rettet sætningsskader, fugeskader, malingafskalning og lignende efter at materialerne har \"sat sig\". Skriv det i kalenderen — håndværkeren minder dig sjældent."] },
    { heading: "Hvad du IKKE må gøre", list: [
      "Hyre en anden håndværker uden først at give den oprindelige chancen for at udbedre",
      "Tilbageholde MERE end manglen koster at udbedre",
      "Vente flere måneder med at reklamere — så taber du retten",
      "Acceptere mundtligt at \"det er ok\" — alt skal være skriftligt",
    ] },
  ],
});