/**
 * Én kilde til sandhed for funktionerne i Serviceydere.
 *
 * Bruges af:
 *  - den søgbare funktionsguide på /software/funktioner (hele systemet)
 *  - PDF-brugerguiden til ruteplanlæggeren (scripts/generate-planner-guide.py)
 *  - hjælpeteksterne (HelpTip) inde i selve ruteplanlæggeren
 *
 * REGEL: alt herinde skal kunne genfindes i UI'et. Skriv de faktiske
 * knap-navne og de faktiske trin — ingen ønsketænkning.
 */

/** Overordnet område — bruges som filter i funktionsguiden. */
export type FeatureArea =
  | "Ruteplanlægger"
  | "Aftaler og kunder"
  | "Services og priser"
  | "Medarbejdere"
  | "Medarbejder-app"
  | "Leads og livechat"
  | "Regnskab og betaling"
  | "Profil og markedsplads";

export const FEATURE_AREAS: FeatureArea[] = [
  "Ruteplanlægger",
  "Aftaler og kunder",
  "Services og priser",
  "Medarbejdere",
  "Medarbejder-app",
  "Leads og livechat",
  "Regnskab og betaling",
  "Profil og markedsplads",
];

/** Underinddeling inde i ruteplanlæggeren (bruges i PDF-guiden). */
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
  area: FeatureArea;
  /** Kun sat for funktioner i ruteplanlæggeren. */
  category?: PlannerFeatureCategory;
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
  // ───────────────────────── Ruteplanlægger ─────────────────────────
  {
    id: "drag-and-drop",
    title: "Træk aftaler ind på en rute",
    area: "Ruteplanlægger",
    category: "Planlægning",
    summary:
      "Fordel aftaler på rute, dag og rækkefølge ved at trække dem på plads — tiderne for resten af dagen opdateres med det samme.",
    example:
      "En hasteopgave i Odense kommer ind tirsdag. Du trækker den fra “Aftaler uden rute” ned mellem stop 2 og 3 på Peters rute og ser straks den nye ankomsttid på det sidste stop.",
    steps: [
      "Find aftalen i panelet “Aftaler uden rute”.",
      "Træk kortet ind på den ønskede rute eller dag.",
      "Slip på den plads i rækkefølgen, hvor stoppet skal ligge.",
      "Tjek den nye tid i forhåndsvisningen, og fortryd med ⌘Z hvis det ikke passer.",
    ],
    keywords: ["dnd", "flyt", "fordel", "tildel", "planlæg"],
  },
  {
    id: "unassigned-panel",
    title: "Aftaler uden rute",
    area: "Ruteplanlægger",
    category: "Planlægning",
    summary:
      "Alle aftaler der endnu ikke ligger på en rute samles i én liste med søgning, filtre og sideopdeling, så intet bliver glemt.",
    example:
      "Fredag eftermiddag står der 12 aftaler tilbage i listen. Du søger på “Aarhus” og lægger dem samlet ind på mandagens rute.",
    steps: [
      "Åbn panelet i højre side (eller som ark på mobil).",
      "Søg på kunde, adresse eller service — tryk “/” for at hoppe direkte i søgefeltet.",
      "Brug filtrene til at afgrænse listen.",
      "Træk aftalen ind på en rute, eller markér flere med Shift+klik og brug bjælken.",
    ],
    shortcut: "/",
    keywords: ["uplanlagt", "backlog", "liste", "filter", "søg"],
  },
  {
    id: "auto-distribute",
    title: "Auto-fordel aftaler",
    area: "Ruteplanlægger",
    category: "Planlægning",
    summary:
      "Systemet foreslår en fordeling af uplanlagte aftaler på ruter og dage — forslaget vises, før noget gemmes.",
    example:
      "20 aftaler uden rute fordeles på tre ruter hen over ugen, og du retter bagefter to stop manuelt.",
    steps: [
      "Tryk “A”, eller klik “Auto-fordel alle” / “Auto-fordel valgte” i panelet med aftaler uden rute.",
      "Gennemgå forslaget i forhåndsvisningen.",
      "Godkend, eller fortryd med ⌘Z hvis fordelingen ikke passer.",
    ],
    shortcut: "A",
    keywords: ["automatisk", "fordeling", "forslag"],
  },
  {
    id: "bulk-actions",
    title: "Handlinger på flere ad gangen",
    area: "Ruteplanlægger",
    category: "Planlægning",
    summary:
      "Markér flere aftaler i listen uden rute og læg dem samlet på en rute eller ryk deres opstartsdato — eller markér flere stop i kalenderen og slet dem samlet.",
    example:
      "Regnvejr onsdag: du markerer de udendørs aftaler i listen og bruger “Flyt opstartsdato” til at rykke dem til torsdag.",
    steps: [
      "I “Aftaler uden rute”: klik en aftale og hold Shift nede for at markere et interval.",
      "Brug bjælken der dukker op: “Tilføj til rute”, “Flyt opstartsdato” eller “Annullér”.",
      "I kalenderen: hold ⌘/Ctrl nede og klik flere stop — herefter kan de slettes samlet med “Slet valgte”.",
    ],
    shortcut: "⇧ + klik · ⌘/Ctrl + klik",
    keywords: ["bulk", "flere", "markér", "masseflyt"],
  },
  {
    id: "create-order",
    title: "Opret bestilling direkte i planlæggeren",
    area: "Ruteplanlægger",
    category: "Planlægning",
    summary:
      "Opret en manuel aftale uden at forlade planlægningen — med kunde, service, varighed, pris og evt. fast interval.",
    example:
      "En kunde ringer om en akut afrensning. Du opretter aftalen i planlæggeren, lægger den på dagens rute og sender bekræftelsen med det samme.",
    steps: [
      "Vælg “Opret bestilling manuelt” i menuen “Flere handlinger” i topbaren.",
      "Vælg eller opret kunden (CVR-opslag ved erhverv).",
      "Vælg service, varighed og evt. gentagelsesinterval.",
      "Gem — aftalen lander i “Aftaler uden rute”, klar til at blive planlagt.",
    ],
    keywords: ["ny ordre", "manuel", "opret", "booking", "cvr"],
  },
  {
    id: "create-route",
    title: "Opret og redigér ruter",
    area: "Ruteplanlægger",
    category: "Planlægning",
    summary:
      "En rute er en dag med en eller flere medarbejdere, et starttidspunkt og en række stop. Ruter oprettes, redigeres, flettes og slettes fra kalenderen.",
    example:
      "Du opretter “Nord – tirsdag” med start kl. 07:30 og fletter senere en næsten tom rute ind i den.",
    steps: [
      "Tryk “N” eller klik “Opret rute”, og vælg dato, medarbejdere og starttid.",
      "Træk stop ind på ruten.",
      "Åbn rutens menu for at redigere, flytte dato, flette eller slette.",
    ],
    shortcut: "N",
    keywords: ["rute", "opret", "flet", "merge", "slet"],
  },
  {
    id: "calendar-views",
    title: "Uge-, måneds- og agendavisning",
    area: "Ruteplanlægger",
    category: "Kalender og visninger",
    summary:
      "Skift mellem uge, måned og agenda alt efter om du planlægger detaljer eller ser strukturen i hele måneden.",
    example: "Måned bruges til at se hvornår de faste 14-dagesbesøg falder, uge til den daglige planlægning.",
    steps: [
      "Vælg visning i topbaren.",
      "Naviger med ← og → mellem perioder; “T” hopper til i dag.",
      "Klik på en dag for at se dagens ruter og stop.",
    ],
    shortcut: "← → · T",
    keywords: ["kalender", "uge", "måned", "agenda", "visning"],
  },
  {
    id: "day-timeline",
    title: "Dagen som tidslinje",
    area: "Ruteplanlægger",
    category: "Kalender og visninger",
    summary:
      "Se dagen fra kl. 06 til 20 i 15-minutters slots med én kolonne pr. rute, så du kan se hvor der reelt er plads til mere.",
    example:
      "Tidslinjen viser 90 minutters hul mellem kl. 11 og 12:30 på rute “Nord” — plads til et ekstra stop i samme område.",
    steps: [
      "Vælg “Vis dag som tidslinje” i menuen “Flere handlinger”, eller tryk “D”.",
      "Zoom mellem Kompakt, Normal og Bred.",
      "Træk stop mellem kolonnerne — der snappes til 15 minutter.",
    ],
    shortcut: "D",
    keywords: ["tidslinje", "timeline", "huller", "kapacitet", "zoom"],
  },
  {
    id: "density-theme",
    title: "Tæthed og mørk tilstand",
    area: "Ruteplanlægger",
    category: "Kalender og visninger",
    summary: "Vælg hvor kompakt kalenderen skal være, og skift til mørk tilstand. Valget huskes til næste gang.",
    example: "På en stor skærm bruger du den tætte visning, så hele ugen er synlig uden at scrolle.",
    steps: [
      "Åbn menuen “Flere handlinger” (⋯) i topbaren.",
      "Vælg tæthed.",
      "Slå mørk tilstand til eller fra.",
    ],
    keywords: ["density", "kompakt", "dark mode", "tema"],
  },
  {
    id: "map",
    title: "Kortvisning med stop og rækkefølge",
    area: "Ruteplanlægger",
    category: "Kort og kørsel",
    summary:
      "Ruterne tegnes på kortet med nummererede stop, så du kan se om dagen kører i en logisk sløjfe eller på kryds og tværs.",
    example: "Kortet afslører at stop 4 ligger 30 km fra de andre — du flytter det til fredagens rute i samme område.",
    steps: [
      "Skift til kortvisning i planlæggeren.",
      "Vælg rute eller dag for at fremhæve dens stop.",
      "Klik på en pin for at åbne stoppet.",
    ],
    keywords: ["kort", "map", "geokodning", "pins", "adresser"],
  },
  {
    id: "eta",
    title: "Kørselstid og ankomsttider",
    area: "Ruteplanlægger",
    category: "Kort og kørsel",
    summary:
      "Kørselstiden mellem adresserne beregnes ud fra stoppenes koordinater, så hvert stop får en realistisk ankomsttid — også mens du trækker.",
    example: "Mens du trækker et stop ind, viser forhåndsvisningen at dagen bliver 18 minutter længere.",
    steps: [
      "Læg stop ind på ruten — tiderne beregnes automatisk.",
      "Se ankomsttiden på hvert stop i rutens liste.",
      "Justér starttid eller rækkefølge, hvis dagen bliver for lang.",
    ],
    keywords: ["eta", "kørselstid", "ankomst", "transport"],
  },
  {
    id: "optimize",
    title: "Optimér rækkefølge",
    area: "Ruteplanlægger",
    category: "Kort og kørsel",
    summary:
      "Systemet foreslår en kortere rækkefølge på dagens stop. Forslaget vises først — du godkender selv.",
    example: "Optimering af tirsdagens otte stop giver en kortere rækkefølge med mindre kørsel mellem adresserne.",
    steps: [
      "Åbn ruten.",
      "Klik “Optimér rækkefølge” (eller tryk “O” når ruten er åben).",
      "Sammenlign før/efter i forhåndsvisningen.",
      "Godkend eller afvis forslaget.",
    ],
    shortcut: "O",
    keywords: ["optimering", "kortere rute", "besparelse", "rækkefølge"],
  },
  {
    id: "next-free-slot",
    title: "Næste ledige",
    area: "Ruteplanlægger",
    category: "Kort og kørsel",
    summary:
      "Springer kalenderen frem til den første kommende dag, hvor belastningen er under grænsen — hurtig navigation til en dag med luft.",
    example: "Du skal placere et ekstra besøg og klikker “Næste ledige”, som hopper til første dag med plads i kalenderen.",
    steps: [
      "Klik “Næste ledige” i topbaren.",
      "Kalenderen hopper til den første dag under belastningsgrænsen.",
      "Læg aftalen ind på dagen som normalt.",
    ],
    keywords: ["ledig tid", "kapacitet", "belastning", "navigation"],
  },
  {
    id: "recurring",
    title: "Faste aftaler og intervaller",
    area: "Ruteplanlægger",
    category: "Faste aftaler",
    summary:
      "Ugentlig, hver 14. dag, månedlig, kvartalsvis eller et frit interval — kommende besøg fremskrives automatisk i kalenderen.",
    example: "En vinduespudsningsaftale hver 6. uge oprettes én gang og dukker herefter op i kalenderen af sig selv.",
    steps: [
      "Sæt interval og varighed på aftalen.",
      "Vælg startdato.",
      "Kommende besøg vises som fremskrevne forekomster i kalenderen.",
    ],
    keywords: ["gentagelse", "interval", "fast kunde", "abonnement", "serie"],
  },
  {
    id: "series-scope",
    title: "Denne gang eller hele serien",
    area: "Ruteplanlægger",
    category: "Faste aftaler",
    summary:
      "Når du ændrer en fast aftale, spørger systemet om ændringen gælder dette besøg, alle fremtidige eller hele serien.",
    example: "Kunden vil rykkes en dag frem i juli, men ikke permanent — du vælger “kun denne gang”.",
    steps: [
      "Flyt eller redigér et stop i en serie.",
      "Vælg omfang i dialogen: denne, fremtidige eller alle.",
      "Se hvilke besøg der påvirkes, inden du gemmer.",
    ],
    keywords: ["serie", "scope", "kun denne", "fremtidige"],
  },
  {
    id: "pauses",
    title: "Pauser i en aftale",
    area: "Ruteplanlægger",
    category: "Faste aftaler",
    summary: "Sæt en fast aftale på pause i en periode — fx kundens sommerferie — uden at slette serien.",
    example: "Kontoret holder lukket i uge 29 og 30; aftalen sættes på pause og genoptages automatisk i uge 31.",
    steps: [
      "Åbn aftalen.",
      "Tilføj en pause med fra- og til-dato.",
      "Besøgene i perioden forsvinder fra kalenderen og kommer igen bagefter.",
    ],
    keywords: ["pause", "ferie", "midlertidig", "sæt i bero"],
  },
  {
    id: "sick-leave",
    title: "Meld medarbejder syg",
    area: "Ruteplanlægger",
    category: "Medarbejdere og fravær",
    summary:
      "En guide i tre trin dækker sygdom af: vælg medarbejder og periode, vælg handling pr. berørt rute, og bekræft.",
    example:
      "Peter melder sig syg mandag og tirsdag. To ruter overtages af Maria, én rute fordeles på holdet, og et enkelt stop frigives til omplanlægning.",
    steps: [
      "Vælg “Meld medarbejder syg” i menuen “Flere handlinger”.",
      "Vælg medarbejder og periode (genveje: I dag, I dag + i morgen, Resten af ugen, Hele næste uge).",
      "Vælg pr. rute: Erstat med kollega, Fordel på holdet, Frigiv aftalerne eller Flyt ruten til anden dato.",
      "Gennemgå opsummeringen med konflikter, og bekræft.",
    ],
    keywords: ["sygdom", "fravær", "afløser", "erstat", "omfordel"],
  },
  {
    id: "employee-availability",
    title: "Fravær, ferie og helligdage",
    area: "Ruteplanlægger",
    category: "Medarbejdere og fravær",
    summary:
      "Registreret fravær, virksomhedens lukkedage og danske helligdage markeres i kalenderen og advarer, hvis du lægger arbejde på dem.",
    example: "Du planlægger en rute på en helligdag — dagen er markeret, og du får en advarsel inden du gemmer.",
    steps: [
      "Registrér fravær på medarbejderen.",
      "Sæt virksomhedens lukkedage i indstillingerne.",
      "Kalenderen markerer dagene og advarer ved konflikt.",
    ],
    keywords: ["ferie", "helligdag", "lukkedag", "fri"],
  },
  {
    id: "employee-columns",
    title: "Én kolonne pr. rute",
    area: "Ruteplanlægger",
    category: "Medarbejdere og fravær",
    summary:
      "I dagsvisningen står ruterne side om side med tilknyttede medarbejdere, antal stop og status, så du kan udligne belastningen.",
    example: "Kolonnerne viser at én rute har 9 stop og en anden 3 — du trækker to stop over.",
    steps: [
      "Åbn dagen som tidslinje.",
      "Se antal stop og tilknyttede medarbejdere i kolonnens hoved.",
      "Træk stop mellem kolonnerne for at udligne.",
    ],
    keywords: ["medarbejder", "kolonner", "belastning", "fordeling"],
  },
  {
    id: "conflicts",
    title: "Konfliktadvarsler",
    area: "Ruteplanlægger",
    category: "Kvalitet og kontrol",
    summary:
      "Et banner øverst viser overbookede dage og ruter, hvor en påkrævet færdighed mangler. Overlap, fravær, helligdage og for lange dage markeres direkte på dagen og stoppet.",
    example: "Banneret melder om en overbooket torsdag, og et stop på ruten er markeret, fordi to besøg overlapper.",
    steps: [
      "Kig efter banneret øverst i kalenderen og markeringerne på dagene.",
      "Åbn den markerede dag eller rute.",
      "Ret rækkefølge, tid eller medarbejder.",
    ],
    keywords: ["konflikt", "overlap", "advarsel", "overbooking", "færdighed"],
  },
  {
    id: "simulation",
    title: "Forhåndsvisning før ændringer gemmes",
    area: "Ruteplanlægger",
    category: "Kvalitet og kontrol",
    summary:
      "Større ændringer simuleres først: du ser hvad der bliver flyttet, hvad det betyder for tiderne, og hvilke konflikter det giver.",
    example: "Inden en optimering vises et panel med de berørte stop og de nye tider.",
    steps: [
      "Start handlingen (optimér, auto-fordel, træk flere stop).",
      "Læs forhåndsvisningen.",
      "Godkend eller annullér.",
    ],
    keywords: ["simulering", "preview", "diff", "forhåndsvisning"],
  },
  {
    id: "undo",
    title: "Fortryd og gentag",
    area: "Ruteplanlægger",
    category: "Kvalitet og kontrol",
    summary: "Planlægningshandlinger kan fortrydes, så en fejltrækning ikke koster tid.",
    example: "Du trækker et stop forkert, trykker ⌘Z, og alt står som før.",
    steps: [
      "Tryk ⌘Z (Ctrl+Z) for at fortryde.",
      "⌘⇧Z — eller Ctrl+Y på Windows — gentager.",
      "Brug også “Fortryd” i beskeden der vises efter en handling.",
    ],
    shortcut: "⌘Z / ⌘⇧Z",
    keywords: ["fortryd", "undo", "redo", "gentag"],
  },
  {
    id: "history",
    title: "Historik på ruter",
    area: "Ruteplanlægger",
    category: "Kvalitet og kontrol",
    summary: "Se hvem der ændrede hvad og hvornår på en rute — nyttigt når flere planlægger.",
    example: "Rutens historik viser at et stop blev fjernet om eftermiddagen af kontoret, ikke af medarbejderen.",
    steps: ["Åbn rutens menu i kalenderen.", "Vælg historik.", "Gennemgå ændringerne kronologisk."],
    keywords: ["log", "historik", "audit", "ændringer"],
  },
  {
    id: "diagnostics",
    title: "Diagnostik af aftaler der ikke kan vises",
    area: "Ruteplanlægger",
    category: "Kvalitet og kontrol",
    summary:
      "Hvis en aftale ikke kan placeres i kalenderen — fx manglende adresse eller en serie der ikke er fremskrevet — vises en advarsel med årsagen.",
    example: "Advarslen viser tre aftaler uden brugbar adresse, som derfor ikke kan placeres på kortet.",
    steps: [
      "Advarslen vises automatisk øverst i kalenderen, når der findes aftaler der ikke kan vises.",
      "Klik på advarslen for at åbne diagnostikken.",
      "Gennemgå listen og ret dataene på aftalen eller kunden.",
    ],
    keywords: ["diagnostik", "fejl", "geokodning", "datakvalitet"],
  },
  {
    id: "print",
    title: "Print / PDF af dagen",
    area: "Ruteplanlægger",
    category: "Print, eksport og deling",
    summary: "Udskriv en ren køreseddel med dagens stop, adresser, tider og noter — eller gem den som PDF.",
    example: "Til en vikar uden login printes dagens rute på papir med adresser og noter.",
    steps: [
      "Tryk “P”, eller vælg “Print / PDF af dagen” i menuen “Flere handlinger”.",
      "Vælg dag og ruter.",
      "Klik “Print / Gem som PDF”.",
    ],
    shortcut: "P",
    keywords: ["print", "udskriv", "køreseddel", "pdf"],
  },
  {
    id: "send-to-app",
    title: "Ruten i medarbejder-appen",
    area: "Ruteplanlægger",
    category: "Print, eksport og deling",
    summary:
      "Så snart en medarbejder er tildelt et stop, er ruten synlig i medarbejder-appen — der er ingen separat udsendelse.",
    example: "Du tildeler morgendagens rute til Maria, og hun kan se stoppene på telefonen med det samme.",
    steps: [
      "Tildel medarbejdere til ruten eller de enkelte stop.",
      "Stoppet viser om det er synligt for medarbejderen.",
      "Medarbejderen ser dagen i appen og tjekker ind og ud undervejs.",
    ],
    keywords: ["app", "udsend", "medarbejder", "tildel"],
  },
  {
    id: "weather",
    title: "Vejr på dagen",
    area: "Ruteplanlægger",
    category: "Print, eksport og deling",
    summary: "Vejrudsigten vises på dagen i kalenderen, så udendørsarbejde kan flyttes inden det bliver et problem.",
    example: "Torsdag viser blæst og regn — de udendørs stop rykkes til fredag.",
    steps: ["Se vejrikonet på dagen i kalenderen.", "Hold musen over for detaljer.", "Flyt udendørs stop hvis nødvendigt."],
    keywords: ["vejr", "regn", "vind", "udendørs"],
  },
  {
    id: "shortcuts",
    title: "Tastaturgenveje",
    area: "Ruteplanlægger",
    category: "Print, eksport og deling",
    summary: "Planlægningen kan styres fra tastaturet — genvejsoversigten åbnes med “?”.",
    example: "T for i dag, ← → for forrige og næste periode, A for auto-fordel, P for print.",
    steps: ["Tryk “?” i planlæggeren.", "Find genvejen i oversigten.", "Genveje ignoreres mens du skriver i et felt."],
    shortcut: "?",
    keywords: ["genveje", "keyboard", "shortcuts", "hurtig"],
  },

  // ───────────────────────── Aftaler og kunder ─────────────────────────
  {
    id: "orders-overview",
    title: "Aftaler med smart sortering",
    area: "Aftaler og kunder",
    summary:
      "Alle bestillinger samlet ét sted med sortering som “Smart: Vigtigst først”, “Nyeste først” og “Næste udførelse”.",
    example: "Du starter dagen på fanen Aftaler med smart sortering og ser straks det, der haster mest.",
    steps: ["Åbn fanen “Aftaler”.", "Vælg sortering i dropdownen.", "Klik en aftale for at se og redigere detaljerne."],
    keywords: ["ordrer", "bestillinger", "sortering", "aftaler"],
  },
  {
    id: "orders-filters",
    title: "Filtre for forfaldne og kommende",
    area: "Aftaler og kunder",
    summary: "Klikbare filtre viser fx forfalden betaling og aftaler der skal udføres i denne uge.",
    example: "Filteret “Forfalden betaling” samler de kunder, der skal rykkes, i én liste.",
    steps: ["Åbn fanen “Aftaler”.", "Klik et filter øverst i listen.", "Klik filteret igen for at rydde det."],
    keywords: ["filter", "forfalden", "betaling", "denne uge"],
  },
  {
    id: "orders-create",
    title: "Opret bestilling",
    area: "Aftaler og kunder",
    summary: "Opret en aftale manuelt på en eksisterende eller ny kunde — med service, tid, pris og evt. fast interval.",
    example: "En kunde ringer, og du opretter aftalen direkte på fanen Aftaler i stedet for at notere den på papir.",
    steps: ["Klik “Opret bestilling”.", "Vælg kunde og service.", "Sæt dato, varighed og evt. interval, og gem."],
    keywords: ["opret", "bestilling", "manuel", "ordre"],
  },
  {
    id: "customers",
    title: "Kundekartotek",
    area: "Aftaler og kunder",
    summary:
      "Private og erhvervskunder med adresse, kontaktpersoner, dokumenter, omsætning og status som fast kunde, aktiv, pause eller engangskunde.",
    example: "Du åbner en erhvervskunde og ser to kontaktpersoner, den underskrevne aftale og årets omsætning.",
    steps: ["Åbn fanen “Kunder”.", "Filtrér på Privat eller Erhverv, eller søg.", "Åbn kunden for kontaktpersoner, dokumenter og historik."],
    keywords: ["crm", "kunder", "kontaktpersoner", "dokumenter", "erhverv"],
  },
  {
    id: "customer-import",
    title: "Import af eksisterende kunder",
    area: "Aftaler og kunder",
    summary:
      "Kunder kan importeres fra et regneark, hvor kolonnerne mappes til felterne i systemet. Serviceyderes support kan lave importen for jer.",
    example: "I sender jeres kundeliste som regneark, og kunder, adresser og kontaktoplysninger lægges ind.",
    steps: [
      "Klargør en fil med kunder (fx CSV fra jeres nuværende system).",
      "Kør importen, hvor kolonnerne mappes til felterne.",
      "Eller send filen til support — vi laver importen som en engangsydelse.",
    ],
    keywords: ["import", "csv", "regneark", "flytte kunder", "onboarding"],
  },

  // ───────────────────────── Services og priser ─────────────────────────
  {
    id: "service-catalog",
    title: "Servicekatalog",
    area: "Services og priser",
    summary: "Opret jeres egne services med pris, varighed og kategori — de vises både internt og på jeres profilside.",
    example: "“Hjemmerengøring” oprettes med pris pr. m² og en standardvarighed på to timer.",
    steps: ["Åbn fanen “Services”.", "Klik “Tilføj service”.", "Udfyld navn, kategori, pris og varighed, og gem."],
    keywords: ["services", "katalog", "ydelser", "pris"],
  },
  {
    id: "price-calculator",
    title: "Prisberegner med trin",
    area: "Services og priser",
    summary:
      "Byg en beregner på en service med enheder som m², stk. eller timer, så kunden får en pris med det samme.",
    example: "Vinduespudsning beregnes ud fra antal fag og etager i stedet for et løst prisspænd.",
    steps: ["Åbn servicen.", "Tilføj beregnertrin og vælg enhed og pris.", "Gem — beregneren vises på jeres profilside."],
    keywords: ["prisberegner", "m2", "enheder", "beregning", "tilbud"],
  },
  {
    id: "learned-durations",
    title: "Indlærte tider",
    area: "Services og priser",
    summary: "Systemet samler faktisk brugt tid pr. service, så planlægningen bliver mere realistisk over tid.",
    example: "Trappevask er sat til 45 minutter, men tager i praksis 60 — det fremgår af de indlærte tider.",
    steps: ["Åbn fanen “Services”.", "Se de indlærte tider på oversigten.", "Justér servicens standardvarighed hvis den er skæv."],
    keywords: ["varighed", "tid", "estimat", "erfaring"],
  },

  // ───────────────────────── Medarbejdere ─────────────────────────
  {
    id: "employees-create",
    title: "Tilføj medarbejder med login",
    area: "Medarbejdere",
    summary: "Opret en medarbejder med e-mail, og der oprettes automatisk en loginkonto til medarbejder-appen.",
    example: "Anna oprettes med sin e-mail og kan logge ind på appen og se sine ruter.",
    steps: ["Åbn fanen “Medarbejdere”.", "Klik “Tilføj medarbejder”.", "Udfyld navn, e-mail og rolle, og gem."],
    keywords: ["medarbejder", "login", "opret", "adgang"],
  },
  {
    id: "employee-skills",
    title: "Kompetencer på medarbejdere",
    area: "Medarbejdere",
    summary:
      "Tildel færdigheder til en medarbejder, så ruteplanlæggeren kan advare, når en rute kræver noget, medarbejderen ikke har.",
    example: "Kun to medarbejdere må køre liften — ruter med lift markeres, hvis de ikke er på.",
    steps: ["Åbn medarbejderen.", "Vælg kompetencer.", "Gem — planlæggeren bruger dem i konfliktadvarslerne."],
    keywords: ["kompetencer", "skills", "certifikat", "krav"],
  },
  {
    id: "employee-admin",
    title: "Nulstil adgang og deaktivér",
    area: "Medarbejdere",
    summary: "Nulstil password, send en besked eller deaktivér en medarbejder, der er stoppet — uden at slette historikken.",
    example: "En medarbejder stopper; du deaktiverer kontoen, men gamle ruter og timer bevares.",
    steps: ["Åbn menuen på medarbejderen.", "Vælg nulstil password, besked eller deaktivér.", "Bekræft."],
    keywords: ["password", "deaktiver", "adgang", "stoppet"],
  },
  {
    id: "employee-earnings",
    title: "Provision og indtjening pr. periode",
    area: "Medarbejdere",
    summary: "Se hvad hver medarbejder har udført og optjent i dag, denne uge, måneden, 6 måneder, året eller i alt.",
    example: "Ved månedsafslutning vælges “Denne måned” og provisionen aflæses pr. medarbejder.",
    steps: ["Åbn fanen “Medarbejdere”.", "Vælg periode øverst.", "Aflæs udførte opgaver og provision pr. medarbejder."],
    keywords: ["provision", "løn", "indtjening", "statistik"],
  },
  {
    id: "employee-photo",
    title: "Billede og farve på medarbejderen",
    area: "Medarbejdere",
    summary:
      "Upload et profilbillede og vælg en farve. Billedet vises stort, når du klikker avataren, og som stort preview i ruteplanlæggeren.",
    example: "Inden en nøgleudlevering tjekker kontoret det store billede for at være sikre på, hvem der kører ud.",
    steps: [
      "Åbn fanen “Medarbejdere” og klik medarbejderens avatar.",
      "Se det store billede i panelet — upload, skift eller fjern det.",
      "I ruteplanlæggeren: hold musen over avataren for at se billedet stort.",
    ],
    keywords: ["billede", "foto", "avatar", "farve", "identifikation"],
  },

  // ───────────────────────── Medarbejder-app ─────────────────────────
  {
    id: "app-my-day",
    title: "Min dag",
    area: "Medarbejder-app",
    summary: "Medarbejderen ser dagens rute med stop, adresser, tider og noter på telefonen.",
    example: "Om morgenen åbner Peter appen og ser dagens otte stop i rækkefølge.",
    steps: ["Log ind på medarbejder-appen.", "Åbn “Min dag”.", "Klik et stop for detaljer og navigation."],
    keywords: ["app", "min dag", "rute", "mobil"],
  },
  {
    id: "app-checkin",
    title: "Start dag og markér udført",
    area: "Medarbejder-app",
    summary: "Medarbejderen starter dagen og markerer hvert stop som udført — status opdateres i virksomhedspanelet med det samme.",
    example: "Peter markerer stop 3 udført kl. 10:42, og kontoret kan se det uden at ringe.",
    steps: ["Tryk “Start dag”.", "Åbn stoppet og registrér arbejdet.", "Markér stoppet udført og kør videre."],
    keywords: ["tjek ind", "udført", "status", "registrering"],
  },
  {
    id: "app-print",
    title: "Print rutelisten fra appen",
    area: "Medarbejder-app",
    summary: "Medarbejderen kan se en forhåndsvisning af dagens liste og printe den.",
    example: "En medarbejder uden mobildækning i kælderetagen printer dagens liste inden afgang.",
    steps: ["Åbn dagens rute i appen.", "Vælg forhåndsvis og udskriv.", "Print eller gem som PDF."],
    keywords: ["print", "liste", "papir"],
  },
  {
    id: "app-stats",
    title: "Egen statistik",
    area: "Medarbejder-app",
    summary: "Medarbejderen kan se sine egne udførte opgaver og tal i appen.",
    example: "Peter tjekker hvor mange opgaver han har udført i denne måned.",
    steps: ["Åbn appen.", "Vælg fanen med statistik.", "Vælg periode."],
    keywords: ["statistik", "tal", "opgaver"],
  },

  // ───────────────────────── Leads og livechat ─────────────────────────
  {
    id: "leads",
    title: "Leads fra markedspladsen",
    area: "Leads og livechat",
    summary:
      "Kundehenvendelser fra “Indhent 3 tilbud” lander i fanen Leads med status, noter og sortering. Slås til som gratis tilvalg i Indstillinger.",
    example: "En kunde i Odense søger vinduespudsning, og forespørgslen dukker op som et lead.",
    steps: ["Slå leads til i Indstillinger.", "Åbn fanen “Leads”.", "Svar, og markér leadet som vundet eller afvist."],
    keywords: ["leads", "tilbud", "forespørgsler", "markedsplads"],
  },
  {
    id: "lead-reply-draft",
    title: "Svarudkast til leads",
    area: "Leads og livechat",
    summary: "Systemet kan generere et udkast til svaret, som du retter til og sender som e-mail.",
    example: "Du genererer et udkast, retter prisen og sender svaret på under et minut.",
    steps: ["Åbn leadet.", "Klik “Generér udkast”.", "Ret teksten og klik “Send som e-mail”."],
    keywords: ["svar", "udkast", "ai", "email"],
  },
  {
    id: "livechat",
    title: "Livechat på profilsiden",
    area: "Leads og livechat",
    summary:
      "Besøgende kan skrive direkte fra jeres profilside. Samtaler kan filtreres, tildeles en medarbejder, besvares med skabeloner og genåbnes.",
    example: "En besøgende spørger om I kommer i 8000 Aarhus C, og I svarer med en skabelon.",
    steps: ["Slå livechat til i Indstillinger.", "Åbn fanen “Livechat”.", "Svar, tildel samtalen eller luk den."],
    keywords: ["chat", "livechat", "beskeder", "skabeloner"],
  },

  // ───────────────────────── Regnskab og betaling ─────────────────────────
  {
    id: "accounting-connect",
    title: "Regnskabsintegration til e-conomic og Dinero",
    area: "Regnskab og betaling",
    summary:
      "Forbind e-conomic eller Dinero, så bestillinger og fakturaer kan sendes videre automatisk. Tilvalg mod betaling.",
    example: "Når et stop markeres udført, ender fakturaen i e-conomic uden manuel indtastning.",
    steps: ["Åbn fanen “Regnskab”.", "Vælg e-conomic eller Dinero og forbind.", "Test forbindelsen, og gem."],
    keywords: ["e-conomic", "dinero", "bogføring", "integration", "faktura"],
  },
  {
    id: "accounting-status",
    title: "Status og fejl på synkronisering",
    area: "Regnskab og betaling",
    summary: "Se hvad der er sendt og hentet, hvad der venter, og hvilke poster der fejlede.",
    example: "En faktura fejler på grund af en manglende kundekonto — den ses i fejllisten og kan køres igen.",
    steps: ["Åbn fanen “Regnskab”.", "Se statusoversigten.", "Ret årsagen og kør den fejlede post igen."],
    keywords: ["synkronisering", "fejl", "status", "log"],
  },
  {
    id: "subscription",
    title: "Abonnement og betalingskort",
    area: "Regnskab og betaling",
    summary:
      "14 dages gratis prøve uden betalingskort. Vil I fortsætte, tilføjes kort under Indstillinger, hvor abonnementet også kan opskaleres.",
    example: "Efter prøveperioden tilføjer I kort og udvider med to ekstra medarbejderlogins.",
    steps: ["Åbn Indstillinger.", "Find pris og betaling.", "Tilføj betalingskort eller opskalér abonnementet."],
    keywords: ["abonnement", "betaling", "kort", "prøveperiode", "opsigelse"],
  },

  // ───────────────────────── Profil og markedsplads ─────────────────────────
  {
    id: "public-profile",
    title: "Virksomhedsprofil på serviceydere.dk",
    area: "Profil og markedsplads",
    summary: "Jeres offentlige side med logo, forsidebillede, beskrivelse, services, priser og anmeldelser.",
    example: "En kunde finder jer på markedspladsen, læser anmeldelserne og booker en service direkte.",
    steps: ["Åbn Indstillinger.", "Udfyld beskrivelse, logo, forsidebillede og webadresse.", "Se resultatet med “Se jeres side”."],
    keywords: ["profil", "side", "markedsplads", "synlighed", "seo"],
  },
  {
    id: "online-booking",
    title: "Book direkte fra profilsiden",
    area: "Profil og markedsplads",
    summary: "Kunder kan bestille en service direkte fra jeres profilside — bestillingen lander i systemet klar til planlægning.",
    example: "En kunde booker hovedrengøring søndag aften, og aftalen ligger klar mandag morgen.",
    steps: ["Opret jeres services med pris og varighed.", "Kunden vælger service og tidspunkt på profilsiden.", "Aftalen dukker op under “Aftaler”."],
    keywords: ["booking", "online", "bestilling", "kunder"],
  },
  {
    id: "reviews",
    title: "Anmeldelser",
    area: "Profil og markedsplads",
    summary: "Kundernes anmeldelser samles med gennemsnit og kan filtreres på antal stjerner og søges igennem.",
    example: "I filtrerer på 3 stjerner for at se, hvad der trækker gennemsnittet ned.",
    steps: ["Åbn fanen “Anmeldelser”.", "Filtrér på stjerner eller søg.", "Brug indsigten til at rette op på det, der går igen."],
    keywords: ["anmeldelser", "rating", "stjerner", "omdømme"],
  },
];

/** Kun funktionerne i ruteplanlæggeren — bruges af PDF-guiden og HelpTip. */
export const plannerOnlyFeatures = () =>
  PLANNER_FEATURES.filter((f) => f.area === "Ruteplanlægger");

export const featureById = (id: string) => PLANNER_FEATURES.find((f) => f.id === id);

/** Simpel fritekstsøgning på tværs af titel, resumé, eksempel, trin og nøgleord. */
export const searchPlannerFeatures = (query: string, features = PLANNER_FEATURES) => {
  const q = query.trim().toLowerCase();
  if (!q) return features;
  const terms = q.split(/\s+/);
  return features.filter((f) => {
    const haystack = [
      f.title, f.area, f.category ?? "", f.summary, f.example, f.shortcut ?? "",
      ...f.steps, ...(f.keywords ?? []),
    ].join(" ").toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
};

export const PLANNER_GUIDE_PDF_PATH = "/guides/serviceydere-ruteplanlaegger-brugerguide.pdf";
