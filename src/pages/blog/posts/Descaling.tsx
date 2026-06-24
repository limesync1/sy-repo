import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "afkalkning-komplet-guide",
  keywords: "afkalkning, afkalker, afkalk kaffemaskine, afkalk elkedel, afkalk bruser, afkalk toilet, citronsyre afkalkning, eddike afkalk, kalkfjerner",
  faq: [
    { q: "Eddike eller citronsyre?", a: "Citronsyre lugter mindre, smager mindre og er bedre til apparater du drikker af (kaffemaskine, elkedel). Eddike er stærkere og bedre til toilet og fliser." },
    { q: "Hvor ofte skal jeg afkalke?", a: "Kaffemaskine hver 2.–3. måned, elkedel hver måned ved hårdt vand, bruser månedligt, vaskemaskine 2 gange årligt, toilet efter behov." },
    { q: "Hvad er hårdt vand?", a: "I Danmark er meget vand hårdt (12–24 °dH). Du kan se din lokale hårdhed på dit vandværks hjemmeside. Over 12 °dH = afkalkning er nødvendigt." },
    { q: "Kan jeg bruge afkalker på krom?", a: "Ja, men kun kort tid (max 10 min). Krom tåler ikke længere eksponering. Skyl grundigt med vand bagefter." },
  ],
  sections: [
    { paragraphs: ["Kalk er ikke kun grimt — det reducerer effektiviteten af apparater med 20–30 % og kan ødelægge varmelegemer permanent. Faste rutiner sparer penge og forlænger levetiden."] },
    { heading: "Doseringer du kan huske", list: [
      "Citronsyre: 1 spsk pr. ½ liter vand",
      "Hvid eddike (32 %): 1 del eddike, 2 dele vand",
      "Husholdningseddike (5 %): bruges ufortyndet",
    ] },
    { heading: "Kaffemaskine", ordered: [
      "Hæld 5 dl vand + 1 spsk citronsyre i tanken.",
      "Start brygning halvvejs — sluk og lad stå 15 min.",
      "Fortsæt brygningen.",
      "Skyl med 2 fulde tanke rent vand.",
    ] },
    { heading: "Elkedel", paragraphs: [
      "Fyld med vand til max-streg + 2 spsk citronsyre. Bring i kog, lad stå 10 min, hæld ud, skyl 2 gange. Ved meget kalk: gentag."  ,
    ] },
    { heading: "Bruser og bruseslange", paragraphs: [
      "Læg brusehovedet i en pose med 5 dl 50/50 eddike og vand. Bind posen fast med elastik. Lad sidde 1–2 timer (max 4 ved hårdt kalk). Skyl grundigt.",
    ] },
    { heading: "Toilet", ordered: [
      "Slå vandet fra ved stophanen.",
      "Tøm kummen med en kop.",
      "Hæld 2 dl ren eddike eller 1 dl citronsyre + 5 dl vand i.",
      "Lad stå over natten.",
      "Skrub med toiletbørste, åbn vandet, skyl flere gange.",
    ] },
    { heading: "Vaskemaskine", paragraphs: [
      "Hæld 2 dl citronsyre direkte i tromlen. Kør tom 90 °C kogvask. Gør det 2 gange årligt — eller hver 3. måned ved hårdt vand."  ,
    ] },
    { heading: "Det skal du undgå", list: [
      "Eddike i kaffemaskinen — efterlader smag",
      "Saltsyre eller silvo på krom — ætser belægning",
      "Afkalker + klorbaseret rens samtidigt — danner giftige dampe",
      "Afkalk gummipakninger meget længe — bliver porøse",
    ] },
  ],
});