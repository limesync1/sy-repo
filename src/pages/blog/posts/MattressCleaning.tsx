import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rens-af-madras-komplet-guide",
  keywords: "rens madras, rengøring madras, pletter på madras, hovedrengøring, hjem",
  faq: [
    { q: "Hvor ofte skal en madras renses?", a: "Grundig rens 2 gange årligt. Støvsug ugentligt, vend hver 3. måned. Pletrens straks ved spild eller uheld." },
    { q: "Kan jeg vaske en madras med vand?", a: "Nej — madrasser tørrer ikke ordentligt og udvikler skimmel. Brug altid lokalrens og minimalt fugt." },
    { q: "Hvordan fjerner jeg lugt fra en madras?", a: "Drys et tykt lag natron over, lad det ligge 8–12 timer (gerne natten over), støvsug grundigt. Gentag 2–3 gange hvis nødvendigt." },
    { q: "Virker damprenser på madras?", a: "Ja, hvis du tørrer den helt bagefter — gerne 24 timer med vinduer åbne og ventilator. Bedst i sommerhalvåret." },
    { q: "Hvornår skal en madras udskiftes?", a: "Typisk 8–10 år. Tegn: synlige fordybninger, knirken, dårlig søvn, lugt der ikke forsvinder med rensning." },
  ],
  sections: [
    { heading: "Månedlig vedligehold", ordered: [
      "Tag sengetøj af.",
      "Støvsug hele madrassen — også sider og kanter.",
      "Vend eller drej madrassen (hver 3. måned).",
      "Luft i 30–60 min før nyt sengetøj.",
    ]},
    { heading: "Halvårlig dybderens", ordered: [
      "Støvsug grundigt med tæppe-mundstykke.",
      "Drys natron generøst, masser let ind med en tør børste.",
      "Lad stå minimum 8 timer (gerne 24).",
      "Støvsug af i langsomme baner.",
      "Behandl evt. pletter punktvis (se nedenfor).",
      "Luft i mindst 4 timer før sengetøj på igen.",
    ]},
    { heading: "Plet for plet", list: [
      "Urin (barn/voksen): brintoverilte 3% + 1 tsk opvaskemiddel + 2 spsk natron, dup på, lad tørre, støvsug.",
      "Blod: koldt vand + brintoverilte, dup op, aldrig varmt.",
      "Sved (gulning): blanding af brintoverilte og natron til pasta, smør, lad tørre.",
      "Kaffe/vin: koldt vand straks, dup med klud, derefter natronpasta.",
      "Opkast: skrab forsigtigt af, dup med koldt vand + opvaskemiddel, derefter eddike-spray (1:4).",
    ]},
    { heading: "Forebyggelse", list: [
      "Brug altid madrasbetræk — vaskbart, helst med lynlås.",
      "Vask sengetøj ved 60° hver 1–2 uger.",
      "Hold soveværelse luftfugtighed under 60% (åbn vindue om morgenen).",
      "Tag betrækket af 1× månedligt og luft madrassen.",
    ]},
  ]
});

export default Post;
