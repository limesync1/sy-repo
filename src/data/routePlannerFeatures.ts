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
  // Ruteplanlægger: kontrolleret mod de aktuelle komponenter og menuer.
  {
    "id": "drag-and-drop",
    "title": "Træk aftaler ind på en rute",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Fordel aftaler på rute, dag og rækkefølge ved at trække dem på plads — tiderne for resten af dagen opdateres med det samme.",
    "example": "En hasteopgave i Odense kommer ind tirsdag. Du trækker den fra “Aftaler uden rute” ned mellem stop 2 og 3 på Peters rute og ser straks den nye ankomsttid på det sidste stop.",
    "steps": [
      "Find aftalen i panelet “Aftaler uden rute”.",
      "Træk kortet ind på den ønskede rute eller dag.",
      "Slip på den plads i rækkefølgen, hvor stoppet skal ligge.",
      "Tjek den nye tid i forhåndsvisningen, og fortryd med Ctrl/Command + Z hvis det ikke passer."
    ],
    "keywords": [
      "dnd",
      "flyt",
      "fordel",
      "tildel",
      "planlæg"
    ]
  },
  {
    "id": "unassigned-panel",
    "title": "Aftaler uden rute",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Find aftaler, som mangler en rute. Brug søgning og filtre.",
    "example": "Fredag eftermiddag står der 12 aftaler tilbage i listen. Du søger på “Aarhus” og lægger dem samlet ind på mandagens rute.",
    "steps": [
      "Find “Aftaler uden rute” i venstre side. På mobil åbner du listen med knappen til aftaler uden rute.",
      "Søg på kunde, adresse eller service. Brug / som genvej.",
      "Klik for at vælge en aftale. Brug Shift+klik til et interval.",
      "Træk aftalen til kalenderen, eller brug “Tilføj til rute”."
    ],
    "shortcut": "/",
    "keywords": [
      "uplanlagt",
      "backlog",
      "liste",
      "filter",
      "søg"
    ]
  },
  {
    "id": "auto-distribute",
    "title": "Auto-fordel aftaler",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Systemet foreslår en fordeling af uplanlagte aftaler på ruter og dage — forslaget vises, før noget gemmes.",
    "example": "20 aftaler uden rute fordeles på tre ruter hen over ugen, og du retter bagefter to stop manuelt.",
    "steps": [
      "Tryk “A”, eller klik “Auto-fordel alle” / “Auto-fordel valgte” i panelet med aftaler uden rute.",
      "Gennemgå forslaget i forhåndsvisningen.",
      "Godkend, eller fortryd med Ctrl/Command + Z hvis fordelingen ikke passer."
    ],
    "shortcut": "A",
    "keywords": [
      "automatisk",
      "fordeling",
      "forslag"
    ]
  },
  {
    "id": "bulk-actions",
    "title": "Handlinger på flere ad gangen",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Vælg flere aftaler uden rute. Tilføj dem til en rute, eller flyt deres opstartsdato.",
    "example": "Regnvejr onsdag: du markerer de udendørs aftaler i listen og bruger “Flyt opstartsdato” til at rykke dem til torsdag.",
    "steps": [
      "Klik på aftalerne i “Aftaler uden rute”. Brug Shift+klik til et interval.",
      "Vælg “Tilføj til rute”. Vælg rute og dato i vinduet.",
      "Vælg i stedet “Flyt opstartsdato”, hvis aftalerne skal starte senere.",
      "Kontrollér valget, og bekræft."
    ],
    "shortcut": "Shift + klik",
    "keywords": [
      "bulk",
      "flere",
      "markér",
      "masseflyt"
    ]
  },
  {
    "id": "create-order",
    "title": "Opret bestilling direkte i planlæggeren",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Opret en bestilling med kunde, service og en foreløbig opstartsdato.",
    "example": "En kunde ringer om vinduespudsning. Du opretter bestillingen og planlægger ruten bagefter.",
    "steps": [
      "Klik “Opret bestilling” øverst i planlæggeren.",
      "Udfyld kunden. Søg på e-mail for at hente en eksisterende kunde.",
      "Vælg en eller flere services i servicevælgeren. Tilpas antal, timer og interval.",
      "Vælg “Foreløbig opstartsdato”. Kontrollér bestillingen, og gem."
    ],
    "keywords": [
      "ny ordre",
      "manuel",
      "opret",
      "booking",
      "cvr"
    ]
  },
  {
    "id": "create-route",
    "title": "Opret og redigér ruter",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "En rute er en dag med en eller flere medarbejdere, et starttidspunkt og en række stop. Ruter oprettes, redigeres, flettes og slettes fra kalenderen.",
    "example": "Du opretter “Nord – tirsdag” med start kl. 07:30 og fletter senere en næsten tom rute ind i den.",
    "steps": [
      "Tryk “N” eller klik “Opret rute”, og vælg dato, medarbejdere og starttid.",
      "Træk stop ind på ruten.",
      "Åbn rutens menu for at redigere, flytte dato, flette eller slette."
    ],
    "shortcut": "N",
    "keywords": [
      "rute",
      "opret",
      "flet",
      "merge",
      "slet"
    ]
  },
  {
    "id": "calendar-views",
    "title": "Uge-, måneds- og agendavisning",
    "area": "Ruteplanlægger",
    "category": "Kalender og visninger",
    "summary": "Skift mellem uge, måned og agenda alt efter om du planlægger detaljer eller ser strukturen i hele måneden.",
    "example": "Måned bruges til at se hvornår de faste 14-dagesbesøg falder, uge til den daglige planlægning.",
    "steps": [
      "Vælg visning i topbaren.",
      "Naviger med ← og → mellem perioder; “T” hopper til i dag.",
      "Klik på en dag for at se dagens ruter og stop."
    ],
    "shortcut": "← → · T",
    "keywords": [
      "kalender",
      "uge",
      "måned",
      "agenda",
      "visning"
    ]
  },
  {
    "id": "day-timeline",
    "title": "Vis hele dagen: dagens tidslinje",
    "area": "Ruteplanlægger",
    "category": "Kalender og visninger",
    "summary": "Se dagens stop i én ordnet liste. Listen viser kunde, service, adresse og rute.",
    "example": "Du gennemgår dagens adresser, før medarbejderne kører.",
    "steps": [
      "Vælg “Visning” og “Vis dagen som tidslinje”. Du kan også trykke D.",
      "Se dato, antal stop og antal ruter.",
      "Læs dagens stop i rækkefølge. Luk vinduet for at vende tilbage."
    ],
    "shortcut": "D",
    "keywords": [
      "tidslinje",
      "timeline",
      "huller",
      "kapacitet",
      "zoom"
    ]
  },
  {
    "id": "density-theme",
    "title": "Tæthed og mørk tilstand",
    "area": "Ruteplanlægger",
    "category": "Kalender og visninger",
    "summary": "Vælg hvor kompakt kalenderen skal være, og skift til mørk tilstand. Valget huskes til næste gang.",
    "example": "På en stor skærm bruger du den tætte visning, så hele ugen er synlig uden at scrolle.",
    "steps": [
      "Åbn “Visning” i topbaren.",
      "Vælg tæthed.",
      "Slå mørk tilstand til eller fra."
    ],
    "keywords": [
      "density",
      "kompakt",
      "dark mode",
      "tema"
    ]
  },
  {
    "id": "map",
    "title": "Kortvisning med stop og rækkefølge",
    "area": "Ruteplanlægger",
    "category": "Kort og kørsel",
    "summary": "Ruterne tegnes på kortet med nummererede stop, så du kan se om dagen kører i en logisk sløjfe eller på kryds og tværs.",
    "example": "Kortet afslører at stop 4 ligger 30 km fra de andre — du flytter det til fredagens rute i samme område.",
    "steps": [
      "Skift til kortvisning i planlæggeren.",
      "Vælg rute eller dag for at fremhæve dens stop.",
      "Klik på en pin for at åbne stoppet."
    ],
    "keywords": [
      "kort",
      "map",
      "geokodning",
      "pins",
      "adresser"
    ]
  },
  {
    "id": "eta",
    "title": "Kørselstid og ankomsttider",
    "area": "Ruteplanlægger",
    "category": "Kort og kørsel",
    "summary": "Kørselstiden mellem adresserne beregnes ud fra stoppenes koordinater, så hvert stop får en realistisk ankomsttid — også mens du trækker.",
    "example": "Mens du trækker et stop ind, viser forhåndsvisningen at dagen bliver 18 minutter længere.",
    "steps": [
      "Læg stop ind på ruten — tiderne beregnes automatisk.",
      "Se ankomsttiden på hvert stop i rutens liste.",
      "Justér starttid eller rækkefølge, hvis dagen bliver for lang."
    ],
    "keywords": [
      "eta",
      "kørselstid",
      "ankomst",
      "transport"
    ]
  },
  {
    "id": "optimize",
    "title": "Optimér rute",
    "area": "Ruteplanlægger",
    "category": "Kort og kørsel",
    "summary": "Beregn en ny rækkefølge for stoppene på én rute.",
    "example": "Optimering af tirsdagens otte stop giver en kortere rækkefølge med mindre kørsel mellem adresserne.",
    "steps": [
      "Åbn rutens menu, og vælg “Optimér rute”. Du kan også trykke O med en åben rute.",
      "Se resultatet i vinduet “Optimér rute”.",
      "Kontrollér rækkefølgen og køretiden."
    ],
    "shortcut": "O",
    "keywords": [
      "optimering",
      "kortere rute",
      "besparelse",
      "rækkefølge"
    ]
  },
  {
    "id": "recurring",
    "title": "Faste aftaler og intervaller",
    "area": "Ruteplanlægger",
    "category": "Faste aftaler",
    "summary": "Ugentlig, hver 14. dag, månedlig, kvartalsvis eller et frit interval — kommende besøg fremskrives automatisk i kalenderen.",
    "example": "En vinduespudsningsaftale hver 6. uge oprettes én gang og dukker herefter op i kalenderen af sig selv.",
    "steps": [
      "Sæt interval og varighed på aftalen.",
      "Vælg startdato.",
      "Kommende besøg vises som fremskrevne forekomster i kalenderen."
    ],
    "keywords": [
      "gentagelse",
      "interval",
      "fast kunde",
      "abonnement",
      "serie"
    ]
  },
  {
    "id": "series-scope",
    "title": "Denne gang eller hele serien",
    "area": "Ruteplanlægger",
    "category": "Faste aftaler",
    "summary": "Når du ændrer en fast aftale, spørger systemet om ændringen gælder dette besøg, alle fremtidige eller hele serien.",
    "example": "Kunden vil rykkes en dag frem i juli, men ikke permanent — du vælger “kun denne gang”.",
    "steps": [
      "Flyt eller redigér et stop i en serie.",
      "Vælg omfang i dialogen: denne, fremtidige eller alle.",
      "Se hvilke besøg der påvirkes, inden du gemmer."
    ],
    "keywords": [
      "serie",
      "scope",
      "kun denne",
      "fremtidige"
    ]
  },
  {
    "id": "sick-leave",
    "title": "Meld medarbejder syg",
    "area": "Ruteplanlægger",
    "category": "Medarbejdere og fravær",
    "summary": "En guide i tre trin dækker sygdom af: vælg medarbejder og periode, vælg handling pr. berørt rute, og bekræft.",
    "example": "Peter melder sig syg mandag og tirsdag. To ruter overtages af Maria, én rute fordeles på holdet, og et enkelt stop frigives til omplanlægning.",
    "steps": [
      "Åbn “Mere”, og vælg “Meld medarbejder syg”.",
      "Vælg medarbejder og periode.",
      "Vælg en handling for hver berørt rute.",
      "Gennemgå opsummeringen og eventuelle konflikter. Bekræft."
    ],
    "keywords": [
      "sygdom",
      "fravær",
      "afløser",
      "erstat",
      "omfordel"
    ]
  },
  {
    "id": "employee-availability",
    "title": "Fravær, ferie og helligdage",
    "area": "Ruteplanlægger",
    "category": "Medarbejdere og fravær",
    "summary": "Registreret fravær, virksomhedens lukkedage og danske helligdage markeres i kalenderen og advarer, hvis du lægger arbejde på dem.",
    "example": "Du planlægger en rute på en helligdag — dagen er markeret, og du får en advarsel inden du gemmer.",
    "steps": [
      "Registrér fravær på medarbejderen.",
      "Sæt virksomhedens lukkedage i indstillingerne.",
      "Kalenderen markerer dagene og advarer ved konflikt."
    ],
    "keywords": [
      "ferie",
      "helligdag",
      "lukkedag",
      "fri"
    ]
  },
  {
    "id": "conflicts",
    "title": "Konfliktadvarsler",
    "area": "Ruteplanlægger",
    "category": "Kvalitet og kontrol",
    "summary": "Et banner øverst viser overbookede dage og ruter, hvor en påkrævet færdighed mangler. Overlap, fravær, helligdage og for lange dage markeres direkte på dagen og stoppet.",
    "example": "Banneret melder om en overbooket torsdag, og et stop på ruten er markeret, fordi to besøg overlapper.",
    "steps": [
      "Kig efter banneret øverst i kalenderen og markeringerne på dagene.",
      "Åbn den markerede dag eller rute.",
      "Ret rækkefølge, tid eller medarbejder."
    ],
    "keywords": [
      "konflikt",
      "overlap",
      "advarsel",
      "overbooking",
      "færdighed"
    ]
  },
  {
    "id": "simulation",
    "title": "Forhåndsvisning før ændringer gemmes",
    "area": "Ruteplanlægger",
    "category": "Kvalitet og kontrol",
    "summary": "Større ændringer simuleres først: du ser hvad der bliver flyttet, hvad det betyder for tiderne, og hvilke konflikter det giver.",
    "example": "Inden en optimering vises et panel med de berørte stop og de nye tider.",
    "steps": [
      "Start handlingen (optimér, auto-fordel, træk flere stop).",
      "Læs forhåndsvisningen.",
      "Godkend eller annullér."
    ],
    "keywords": [
      "simulering",
      "preview",
      "diff",
      "forhåndsvisning"
    ]
  },
  {
    "id": "undo",
    "title": "Fortryd og gentag",
    "area": "Ruteplanlægger",
    "category": "Kvalitet og kontrol",
    "summary": "Planlægningshandlinger kan fortrydes, så en fejltrækning ikke koster tid.",
    "example": "Du trækker et stop forkert, trykker Ctrl/Command + Z, og alt står som før.",
    "steps": [
      "Tryk Ctrl/Command + Z (Ctrl+Z) for at fortryde.",
      "Ctrl/Command + Shift + Z — eller Ctrl+Y på Windows — gentager.",
      "Brug også “Fortryd” i beskeden der vises efter en handling."
    ],
    "shortcut": "Ctrl/Command + Z / Ctrl/Command + Shift + Z",
    "keywords": [
      "fortryd",
      "undo",
      "redo",
      "gentag"
    ]
  },
  {
    "id": "history",
    "title": "Historik på ruter",
    "area": "Ruteplanlægger",
    "category": "Kvalitet og kontrol",
    "summary": "Se hvem der ændrede hvad og hvornår på en rute — nyttigt når flere planlægger.",
    "example": "Rutens historik viser at et stop blev fjernet om eftermiddagen af kontoret, ikke af medarbejderen.",
    "steps": [
      "Åbn rutens menu i kalenderen.",
      "Vælg historik.",
      "Gennemgå ændringerne kronologisk."
    ],
    "keywords": [
      "log",
      "historik",
      "audit",
      "ændringer"
    ]
  },
  {
    "id": "diagnostics",
    "title": "Diagnostik af aftaler der ikke kan vises",
    "area": "Ruteplanlægger",
    "category": "Kvalitet og kontrol",
    "summary": "Hvis en aftale ikke kan placeres i kalenderen — fx manglende adresse eller en serie der ikke er fremskrevet — vises en advarsel med årsagen.",
    "example": "Advarslen viser tre aftaler uden brugbar adresse, som derfor ikke kan placeres på kortet.",
    "steps": [
      "Advarslen vises automatisk øverst i kalenderen, når der findes aftaler der ikke kan vises.",
      "Klik på advarslen for at åbne diagnostikken.",
      "Gennemgå listen og ret dataene på aftalen eller kunden."
    ],
    "keywords": [
      "diagnostik",
      "fejl",
      "geokodning",
      "datakvalitet"
    ]
  },
  {
    "id": "print",
    "title": "Udskriv ruter eller gem PDF",
    "area": "Ruteplanlægger",
    "category": "Print, eksport og deling",
    "summary": "Udskriv en ren køreseddel med dagens stop, adresser, tider og noter — eller gem den som PDF.",
    "example": "Til en vikar uden login printes dagens rute på papir med adresser og noter.",
    "steps": [
      "Åbn “Mere”, og vælg “Print / PDF”. Du kan også trykke P.",
      "Vælg dato og ruter i printvinduet.",
      "Åbn udskriften. Vælg printer eller Gem som PDF i browseren."
    ],
    "shortcut": "P",
    "keywords": [
      "print",
      "udskriv",
      "køreseddel",
      "pdf"
    ]
  },
  {
    "id": "send-to-app",
    "title": "Ruten i medarbejder-appen",
    "area": "Ruteplanlægger",
    "category": "Print, eksport og deling",
    "summary": "Så snart en medarbejder er tildelt et stop, er ruten synlig i medarbejder-appen — der er ingen separat udsendelse.",
    "example": "Du tildeler morgendagens rute til Maria, og hun kan se stoppene på telefonen med det samme.",
    "steps": [
      "Tildel medarbejdere til ruten eller de enkelte stop.",
      "Stoppet viser om det er synligt for medarbejderen.",
      "Medarbejderen ser dagen i appen og tjekker ind og ud undervejs."
    ],
    "keywords": [
      "app",
      "udsend",
      "medarbejder",
      "tildel"
    ]
  },
  {
    "id": "weather",
    "title": "Vejr på dagen",
    "area": "Ruteplanlægger",
    "category": "Print, eksport og deling",
    "summary": "Vejrudsigten vises på dagen i kalenderen, så udendørsarbejde kan flyttes inden det bliver et problem.",
    "example": "Torsdag viser blæst og regn — de udendørs stop rykkes til fredag.",
    "steps": [
      "Se vejrikonet på dagen i kalenderen.",
      "Hold musen over for detaljer.",
      "Flyt udendørs stop hvis nødvendigt."
    ],
    "keywords": [
      "vejr",
      "regn",
      "vind",
      "udendørs"
    ]
  },
  {
    "id": "shortcuts",
    "title": "Tastaturgenveje",
    "area": "Ruteplanlægger",
    "category": "Print, eksport og deling",
    "summary": "Planlægningen kan styres fra tastaturet — genvejsoversigten åbnes med “?”.",
    "example": "T for i dag, ← → for forrige og næste periode, A for auto-fordel, P for print.",
    "steps": [
      "Åbn “Mere”, og vælg “Tastatur-genveje”. Du kan også trykke ?.",
      "Find genvejen under navigation, handlinger eller valg.",
      "Genveje er slået fra, mens du skriver i et felt."
    ],
    "shortcut": "?",
    "keywords": [
      "genveje",
      "keyboard",
      "shortcuts",
      "hurtig"
    ]
  },
  {
    "id": "more-menu",
    "title": "Menuen Mere",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Saml dagens ekstra handlinger i menuen Mere.",
    "example": "Du vil printe ruter og derefter se dagens køretid.",
    "steps": [
      "Klik “Mere” i topbaren.",
      "Vælg “Print / PDF”, “Optimér dagen” eller “Meld medarbejder syg”.",
      "Vælg “Tastatur-genveje” for hjælp. “Optimér rute” findes i den enkelte rutes menu."
    ]
  },
  {
    "id": "optimize-day",
    "title": "Optimér dagen og se køretid",
    "area": "Ruteplanlægger",
    "category": "Kort og kørsel",
    "summary": "Se køretid og afstand pr. medarbejder. Optimér rækkefølgen på dagens ruter.",
    "example": "Du sammenligner medarbejdernes kørsel før dagens start.",
    "steps": [
      "Åbn “Mere” og “Optimér dagen”.",
      "Se samlet køretid samt minutter og kilometer pr. medarbejder.",
      "Start optimeringen i vinduet. Hver rute beholder medarbejdere og faste stop.",
      "Se besparelsen. Du kan fortryde via rutens historik."
    ]
  },
  {
    "id": "projected-routes",
    "title": "Forventede ruter og faste ruter",
    "area": "Ruteplanlægger",
    "category": "Faste aftaler",
    "summary": "Gennemsigtige ruter viser forventede besøg. De faste ruter står øverst.",
    "example": "Du ser næste måneds forventede besøg uden at forveksle dem med gemte ruter.",
    "steps": [
      "Åbn uge- eller månedsvisningen.",
      "Se de faste ruter øverst. Find de gennemsigtige, forventede ruter nedenunder.",
      "Åbn en rute for at kontrollere stop og dato. Forventede besøg er ikke det samme som en gemt rute."
    ]
  },
  {
    "id": "empty-routes",
    "title": "Tomme ruter ryddes op",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Når alle stop flyttes fra en rute via flyttevinduet, slettes den tomme kilderute automatisk.",
    "example": "Du flytter de sidste to stop til torsdag. Den gamle rute ryddes op.",
    "steps": [
      "Åbn ruten, og flyt stoppene til en anden rute eller dato.",
      "Bekræft flytningen. En tom kilderute slettes automatisk.",
      "En ny, manuelt oprettet rute kan godt stå tom, mens du planlægger."
    ]
  },
  {
    "id": "completed-hidden",
    "title": "Udførte aftaler skjules",
    "area": "Ruteplanlægger",
    "category": "Kalender og visninger",
    "summary": "Udførte stop skjules som udgangspunkt i kalenderen.",
    "example": "Dagens liste bliver kortere, når arbejdet afsluttes.",
    "steps": [
      "Markér et stop som udført.",
      "Kalenderen skjuler udførte stop. En rute med kun udførte stop skjules også.",
      "Vælg statusfilteret “Udført”, hvis du vil se dem igen."
    ]
  },
  {
    "id": "move-route-date",
    "title": "Flyt rute til ny dato",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Vælg om en datoflytning gælder én gang eller også fremtidige aftaler.",
    "example": "En fast tirsdagsrute skal kun flyttes denne uge.",
    "steps": [
      "Flyt ruten til en ny dato i kalenderen.",
      "Læs vinduet “Flyt rute til ny dato”.",
      "Vælg “Kun denne gang” eller fremtidige aftaler, når valget er muligt.",
      "Kontrollér eventuelle tilknyttede aftaler og advarsler. Bekræft."
    ]
  },
  {
    "id": "edit-customer",
    "title": "Klik på kundenavnet",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Åbn kundens oplysninger direkte fra rutens stopliste.",
    "example": "Du retter et telefonnummer uden at forlade ruten.",
    "steps": [
      "Åbn ruten og dens stopliste.",
      "Klik på kundenavnet for at redigere kundens oplysninger.",
      "Ret oplysningerne, og gem."
    ]
  },
  {
    "id": "create-customer",
    "title": "Opret kunde",
    "area": "Ruteplanlægger",
    "category": "Planlægning",
    "summary": "Opret en kunde i kundekartoteket. Brug kunden ved næste bestilling.",
    "example": "En ny kunde skal gemmes, før du opretter flere aftaler.",
    "steps": [
      "Åbn “Kunder” på administrationssiden.",
      "Vælg “Opret kunde”. Udfyld kontaktoplysninger og adresse.",
      "Gem kunden. Brug kundens e-mail ved oprettelse af en bestilling."
    ]
  },
  {
    "id": "visit-reminder",
    "title": "Påmindelse før besøg",
    "area": "Ruteplanlægger",
    "category": "Print, eksport og deling",
    "summary": "Indstil kundens påmindelse før besøget i kundens beskedindstillinger.",
    "example": "Kunden vil gerne have en påmindelse dagen før besøget.",
    "steps": [
      "Åbn kundens oplysninger.",
      "Find indstillingerne for beskeder og “Påmindelse før besøg”.",
      "Vælg kanal og tidspunkt. Gem ændringerne."
    ]
  },
  {
    "id": "mobile-agenda",
    "title": "Mobil dagsagenda og tap-tildeling",
    "area": "Ruteplanlægger",
    "category": "Kalender og visninger",
    "summary": "På mobil kan du vælge aftaler med tryk i stedet for at trække dem.",
    "example": "Du planlægger en ekstra opgave fra telefonen.",
    "steps": [
      "Åbn dagsagendaen på mobil.",
      "Åbn aftaler uden rute, og tryk på de aftaler, du vil vælge.",
      "Brug “Tilføj til rute”, og vælg den ønskede rute.",
      "Kontrollér stoppene i dagsagendaen."
    ]
  },
  {
    "id": "stop-identification",
    "title": "Kørselsnummer og medarbejdertitel",
    "area": "Ruteplanlægger",
    "category": "Medarbejdere og fravær",
    "summary": "Stop viser aftalens kørselsnummer. Delte stop viser medarbejdernes titler, når de er angivet.",
    "example": "Du ser, hvilken kørsel besøget er, og hvem der er ansvarlig.",
    "steps": [
      "Åbn rutens stopliste.",
      "Se kørselsnummeret ved aftalen. Nummeret følger samme tælling som på “Aftaler”.",
      "Se navn og titel ved medarbejderne på et delt stop."
    ]
  },
  {
    "id": "undo-completion",
    "title": "Fortryd udførsel",
    "area": "Ruteplanlægger",
    "category": "Kvalitet og kontrol",
    "summary": "Sæt et udført stop tilbage, hvis det blev afsluttet ved en fejl.",
    "example": "Et forkert stop blev markeret som udført.",
    "steps": [
      "Vis udførte stop med statusfilteret “Udført”, og åbn ruten.",
      "Klik “Fortryd udførsel” ved stoppet.",
      "Læs bekræftelsen, og vælg “Fortryd udførsel”."
    ]
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
      "Kundehenvendelser fra “Indhent 3 tilbud” lander i fanen Forespørgsler med status, noter og sortering. Slås til som gratis tilvalg i Indstillinger.",
    example: "En kunde i Odense søger vinduespudsning, og forespørgslen dukker op som et lead.",
    steps: ["Slå forespørgsler til i Indstillinger.", "Åbn fanen “Forespørgsler”.", "Svar, og markér forespørgslen som vundet eller afvist."],
    keywords: ["leads", "tilbud", "forespørgsler", "markedsplads"],
  },
  {
    id: "lead-reply-draft",
    title: "Svarudkast til leads",
    area: "Leads og livechat",
    summary: "Systemet kan generere et udkast til svaret, som du retter til og sender som e-mail.",
    example: "Du genererer et udkast, retter prisen og sender svaret på under et minut.",
    steps: ["Åbn forespørgslen.", "Klik “Generér udkast”.", "Ret teksten og klik “Send som e-mail”."],
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
    title: "Regnskabsintegration til E-conomic og Dinero",
    area: "Regnskab og betaling",
    summary:
      "Forbind E-conomic eller Dinero, så bestillinger og fakturaer kan sendes videre automatisk. Tilvalg mod betaling.",
    example: "Når et stop markeres udført, ender fakturaen i E-conomic uden manuel indtastning.",
    steps: ["Åbn fanen “Regnskab”.", "Vælg E-conomic eller Dinero og forbind.", "Test forbindelsen, og gem."],
    keywords: ["E-conomic", "dinero", "bogføring", "integration", "faktura"],
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
      "30 dages gratis prøve uden betalingskort. Vil I fortsætte, tilføjes kort under Indstillinger, hvor abonnementet også kan opskaleres.",
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
