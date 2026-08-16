/**
 * Én kilde til sandhed for ruteplanlæggerens funktioner.
 *
 * Bruges af:
 *  - den søgbare funktionsguide på /software/funktioner
 *  - PDF-brugerguiden (scripts/generate-planner-guide.ts)
 *  - hjælpeteksterne (HelpTip) inde i selve ruteplanlæggeren
 *
 * Hold teksterne korte og konkrete: hvad funktionen gør, et eksempel og
 * de faktiske trin i UI'et.
 */

export type PlannerFeatureCategory =
  | "Planlægning"
  | "Kalender og visninger"
  | "Kort og kørsel"
  | "Faste aftaler"
  | "Medarbejdere og fravær"
  | "Kvalitet og kontrol"
  | "Print, eksport og deling";

export interface PlannerFeature {
  /** Stabilt id — bruges som anker (#id) og af HelpTip inde i planlæggeren. */
  id: string;
  title: string;
  category: PlannerFeatureCategory;
  /** Én sætning der forklarer funktionen. Bruges også som tooltip i UI'et. */
  summary: string;
  /** Konkret eksempel fra hverdagen. */
  example: string;
  /** Korte steps — sådan gør du. */
  steps: string[];
  /** Tastaturgenvej hvis funktionen har en. */
  shortcut?: string;
  /** Ekstra ord der skal kunne søges på. */
  keywords?: string[];
}

export const PLANNER_FEATURE_CATEGORIES: PlannerFeatureCategory[] = [
  "Planlægning",
  "Kalender og visninger",
  "Kort og kørsel",
  "Faste aftaler",
  "Medarbejdere og fravær",
  "Kvalitet og kontrol",
  "Print, eksport og deling",
];

export const PLANNER_FEATURES: PlannerFeature[] = [
  {
    id: "drag-and-drop",
    title: "Træk aftaler ind på en rute",
    category: "Planlægning",
    summary:
      "Fordel aftaler på medarbejder, dag og rækkefølge ved at trække dem på plads — ankomsttiderne for resten af dagen opdateres med det samme.",
    example:
      "En hasteopgave i Odense kommer ind tirsdag. Du trækker den fra “Aftaler uden rute” ned mellem stop 2 og 3 på Peters rute, og ser straks at han er 25 minutter senere fremme hos det sidste stop.",
    steps: [
      "Find aftalen i panelet “Aftaler uden rute”.",
      "Træk kortet ind på den ønskede rute eller medarbejderkolonne.",
      "Slip på den plads i rækkefølgen, hvor stoppet skal ligge.",
      "Tjek den nye ankomsttid i overlayet, og fortryd med ⌘Z hvis det ikke passer.",
    ],
    keywords: ["dnd", "flyt", "fordel", "tildel", "planlæg"],
  },
  {
    id: "unassigned-panel",
    title: "Aftaler uden rute",
    category: "Planlægning",
    summary:
      "Alle aftaler der endnu ikke ligger på en rute samles i én liste med søgning, filtre og sideopdeling, så intet bliver glemt.",
    example:
      "Fredag eftermiddag står der 12 aftaler tilbage i listen. Du filtrerer på postnummer 8000 og lægger dem samlet ind på mandagens rute i Aarhus.",
    steps: [
      "Åbn panelet i højre side (eller som ark på mobil).",
      "Søg på kunde, adresse eller service — tryk “/” for at hoppe direkte i søgefeltet.",
      "Brug filtrene til at afgrænse på dato, service eller område.",
      "Træk aftalen ind på en rute, eller markér flere og brug bulk-handlingerne.",
    ],
    shortcut: "/",
    keywords: ["uplanlagt", "backlog", "liste", "filter", "søg"],
  },
  {
    id: "auto-distribute",
    title: "Auto-fordel aftaler",
    category: "Planlægning",
    summary:
      "Systemet foreslår en fordeling af de uplanlagte aftaler på ledige medarbejdere og dage — du ser forslaget, før noget ændres.",
    example:
      "20 aftaler uden rute fordeles på tre medarbejdere hen over ugen på få sekunder, og du retter bagefter to stop manuelt.",
    steps: [
      "Tryk “A” eller vælg Auto-fordel i planlægningspanelet.",
      "Gennemgå forslaget i forhåndsvisningen — tilføjede stop er markeret.",
      "Godkend alt, eller fravælg enkelte stop inden du gemmer.",
    ],
    shortcut: "A",
    keywords: ["automatisk", "fordeling", "forslag"],
  },
  {
    id: "bulk-actions",
    title: "Masse-handlinger på flere aftaler",
    category: "Planlægning",
    summary:
      "Markér flere aftaler eller ruter og flyt dem samlet til en anden dag, en anden medarbejder eller en anden rute.",
    example:
      "Regnvejr onsdag: du markerer alle udendørs stop og rykker dem samlet til torsdag med to klik.",
    steps: [
      "Klik på ét stop, og hold Shift nede for at vælge et interval.",
      "Brug bjælken i bunden: Tilføj til rute, Flyt dato, Flyt til medarbejder eller Fjern fra rute.",
      "Bekræft i dialogen — konflikter vises inden ændringen gemmes.",
    ],
    shortcut: "⇧ + klik",
    keywords: ["bulk", "flere", "markér", "masseflyt"],
  },
  {
    id: "create-order",
    title: "Opret bestilling direkte i planlæggeren",
    category: "Planlægning",
    summary:
      "Opret en manuel aftale uden at forlade planlægningen — med kunde, service, varighed, pris og evt. fast interval.",
    example:
      "En kunde ringer om en akut afrensning. Du opretter aftalen i planlæggeren, lægger den på dagens rute og sender bekræftelsen med det samme.",
    steps: [
      "Tryk “Opret bestilling” i topbaren.",
      "Vælg eller opret kunden (CVR-opslag ved erhverv).",
      "Vælg service, varighed og evt. gentagelsesinterval.",
      "Gem — aftalen lander direkte i “Aftaler uden rute” eller på den valgte rute.",
    ],
    keywords: ["ny ordre", "manuel", "opret", "booking"],
  },
  {
    id: "create-route",
    title: "Opret og redigér ruter",
    category: "Planlægning",
    summary:
      "En rute er en dag med en medarbejder, et starttidspunkt og en række stop. Ruter oprettes, omdøbes, flettes og slettes fra kalenderen.",
    example:
      "Du opretter “Nord – tirsdag” med start kl. 07:30 på Peter, og fletter senere en næsten tom rute ind i den.",
    steps: [
      "Tryk “N” eller “Ny rute” og vælg dato, medarbejder og starttid.",
      "Træk stop ind på ruten.",
      "Højreklik på ruten for at omdøbe, duplikere, flytte dato eller slette.",
    ],
    shortcut: "N",
    keywords: ["rute", "opret", "flet", "merge", "slet"],
  },
  {
    id: "calendar-views",
    title: "Uge-, måneds- og agendavisning",
    category: "Kalender og visninger",
    summary:
      "Skift mellem uge, måned og agenda alt efter om du planlægger detaljer eller ser strukturen i hele måneden.",
    example:
      "Måned bruges til at se hvornår de faste 14-dagesbesøg falder, uge til den daglige planlægning.",
    steps: [
      "Vælg visning i topbaren.",
      "Naviger med ← og → mellem perioder, “T” hopper til i dag.",
      "Klik på en dag for at åbne dagspanelet med alle ruter og stop.",
    ],
    shortcut: "← → · T",
    keywords: ["kalender", "uge", "måned", "agenda", "visning"],
  },
  {
    id: "day-timeline",
    title: "Dagen som tidslinje",
    category: "Kalender og visninger",
    summary:
      "Se dagen time for time med kørsel, arbejdstid og huller, så du kan se hvor der reelt er plads til mere.",
    example:
      "Tidslinjen viser 90 minutters hul mellem kl. 11 og 12:30 hos Maria — plads til et ekstra stop i samme område.",
    steps: ["Tryk “D” eller vælg “Vis dag som tidslinje”.", "Vælg dagen i kalenderen.", "Klik på et stop for at åbne detaljerne."],
    shortcut: "D",
    keywords: ["tidslinje", "timeline", "huller", "kapacitet"],
  },
  {
    id: "density-theme",
    title: "Tæthed og mørk tilstand",
    category: "Kalender og visninger",
    summary:
      "Vælg luftig, standard eller tæt visning, og skift til mørk tilstand. Valget huskes til næste gang.",
    example: "På en stor skærm bruger du “tæt”, så hele ugen med fem medarbejdere er synlig uden at scrolle.",
    steps: ["Åbn “Mere”-menuen i topbaren.", "Vælg tæthed.", "Slå mørk tilstand til eller fra."],
    keywords: ["density", "kompakt", "dark mode", "tema"],
  },
  {
    id: "map",
    title: "Kortvisning med stop og rækkefølge",
    category: "Kort og kørsel",
    summary:
      "Ruterne tegnes på kortet med nummererede stop, så du kan se om dagen kører i en logisk sløjfe eller på kryds og tværs.",
    example:
      "Kortet afslører at stop 4 ligger 30 km fra de andre — du flytter det til fredagens rute i samme område.",
    steps: ["Åbn kortet i planlæggeren.", "Vælg rute eller dag for at fremhæve dens stop.", "Klik på en pin for at hoppe til stoppet i listen."],
    keywords: ["kort", "map", "geokodning", "pins", "adresser"],
  },
  {
    id: "eta",
    title: "Kørselstid og ankomsttider (ETA)",
    category: "Kort og kørsel",
    summary:
      "Kørselstiden mellem adresserne beregnes løbende, så hvert stop har en realistisk ankomsttid — også mens du trækker.",
    example: "Mens du trækker et stop ind, viser overlayet at hele ruten bliver 18 minutter længere.",
    steps: [
      "Læg stop ind på ruten — ETA beregnes automatisk.",
      "Se ankomsttiden på hvert stop i rutepanelet.",
      "Justér starttid eller rækkefølge hvis dagen bliver for lang.",
    ],
    keywords: ["eta", "kørselstid", "ankomst", "transport"],
  },
  {
    id: "optimize",
    title: "Ruteoptimering",
    category: "Kort og kørsel",
    summary:
      "Systemet foreslår en kortere rækkefølge på dagen. Forslaget vises først — planlæggeren godkender selv.",
    example: "Optimering af tirsdagens otte stop sparer 22 km og cirka 35 minutters kørsel.",
    steps: ["Åbn ruten.", "Tryk “O” eller “Optimér”.", "Sammenlign før/efter i forhåndsvisningen.", "Godkend eller afvis forslaget."],
    shortcut: "O",
    keywords: ["optimering", "kortere rute", "besparelse", "rækkefølge"],
  },
  {
    id: "next-free-slot",
    title: "Find næste ledige tid",
    category: "Kort og kørsel",
    summary:
      "Systemet finder den første dag og medarbejder, hvor en aftale kan ligge uden at skabe konflikt — og gerne tæt på de andre stop.",
    example: "En kunde spørger “hvornår kan I komme?”. Du får svaret på to sekunder: torsdag kl. 09:15.",
    steps: ["Åbn aftalen.", "Tryk “Næste ledige tid”.", "Godkend forslaget, eller bed om det næste."],
    keywords: ["ledig tid", "første ledige", "booking", "kapacitet"],
  },
  {
    id: "recurring",
    title: "Faste aftaler og intervaller",
    category: "Faste aftaler",
    summary:
      "Ugentlig, hver 14. dag, månedlig, kvartalsvis eller et frit interval — kommende besøg fremskrives automatisk.",
    example: "En vinduespudsningsaftale hver 6. uge oprettes én gang og dukker herefter op i kalenderen af sig selv.",
    steps: ["Sæt interval og varighed på aftalen.", "Vælg startdato.", "Kommende besøg vises som fremskrevne forekomster i kalenderen."],
    keywords: ["gentagelse", "interval", "fast kunde", "abonnement", "serie"],
  },
  {
    id: "series-scope",
    title: "Denne gang eller hele serien",
    category: "Faste aftaler",
    summary:
      "Når du ændrer en fast aftale, spørger systemet om ændringen gælder dette besøg, alle fremtidige eller hele serien.",
    example: "Kunden vil rykkes en dag frem i juli, men ikke permanent — du vælger “kun denne gang”.",
    steps: ["Flyt eller redigér et stop i en serie.", "Vælg omfang i dialogen.", "Se hvilke kommende besøg der bliver påvirket, inden du gemmer."],
    keywords: ["serie", "scope", "kun denne", "fremtidige"],
  },
  {
    id: "pauses",
    title: "Pauser i en aftale",
    category: "Faste aftaler",
    summary:
      "Sæt en fast aftale på pause i en periode — fx kundens sommerferie — uden at slette serien.",
    example: "Kontoret holder lukket i uge 29 og 30; aftalen sættes på pause og genoptages automatisk i uge 31.",
    steps: ["Åbn aftalen.", "Tilføj en pause med fra- og til-dato.", "Besøgene i perioden forsvinder fra kalenderen og kommer igen bagefter."],
    keywords: ["pause", "ferie", "midlertidig", "sæt i bero"],
  },
  {
    id: "sick-leave",
    title: "Meld medarbejder syg",
    category: "Medarbejdere og fravær",
    summary:
      "En guide i tre trin dækker sygdom af: vælg medarbejder og periode, vælg handling pr. berørt rute, og bekræft.",
    example:
      "Peter melder sig syg mandag og tirsdag. To ruter overtages af Maria, én rute fordeles på de øvrige, og et enkelt stop rykkes til onsdag.",
    steps: [
      "Åbn “Meld medarbejder syg” i planlæggeren.",
      "Vælg medarbejder samt fra- og til-dato (genveje for i dag, i morgen, resten af ugen).",
      "Vælg pr. rute: Erstat med kollega, Fordel på flere, Fjern fra rute eller Flyt dato.",
      "Se opsummeringen med konflikter, tilføj evt. en note, og bekræft.",
    ],
    keywords: ["sygdom", "fravær", "afløser", "erstat", "omfordel"],
  },
  {
    id: "employee-availability",
    title: "Fravær, ferie og helligdage",
    category: "Medarbejdere og fravær",
    summary:
      "Ferie, fridage, lukkedage og danske helligdage indgår i planlægningen og udløser advarsler, hvis du lægger arbejde på dem.",
    example: "Du forsøger at planlægge en rute Store Bededag — kalenderen markerer dagen og advarer inden du gemmer.",
    steps: ["Registrér fravær på medarbejderen.", "Sæt virksomhedens lukkedage i indstillinger.", "Kalenderen markerer dagene og advarer ved konflikt."],
    keywords: ["ferie", "helligdag", "lukkedag", "fri"],
  },
  {
    id: "employee-columns",
    title: "Medarbejderkolonner og tildeling",
    category: "Medarbejdere og fravær",
    summary:
      "Se dagen fordelt pr. medarbejder side om side med billede, antal stop og samlet arbejdstid.",
    example: "Kolonnerne viser at Maria har 9 stop og Peter 3 — du udligner ved at trække to stop over.",
    steps: ["Vælg dagsvisning med medarbejderkolonner.", "Træk stop mellem kolonnerne.", "Se belastningen i kolonnens hoved."],
    keywords: ["medarbejder", "kolonner", "belastning", "fordeling"],
  },
  {
    id: "conflicts",
    title: "Konfliktadvarsler",
    category: "Kvalitet og kontrol",
    summary:
      "Dobbeltbooking, for lidt tid mellem to adresser, fravær, helligdage og for lange dage markeres direkte i kalenderen.",
    example: "To stop kl. 10:00 hos samme medarbejder markeres rødt, og banneret foreslår at rykke det ene.",
    steps: ["Kig efter markeringer i kalenderen og konfliktbanneret øverst.", "Klik på advarslen for at hoppe til stoppet.", "Ret rækkefølge, tid eller medarbejder."],
    keywords: ["konflikt", "overlap", "advarsel", "dobbeltbooking"],
  },
  {
    id: "simulation",
    title: "Forhåndsvisning før ændringer gemmes",
    category: "Kvalitet og kontrol",
    summary:
      "Større ændringer simuleres først: du ser hvad der bliver flyttet, hvad det koster i tid, og hvilke konflikter det giver.",
    example: "Inden en flytning af hele onsdagens rute vises et diff-panel med de 7 berørte stop.",
    steps: ["Start handlingen (optimér, auto-fordel, flyt flere).", "Læs diff-panelet.", "Godkend eller annullér."],
    keywords: ["simulering", "preview", "diff", "forhåndsvisning"],
  },
  {
    id: "undo",
    title: "Fortryd og gentag",
    category: "Kvalitet og kontrol",
    summary: "Alle planlægningshandlinger kan fortrydes, så en fejltrækning ikke koster tid.",
    example: "Du trækker et stop forkert, trykker ⌘Z, og alt står som før.",
    steps: ["Tryk ⌘Z for at fortryde.", "⌘⇧Z gentager.", "Brug også “Fortryd” i bjælken der vises efter en handling."],
    shortcut: "⌘Z / ⌘⇧Z",
    keywords: ["fortryd", "undo", "redo", "gentag"],
  },
  {
    id: "history",
    title: "Historik på ruter",
    category: "Kvalitet og kontrol",
    summary: "Se hvem der ændrede hvad og hvornår på en rute — nyttigt når flere planlægger.",
    example: "Rutens historik viser at et stop blev fjernet kl. 14:12 af kontoret, ikke af medarbejderen.",
    steps: ["Åbn ruten.", "Vælg “Historik”.", "Gennemgå ændringerne kronologisk."],
    keywords: ["log", "historik", "audit", "ændringer"],
  },
  {
    id: "diagnostics",
    title: "Diagnostik og datatjek",
    category: "Kvalitet og kontrol",
    summary:
      "Et værktøj der finder skæve data: manglende adresser, stop uden geokodning, serier der ikke er fremskrevet.",
    example: "Diagnostikken viser tre kunder uden postnummer, som derfor ikke kan placeres på kortet.",
    steps: ["Åbn “Mere” → Diagnostik.", "Gennemgå listen af fund.", "Klik på et fund for at rette det direkte."],
    keywords: ["diagnostik", "fejl", "geokodning", "datakvalitet"],
  },
  {
    id: "print",
    title: "Print dagens ruter",
    category: "Print, eksport og deling",
    summary: "Udskriv en ren køreseddel pr. medarbejder med stop, adresser, tider og noter.",
    example: "Til en vikar uden login printes dagens rute på papir med adresser og noter.",
    steps: ["Tryk “P” eller vælg Print.", "Vælg dag og medarbejdere.", "Udskriv eller gem som PDF."],
    shortcut: "P",
    keywords: ["print", "udskriv", "køreseddel", "pdf"],
  },
  {
    id: "send-to-app",
    title: "Send ruten til medarbejder-appen",
    category: "Print, eksport og deling",
    summary:
      "Ruten er automatisk synlig i medarbejder-appen, og kan sendes som mail med dagens stop.",
    example: "Kl. 16 sender du morgendagens ruter ud, og medarbejderne har dem på telefonen inden fyraften.",
    steps: ["Vælg ruten eller dagen.", "Vælg “Send til medarbejder”.", "Medarbejderen ser stoppene i appen og tjekker ind og ud undervejs."],
    keywords: ["app", "mail", "udsend", "medarbejder"],
  },
  {
    id: "weather",
    title: "Vejr på dagen",
    category: "Print, eksport og deling",
    summary: "Vejrudsigten vises på dagen, så udendørsarbejde kan flyttes inden det bliver et problem.",
    example: "Torsdag viser 12 m/s og regn — stilladsarbejdet rykkes til fredag.",
    steps: ["Se vejrbadgen på dagen i kalenderen.", "Hold musen over for detaljer.", "Flyt udendørs stop hvis nødvendigt."],
    keywords: ["vejr", "regn", "vind", "udendørs"],
  },
  {
    id: "shortcuts",
    title: "Tastaturgenveje",
    category: "Print, eksport og deling",
    summary: "Hele planlægningen kan styres fra tastaturet — genvejsoversigten åbnes med “?”.",
    example: "T for i dag, J/K for næste og forrige dag, A for auto-fordel, P for print.",
    steps: ["Tryk “?” i planlæggeren.", "Find genvejen i oversigten.", "Genveje ignoreres mens du skriver i et felt."],
    shortcut: "?",
    keywords: ["genveje", "keyboard", "shortcuts", "hurtig"],
  },
];

export const featureById = (id: string) => PLANNER_FEATURES.find((f) => f.id === id);

/** Simpel fritekstsøgning på tværs af titel, resumé, eksempel, trin og nøgleord. */
export const searchPlannerFeatures = (query: string, features = PLANNER_FEATURES) => {
  const q = query.trim().toLowerCase();
  if (!q) return features;
  const terms = q.split(/\s+/);
  return features.filter((f) => {
    const haystack = [
      f.title, f.category, f.summary, f.example, f.shortcut ?? "",
      ...f.steps, ...(f.keywords ?? []),
    ].join(" ").toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
};

export const PLANNER_GUIDE_PDF_PATH = "/guides/serviceydere-ruteplanlaegger-brugerguide.pdf";
