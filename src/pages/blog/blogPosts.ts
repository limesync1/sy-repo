// Metadata for alle blogartikler. Bruges af både /blog index, sitemap,
// individuelle artikelsider OG selve routing i App.tsx, så vi har én
// sandhed pr. artikel. Tilføj et nyt opslag her, og det dukker
// automatisk op i alle tre — uden at røre App.tsx eller sitemap.xml.

import type { ComponentType, LazyExoticComponent } from "react";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  updatedAt?: string;
  readingMinutes: number;
  category: string;
  /** Frie tags til intern linking ("pletter", "tøj", "rengoering"). */
  tags?: string[];
  /** Dynamic import af artikel-komponenten. Bruges af App.tsx til at
   *  registrere ruten automatisk og af route-prefetch til hover-preload. */
  loader: () => Promise<{ default: ComponentType<unknown> }>;
  /** Sat af App.tsx efter første lazy() — undgå dobbelt-lazy. */
  _lazy?: LazyExoticComponent<ComponentType<unknown>>;
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "saadan-vaelger-du-rengoeringsfirma",
    title: "Sådan vælger du det rigtige rengøringsfirma — 9 ting du skal tjekke",
    description:
      "Komplet guide: certificeringer, forsikring, kontrakter, kvalitetskontrol og typiske faldgruber når du vælger rengøringsfirma til hjem eller virksomhed.",
    publishedAt: "2026-06-15",
    readingMinutes: 11,
    category: "Rengøring",
    loader: () => import("./posts/ChooseCleaningCompany"),
  },
  {
    slug: "tjekliste-til-flyttedag",
    title: "Tjekliste til flyttedag — alt du skal huske før, under og efter flytningen",
    description:
      "Praktisk flyttejekliste: 8 uger før, ugen op til, selve dagen og den første uge i det nye hjem. Inkl. adresseflyt, forsikring og opsigelser.",
    publishedAt: "2026-06-10",
    readingMinutes: 13,
    category: "Flyttehjælp",
    loader: () => import("./posts/MovingDayChecklist"),
  },
  {
    slug: "boligjob-fradrag-2026",
    title: "BoligJob-fradraget 2026 — komplet guide til hvad du kan trække fra",
    description:
      "Hvad må du trække fra i 2026? Beløbsgrænser, hvem kan bruge fradraget, krav til betaling og dokumentation — samt eksempler for rengøring, håndværker og have.",
    publishedAt: "2026-06-05",
    readingMinutes: 9,
    category: "Økonomi",
    loader: () => import("./posts/BoligJobGuide"),
  },
  {
    slug: "saadan-vaelger-du-maler",
    title: "Sådan vælger du den rette maler — pris, proces og faldgruber",
    description:
      "Få styr på malerpriser, proces, forsikring og typiske faldgruber inden du booker en maler — både til lejlighed, hus og erhverv.",
    publishedAt: "2026-06-25",
    readingMinutes: 10,
    category: "Maler",
    loader: () => import("./posts/ChoosePainter"),
  },
  {
    slug: "vvs-akut-foer-installatoeren-kommer",
    title: "VVS-akut: hvad gør du før installatøren kommer?",
    description:
      "Sprunget vandrør, tilstoppet afløb eller stoppet toilet? Her er trin-for-trin hvad du skal gøre — og hvad du IKKE skal gøre — inden VVS'eren ankommer.",
    publishedAt: "2026-06-28",
    readingMinutes: 8,
    category: "VVS",
    loader: () => import("./posts/VvsAkut"),
  },
  {
    slug: "hvornaar-skal-du-have-autoriseret-elektriker",
    title: "Hvornår skal du have en autoriseret elektriker?",
    description:
      "Hvilke elinstallationer må du selv lave i 2026, og hvad kræver en autoriseret elektriker? Få reglerne, sikkerhedstjeklisten og prisniveauet.",
    publishedAt: "2026-07-02",
    readingMinutes: 9,
    category: "Elektriker",
    loader: () => import("./posts/ElectricianRules"),
  },
  {
    slug: "aarshjul-for-haveservice",
    title: "Årshjul for haveservice — hvornår skal hvad gøres?",
    description:
      "Klip, beskæring, gødning, løvfald og vintersikring — komplet månedligt årshjul så din have ser velholdt ud hele året.",
    publishedAt: "2026-07-05",
    readingMinutes: 11,
    category: "Haveservice",
    loader: () => import("./posts/GardenYearWheel"),
  },
  {
    slug: "vinduespudser-eller-selv",
    title: "Vinduespudser eller selv — hvad betaler sig egentlig?",
    description:
      "Hvad koster en vinduespudser pr. vindue, hvor ofte bør vinduer pudses, og hvornår betaler det sig at gøre det selv? Realistisk regnestykke og tjekliste.",
    publishedAt: "2026-07-08",
    readingMinutes: 7,
    category: "Vinduespudsning",
    loader: () => import("./posts/WindowCleanerOrDIY"),
  },
  {
    slug: "tomrerprojekt-hjemme-trin-for-trin",
    title: "Tømrerprojekt hjemme — fra idé til færdig opgave",
    description:
      "Trin-for-trin guide: planlæg, indhent tilbud, vælg tømrer, byggetilladelse, kontrakt, afleveringsforretning og 1-års gennemgang.",
    publishedAt: "2026-07-12",
    readingMinutes: 12,
    category: "Tømrer",
    loader: () => import("./posts/CarpentryProject"),
  },
  {
    slug: "murer-revner-og-fugtskader",
    title: "Revner i muren? Sådan vurderer du om det haster — og hvad det koster",
    description:
      "Sætningsrevner, fugtskader og løse mursten — lær at se forskel på kosmetiske og kritiske revner, og få realistiske priser på murerreparation.",
    publishedAt: "2026-07-16",
    readingMinutes: 9,
    category: "Murer",
    loader: () => import("./posts/MasonryCracks"),
  },
  {
    slug: "rotter-i-haven-hvad-goer-jeg",
    title: "Rotter i haven — hvad gør du? Komplet handlingsguide",
    description:
      "Symptomer, anmeldelsespligt, hvad kommunen gør, hvad du selv kan gøre, og hvornår du skal hyre skadedyrsbekæmper. Plus forebyggelse trin-for-trin.",
    publishedAt: "2026-07-20",
    readingMinutes: 8,
    category: "Skadedyrsbekæmpelse",
    loader: () => import("./posts/RatsInGarden"),
  },
  {
    slug: "gulvlaegger-vinyl-laminat-eller-traegulv",
    title: "Vinyl, laminat eller trægulv? Sådan vælger du det rette gulv",
    description:
      "Sammenligning af pris, holdbarhed, vandbestandighed og fornemmelse for vinyl, laminat, trægulv og fliser — plus hvad det koster at få lagt.",
    publishedAt: "2026-07-24",
    readingMinutes: 10,
    category: "Gulvlægger",
    loader: () => import("./posts/FloorChoice"),
  },
  {
    slug: "anlaegsgartner-terrasse-og-have",
    title: "Ny terrasse og indretning af haven — hvad koster det egentlig?",
    description:
      "Realistiske priser på fliseterrasse, træterrasse, plantning af hæk og anlæg af bede. Trin-for-trin processen fra idé til færdig have.",
    publishedAt: "2026-07-28",
    readingMinutes: 11,
    category: "Anlægsgartner",
    loader: () => import("./posts/Landscaping"),
  },
  {
    slug: "algebehandling-tag-og-facade",
    title: "Algebehandling af tag og facade — virker det, og hvor ofte?",
    description:
      "Hvornår skal taget algebehandles, hvad er forskellen på softwash og højtryk, hvad koster det, og hvor længe holder en behandling? Komplet guide.",
    publishedAt: "2026-08-02",
    readingMinutes: 8,
    category: "Algebehandling",
    loader: () => import("./posts/AlgaeTreatment"),
  },
  {
    slug: "saadan-finder-du-billig-flyttehjaelp",
    title: "Sådan finder du billig flyttehjælp — uden at gå på kompromis med kvaliteten",
    description:
      "Sammenlign timepris og fast pris, undgå skjulte gebyrer, og lær hvornår en billig flyttemand faktisk bliver dyr. 9 konkrete tips til at spare 20–40%.",
    publishedAt: "2026-08-05",
    readingMinutes: 9,
    category: "Flyttehjælp",
    loader: () => import("./posts/CheapMovingHelp"),
  },
  {
    slug: "hovedrengoering-foer-flytning",
    title: "Hovedrengøring før indflytning — tjekliste rum for rum",
    description:
      "Komplet tjekliste til hovedrengøring inden indflytning: køkken, bad, vinduer, gulve, ovne og hårde hvidevarer. Plus prisniveau for professionel hovedrengøring.",
    publishedAt: "2026-08-08",
    readingMinutes: 10,
    category: "Rengøring",
    loader: () => import("./posts/MoveInDeepClean"),
  },
  {
    slug: "fraflytningsrengoering-hvad-skal-med",
    title: "Fraflytningsrengøring — hvad kræver udlejer reelt, og hvad koster det?",
    description:
      "Lovkrav, normal misligholdelse vs. ekstraordinær rengøring, hvad udlejer må trække i depositum, og realistiske priser for fraflytningsrengøring i 2026.",
    publishedAt: "2026-08-12",
    readingMinutes: 9,
    category: "Rengøring",
    loader: () => import("./posts/MoveOutCleaning"),
  },
  {
    slug: "el-tjek-foer-koeb-af-bolig",
    title: "El-tjek før boligkøb — derfor er det 1.500 kr. godt givet ud",
    description:
      "Hvad er et el-tjek, hvad opdager elektrikeren, hvad må sælger ikke skjule, og hvornår er det lovpligtigt? Plus hvad et el-tjek koster i 2026.",
    publishedAt: "2026-08-16",
    readingMinutes: 8,
    category: "Elektriker",
    loader: () => import("./posts/ElectricalInspection"),
  },
  {
    slug: "varmepumpe-installation-priser-2026",
    title: "Varmepumpe — installation, tilskud og pris i 2026",
    description:
      "Luft-til-vand vs. luft-til-luft, hvor meget kan du spare på varmeregningen, hvilke tilskud findes der i 2026, og hvad koster en installation?",
    publishedAt: "2026-08-20",
    readingMinutes: 12,
    category: "VVS",
    loader: () => import("./posts/HeatPump"),
  },
  {
    slug: "tagrender-vedligehold-og-rens",
    title: "Rens af tagrender — hvor ofte, hvad koster det og kan jeg selv?",
    description:
      "Tilstoppede tagrender giver fugtskader for titusinder af kroner. Lær hvor ofte du skal rense, prisniveau for professionel rens og hvornår du selv kan klare det.",
    publishedAt: "2026-08-24",
    readingMinutes: 7,
    category: "Haveservice",
    loader: () => import("./posts/GutterCleaning"),
  },
  {
    slug: "maling-af-facade-traek-og-puds",
    title: "Facademaling — træ, puds eller mursten? Pris, holdbarhed og proces",
    description:
      "Sådan vælger du den rigtige maling til træfacade, pudset facade eller mursten. Holdbarhed, kvm-pris og hvad maleren laver trin for trin.",
    publishedAt: "2026-08-28",
    readingMinutes: 10,
    category: "Maler",
    loader: () => import("./posts/FacadePainting"),
  },
  {
    slug: "haek-og-traefaeldning-regler",
    title: "Hækklipning og træfældning — regler, naboaftaler og priser",
    description:
      "Hvornår må du fælde et træ uden tilladelse, hvilke regler gælder for hækhøjde mod skel, og hvad koster det at få professionelle ind? Plus hegnsloven kort.",
    publishedAt: "2026-09-01",
    readingMinutes: 9,
    category: "Haveservice",
    loader: () => import("./posts/HedgeTreeRules"),
  },
  {
    slug: "vinduer-udskiftning-energi-og-pris",
    title: "Udskiftning af vinduer — energibesparelse, pris og tilskud",
    description:
      "Hvornår betaler det sig at udskifte vinduer, hvad er forskellen på 2- og 3-lags energiruder, hvad koster det pr. vindue, og hvilke tilskud findes der?",
    publishedAt: "2026-09-05",
    readingMinutes: 11,
    category: "Tømrer",
    loader: () => import("./posts/WindowReplacement"),
  },
  {
    slug: "skadedyr-i-koekkenet-hvad-goer-jeg",
    title: "Skadedyr i køkkenet — sølvfisk, melmøl og kakerlakker",
    description:
      "Identifikation, forebyggelse og bekæmpelse af de mest almindelige køkkenskadedyr. Hvornår skal du selv sætte ind, og hvornår skal du ringe efter en professionel?",
    publishedAt: "2026-09-09",
    readingMinutes: 8,
    category: "Skadedyrsbekæmpelse",
    loader: () => import("./posts/KitchenPests"),
  },
  {
    slug: "skorstensfejer-pligt-og-pris",
    title: "Skorstensfejer — lovpligt, intervaller og hvad det koster",
    description:
      "Hvor ofte skal skorstenen fejes, hvad koster lovpligtigt skorstenssyn, og hvad sker der hvis du skipper det? Praktisk guide for husejere med brændeovn eller pejs.",
    publishedAt: "2026-09-13",
    readingMinutes: 7,
    category: "Skorstensfejer",
    loader: () => import("./posts/ChimneySweepObligation"),
  },
  {
    slug: "alarm-eller-videoovervaagning-til-hjemmet",
    title: "Alarm eller videoovervågning til hjemmet — hvad virker bedst i 2026?",
    description:
      "Sammenligning af alarmsystem, smart-kameraer og kombinationsløsninger. Hvad afskrækker indbrudstyve, hvad kræver GDPR, og hvad koster det at få installeret?",
    publishedAt: "2026-09-17",
    readingMinutes: 10,
    category: "Sikkerhed",
    loader: () => import("./posts/AlarmVsCamera"),
  },
  {
    slug: "gulvslibning-traegulv-trin-for-trin",
    title: "Slibning og lakering af trægulv — pris, proces og DIY-vurdering",
    description:
      "Hvornår skal et trægulv slibes, hvor mange gange kan det lade sig gøre, hvad koster det pr. m², og kan du selv? Realistisk vurdering plus tjekliste til gulvlæggeren.",
    publishedAt: "2026-09-21",
    readingMinutes: 9,
    category: "Gulvlægger",
    loader: () => import("./posts/FloorSanding"),
  },
  {
    slug: "saadan-bestiller-du-haandvaerker-rigtigt",
    title: "Sådan bestiller du en håndværker rigtigt — undgå de 7 klassiske fejl",
    description:
      "Specifik opgavebeskrivelse, fast vs. timepris, kontrakt, betalingsplan, afleveringsforretning og 1-års gennemgang. Bestil bedre — og bliv ikke snydt.",
    publishedAt: "2026-09-25",
    readingMinutes: 11,
    category: "Håndværker",
    loader: () => import("./posts/HireContractorRight"),
  },
  // ── Long-tail SEO-pakke (oktober 2026): targets HappyHelper-vinder-keywords.
  // Hvert opslag er bevidst dybere og mere konkret end konkurrentens version,
  // så vi kan tage positionen på Google for fjern-pletter/rengøringsguides.
  {
    slug: "fjern-svedpletter-fra-hvidt-toej",
    title: "Fjern svedpletter fra hvidt tøj — 7 metoder der faktisk virker",
    description:
      "Gule svedpletter under armene? Trin-for-trin guide med natron, brintoverilte, citronsyre og opvaskemiddel — plus hvad du IKKE skal gøre på hvidt bomuldstøj.",
    publishedAt: "2026-10-01",
    readingMinutes: 8,
    category: "Rengøring",
    loader: () => import("./posts/StainsSweat"),
  },
  {
    slug: "fjern-tuschpletter-fra-toej",
    title: "Fjern tuschpletter fra tøj — guide til alle slags tusch",
    description:
      "Sprittusch, vandbaseret tusch, kuglepen og whiteboard-tusch fjernes vidt forskelligt. Få den rigtige metode for hver type — uden at ødelægge stoffet.",
    publishedAt: "2026-10-02",
    readingMinutes: 7,
    category: "Rengøring",
    loader: () => import("./posts/StainsMarker"),
  },
  {
    slug: "fjern-rustpletter-fra-toej",
    title: "Rustpletter på tøj — sådan fjerner du dem uden at ødelægge stoffet",
    description:
      "Citronsaft, eddike og rustfjerner: hvilken metode virker på bomuld, hør, uld og syntetisk? Komplet guide med trin-for-trin og advarsler.",
    publishedAt: "2026-10-03",
    readingMinutes: 7,
    category: "Rengøring",
    loader: () => import("./posts/StainsRust"),
  },
  {
    slug: "fjern-klistermaerker-og-limrester",
    title: "Fjern klistermærker og limrester — fra glas, plast, træ og tøj",
    description:
      "Madolie, eucalyptusolie, sprit, hårtørrer og acetone — den rigtige metode afhænger af overfladen. Få den komplette guide til hver materialetype.",
    publishedAt: "2026-10-04",
    readingMinutes: 7,
    category: "Rengøring",
    loader: () => import("./posts/StickerResidue"),
  },
  {
    slug: "fjern-olie-og-fedtpletter-fra-toej",
    title: "Fjern olie- og fedtpletter fra tøj — også gamle og indtørrede",
    description:
      "Opvaskemiddel, talkum, brun sæbe og galdesæbe. Trin-for-trin for friske og indtørrede fedtpletter — på både hvidt, kulørt og delikate stoffer.",
    publishedAt: "2026-10-05",
    readingMinutes: 8,
    category: "Rengøring",
    loader: () => import("./posts/StainsOil"),
  },
  {
    slug: "pudse-vinduer-uden-skraber",
    title: "Pudse vinduer uden skraber — sådan får du stribefri ruder",
    description:
      "Mikrofiberklud, avispapir, gummiviskere og den rigtige blanding. Få stribefri, klare vinduer uden professionelt udstyr — i fem trin.",
    publishedAt: "2026-10-06",
    readingMinutes: 6,
    category: "Vinduespudser",
    loader: () => import("./posts/WindowsNoSqueegee"),
  },
  {
    slug: "lav-dit-eget-vinduespudsemiddel",
    title: "Lav dit eget vinduespudsemiddel — 4 opskrifter der virker",
    description:
      "Eddike, sprit, opvaskemiddel og citronsyre: præcise opskrifter til vinduespudsemiddel der ikke laver striber. Plus advarsler mod blanding du skal undgå.",
    publishedAt: "2026-10-07",
    readingMinutes: 6,
    category: "Vinduespudser",
    loader: () => import("./posts/WindowCleanerRecipe"),
  },
  {
    slug: "afkalkning-komplet-guide",
    title: "Afkalkning — komplet guide til kaffemaskine, elkedel, bruser og toilet",
    description:
      "Eddike, citronsyre eller specialprodukter? Få den rigtige metode og dosis til hver type apparat og overflade — og undgå skader på pakninger og krom.",
    publishedAt: "2026-10-08",
    readingMinutes: 9,
    category: "Rengøring",
    loader: () => import("./posts/Descaling"),
  },
  {
    slug: "rengoering-af-aluminium",
    title: "Rengøring af aluminium — vinduer, gryder, havemøbler og biler",
    description:
      "Aluminium iltes og bliver mat. Få den rigtige metode med eddike, citronsyre, tandpasta eller specialpolish — uden at ridse eller misfarve.",
    publishedAt: "2026-10-09",
    readingMinutes: 7,
    category: "Rengøring",
    loader: () => import("./posts/AluminumCleaning"),
  },
  {
    slug: "rens-og-vask-af-ruskind",
    title: "Rens og vask af ruskind — sko, jakke og møbler uden at ødelægge dem",
    description:
      "Ruskind tåler ikke vand som almindeligt læder. Få den rigtige proces med ruskindsbørste, viskelæder, fugtbeskyttelse og pletfjerner.",
    publishedAt: "2026-10-10",
    readingMinutes: 7,
    category: "Rengøring",
    loader: () => import("./posts/SuedeCleaning"),
  },
  {
    slug: "statisk-elektricitet-i-toej-loesninger",
    title: "Statisk elektricitet i tøj — sådan slipper du af med stødene",
    description:
      "Antistatisk spray du selv kan lave, balsam i sidste skyl, tørreklude og hjemmelavede tricks. Forstå hvorfor det opstår — og fix det for godt.",
    publishedAt: "2026-10-11",
    readingMinutes: 6,
    category: "Rengøring",
    loader: () => import("./posts/StaticElectricity"),
  },
  {
    slug: "afloeb-lugter-saadan-fjerner-du-lugten",
    title: "Afløb lugter — sådan fjerner du lugten permanent",
    description:
      "Natron + eddike, kogende vand, mekanisk rens og vandlås-tjek. Find årsagen (tør vandlås, kloakgas, biofilm) og løs det rigtigt — uden ætsende midler.",
    publishedAt: "2026-10-12",
    readingMinutes: 8,
    category: "Rengøring",
    loader: () => import("./posts/SmellyDrain"),
  },
  {
    slug: "rengoering-af-traeoverflader",
    title: "Rengøring af træoverflader — bordplade, gulv, møbler og terrasse",
    description:
      "Olieret, lakeret, sæbebehandlet eller ubehandlet træ kræver hver sin metode. Få komplet guide til daglig pleje og dybderens uden at ødelægge overfladen.",
    publishedAt: "2026-10-13",
    readingMinutes: 9,
    category: "Rengøring",
    loader: () => import("./posts/WoodSurfaceCleaning"),
  },
  {
    slug: "hvor-ofte-skal-du-goere-rent",
    title: "Hvor ofte skal du gøre rent i hvert rum? Komplet skema",
    description:
      "Køkken, bad, soveværelse, stue og entré — daglige, ugentlige, månedlige og halvårlige opgaver i ét overskueligt skema. Plus tips til at fordele arbejdet.",
    publishedAt: "2026-10-14",
    readingMinutes: 8,
    category: "Rengøring",
    loader: () => import("./posts/CleaningFrequency"),
  },
  {
    slug: "emaljering-af-badekar",
    title: "Emaljering af badekar — DIY eller fagmand? Pris og proces",
    description:
      "Emaljemaling, fagmand-genemaljering eller udskiftning? Få overblik over levetid, pris (2.500–9.000 kr.), forarbejde og hvornår det betaler sig.",
    publishedAt: "2026-10-15",
    readingMinutes: 8,
    category: "Håndværker",
    loader: () => import("./posts/BathtubReglazing"),
  },
  {
    slug: "dybdegaaende-rengoering-af-nyt-hjem",
    title: "Dybdegående rengøring af nyt hjem — komplet tjekliste før indflytning",
    description:
      "Skabe, ovn, køl, ventilation, afløb, vinduer, gulve og el-kontakter. Den fulde rækkefølge for hovedrengøring inden du flytter ind — uden at glemme noget.",
    publishedAt: "2026-10-16",
    readingMinutes: 10,
    category: "Flyttehjælp",
    loader: () => import("./posts/NewHomeDeepClean"),
  },
  // ── Pakke A (Uge 1) — branchespørgsmål, 1 pr. branche. SEO-optimeret
  // til "hvor ofte / hvor meget / hvorfor"-søgninger der typisk ender med
  // featured snippets eller AI Overview-citationer.
  {
    slug: "hvor-ofte-rengoeringshjaelp",
    title: "Hvor ofte skal du have rengøringshjælp? Realistisk skema 2026",
    description:
      "Hver uge, hver 14. dag eller hver måned? Få den rigtige frekvens efter boligens størrelse, antal beboere, kæledyr og livsstil — plus hvad det koster pr. besøg.",
    publishedAt: "2026-11-01",
    readingMinutes: 8,
    category: "Rengøring",
    tags: ["rengoering", "frekvens", "pris"],
    loader: () => import("./posts/CleaningFrequencyHelp"),
  },
  {
    slug: "hvor-lang-tid-tager-en-flytning",
    title: "Hvor lang tid tager en flytning? Tidsestimater pr. boligstørrelse",
    description:
      "Sådan beregner du timer til flytning af 1-, 2-, 3- og 4-værelses bolig. Hvad påvirker tiden — trapper, elevator, afstand — og hvornår du sparer på fast pris.",
    publishedAt: "2026-11-02",
    readingMinutes: 9,
    category: "Flyttehjælp",
    tags: ["flytning", "tid", "pris", "estimat"],
    loader: () => import("./posts/MovingDuration"),
  },
  {
    slug: "fast-pris-eller-timepris-haandvaerker",
    title: "Fast pris eller timepris til håndværker — hvad er bedst?",
    description:
      "Fast pris giver budgetsikkerhed, timepris er ofte billigere på små opgaver. Få beslutningsregler, faldgruber ved 'ekstra arbejde' og hvad branche-aftalen siger.",
    publishedAt: "2026-11-03",
    readingMinutes: 8,
    category: "Håndværker",
    tags: ["pris", "kontrakt", "haandvaerker"],
    loader: () => import("./posts/FixedPriceOrHourly"),
  },
  {
    slug: "hvad-koster-haekklipning",
    title: "Hvad koster hækklipning pr. meter i 2026?",
    description:
      "Realistiske priser pr. meter og pr. time for hækklipning. Sådan påvirker hækhøjde, type (bøg, liguster, thuja) og bortskaffelse af afklip prisen — plus BoligJob-fradrag.",
    publishedAt: "2026-11-04",
    readingMinutes: 7,
    category: "Haveservice",
    tags: ["have", "pris", "haekklipning"],
    loader: () => import("./posts/HedgeTrimmingPrice"),
  },
  {
    slug: "hvor-mange-lag-maling",
    title: "Hvor mange lag maling skal du bruge? Komplet guide",
    description:
      "1 lag, 2 lag eller 3 lag? Det afhænger af farveskift, undergrund (gips, puds, træ), malingstype og kvalitet. Få den rigtige beregning og undgå at male om.",
    publishedAt: "2026-11-05",
    readingMinutes: 7,
    category: "Maler",
    tags: ["maler", "maling", "teknik"],
    loader: () => import("./posts/PaintCoatsCount"),
  },
  {
    slug: "hvad-koster-akut-vvs-tilkald",
    title: "Hvad koster akut VVS-tilkald? Priser 2026 inkl. weekend",
    description:
      "Hverdage, aften, weekend og helligdage — få realistiske priser for akut VVS-tilkald (1.200–4.500 kr.), hvad takstforhøjelsen dækker, og hvornår det reelt haster.",
    publishedAt: "2026-11-06",
    readingMinutes: 7,
    category: "VVS",
    tags: ["vvs", "akut", "pris", "weekend"],
    loader: () => import("./posts/EmergencyPlumberCost"),
  },
  {
    slug: "hpfi-relae-springer",
    title: "HPFI-relæet springer hele tiden — sådan finder du fejlen",
    description:
      "Trin-for-trin fejlfinding: træk apparater ud ét ad gangen, test fugtige stikkontakter, tjek ladere og hårde hvidevarer. Hvornår skal du selv stoppe og ringe efter elektriker?",
    publishedAt: "2026-11-07",
    readingMinutes: 8,
    category: "Elektriker",
    tags: ["elektriker", "hpfi", "fejlfinding", "sikkerhed"],
    loader: () => import("./posts/HpfiKeepsTripping"),
  },
  {
    slug: "hvad-koster-skillevaeg",
    title: "Hvad koster en skillevæg? Priser, materialer og proces 2026",
    description:
      "Gipsskillevæg (4.000–9.000 kr.), murvæg (8.000–18.000 kr.) eller letvæg med dør. Få realistiske priser pr. m², lyddæmpning, byggetilladelse og processen trin-for-trin.",
    publishedAt: "2026-11-08",
    readingMinutes: 8,
    category: "Tømrer",
    tags: ["tomrer", "skillevaeg", "pris", "renovering"],
    loader: () => import("./posts/PartitionWallCost"),
  },
  {
    slug: "rotter-eller-mus",
    title: "Rotter eller mus? Sådan kender du forskellen — og hvad du gør",
    description:
      "Lortenes størrelse, lyden om natten, hullerne og adfærd: lær at se forskel på rotter og mus, og forstå hvorfor det betyder noget (rotter er anmeldelsespligtige).",
    publishedAt: "2026-11-09",
    readingMinutes: 7,
    category: "Skadedyrsbekæmpelse",
    tags: ["skadedyr", "rotter", "mus", "identifikation"],
    loader: () => import("./posts/RatsOrMice"),
  },
  {
    slug: "alarm-uden-abonnement",
    title: "Alarm uden abonnement — virker det, og hvad mister du?",
    description:
      "Smart-alarmer (Ajax, Verisure DIY, Aqara) uden månedlig betaling: hvad er forskellen i forhold til kontrolcentral-alarmer, sker der reelt en udrykning, og hvad siger forsikringen?",
    publishedAt: "2026-11-10",
    readingMinutes: 8,
    category: "Sikkerhed",
    tags: ["sikkerhed", "alarm", "forsikring"],
    loader: () => import("./posts/AlarmNoSubscription"),
  },
  {
    slug: "hvor-ofte-skal-skorsten-fejes",
    title: "Hvor ofte skal skorstenen fejes i 2026? Lovkrav og intervaller",
    description:
      "Lovpligtigt 1–2 gange årligt afhængigt af installation. Få præcise intervaller for brændeovn, pejs, oliefyr og gaskedel — plus hvad det koster, og hvad der sker hvis du springer det over.",
    publishedAt: "2026-11-11",
    readingMinutes: 6,
    category: "Skorstensfejer",
    tags: ["skorsten", "lovpligt", "braendeovn"],
    loader: () => import("./posts/ChimneySweepFrequency"),
  },
  {
    slug: "vinduespudsning-pris-pr-m2",
    title: "Vinduespudsning pr. m² — hvad er den rigtige pris i 2026?",
    description:
      "Indvendigt (15–35 kr./m²), udvendigt (25–55 kr./m²), abonnement vs. engangsbesøg. Lær prisstrukturen, hvornår det betaler sig at få abonnement, og hvad du kan forhandle.",
    publishedAt: "2026-11-12",
    readingMinutes: 6,
    category: "Vinduespudsning",
    tags: ["vinduer", "pris", "abonnement"],
    loader: () => import("./posts/WindowCleaningPricePerM2"),
  },
  {
    slug: "hvor-mange-gange-slibe-traegulv",
    title: "Hvor mange gange kan et trægulv slibes? Realistisk svar 2026",
    description:
      "Massivt parket: 4–8 gange. Lamel: 1–3 gange. Plankegulv: 6–10 gange. Lær at vurdere restslibedybde, bjælke-niveau og hvornår det er billigere at lægge nyt gulv.",
    publishedAt: "2026-11-13",
    readingMinutes: 7,
    category: "Gulvlægger",
    tags: ["gulv", "slibning", "parket"],
    loader: () => import("./posts/WoodFloorSandingTimes"),
  },
  {
    slug: "hvad-koster-facaderens",
    title: "Hvad koster facaderens i 2026? Pris pr. m² og metoder",
    description:
      "Højtryksrens (25–70 kr./m²), softwash (35–90 kr./m²), sandblæsning (90–180 kr./m²). Få den rigtige metode efter facadetype, alder og graden af alger, mos og misfarvning.",
    publishedAt: "2026-11-14",
    readingMinutes: 8,
    category: "Murer",
    tags: ["facade", "rens", "pris", "murer"],
    loader: () => import("./posts/FacadeCleaningCost"),
  },
  {
    slug: "algebehandling-hvor-ofte",
    title: "Algebehandling — hvor ofte skal det gøres på tag og facade?",
    description:
      "Tag: hvert 3.–5. år. Facade: hvert 2.–4. år afhængigt af himmelretning og bevoksning. Lær at vurdere tilstanden selv, så du ikke betaler for unødvendige behandlinger.",
    publishedAt: "2026-11-15",
    readingMinutes: 7,
    category: "Algebehandling",
    tags: ["algebehandling", "tag", "facade", "vedligehold"],
    loader: () => import("./posts/AlgaeTreatmentFrequency"),
  },
  // ── Pakke 2 (Uge 2) — pletter, dybderens og problem/løsning. Targets
  // happyhelpers vinder-kategorier + højkommercielle "pris 2026"-spørgsmål.
  {
    slug: "fjern-roedvinspletter-fra-toej",
    title: "Fjern rødvinspletter fra tøj — 5 metoder der virker",
    description: "Trin-for-trin: hvidvin-tricket, brintoverilte, natron-pasta og galdesæbe. Førstehjælp inden for 5 min + redning af gamle pletter på bomuld, hør og uld.",
    publishedAt: "2026-12-01",
    readingMinutes: 8,
    category: "Rengøring",
    tags: ["pletter", "vin", "toej", "rengoering"],
    loader: () => import("./posts/StainsRedWine"),
  },
  {
    slug: "fjern-kaffepletter-fra-toej",
    title: "Fjern kaffepletter fra tøj — sort kaffe vs. mælkekaffe",
    description: "Friske og gamle kaffepletter behandles forskelligt. Få den rigtige metode + hvad der sker hvis pletten først har været i tørretumbleren.",
    publishedAt: "2026-12-02",
    readingMinutes: 7,
    category: "Rengøring",
    tags: ["pletter", "kaffe", "toej", "rengoering"],
    loader: () => import("./posts/StainsCoffee"),
  },
  {
    slug: "fjern-blodpletter-fra-toej",
    title: "Fjern blodpletter — fra tøj, madras og sengetøj",
    description: "Aldrig varmt vand. Brintoverilte, salt og koldt vand er løsningen — også på gamle blodpletter. Plus madras og sengetøj uden at ødelægge stoffet.",
    publishedAt: "2026-12-03",
    readingMinutes: 7,
    category: "Rengøring",
    tags: ["pletter", "blod", "toej", "rengoering"],
    loader: () => import("./posts/StainsBlood"),
  },
  {
    slug: "fjern-graespletter-fra-toej",
    title: "Fjern græspletter fra tøj — også fra sportstøj og børnetøj",
    description: "Husholdningssprit, enzymvask og galdesæbe — den rigtige metode til hvert stof. Plus forebyggelse på fodboldtrøjer og hvide sko.",
    publishedAt: "2026-12-04",
    readingMinutes: 6,
    category: "Rengøring",
    tags: ["pletter", "graes", "boernetoej", "rengoering"],
    loader: () => import("./posts/StainsGrass"),
  },
  {
    slug: "rens-af-madras-komplet-guide",
    title: "Rens af madras — pletter, lugt og halvårlig dybderens",
    description: "Sådan fjerner du urin, blod, sved og kaffe fra madrassen — uden at ødelægge den. Plus natron-tricket der fjerner lugt for godt.",
    publishedAt: "2026-12-05",
    readingMinutes: 9,
    category: "Rengøring",
    tags: ["madras", "rengoering", "soveværelse", "lugt"],
    loader: () => import("./posts/MattressCleaning"),
  },
  {
    slug: "rens-af-sofa-stof-laeder-microfiber",
    title: "Rens af sofa — stof, læder og mikrofiber uden at ødelægge den",
    description: "Find ud af hvad din sofa tåler (W/S/WS/X-mærket), og få den rigtige metode til pletter, dybderens og månedlig pleje for hver type.",
    publishedAt: "2026-12-06",
    readingMinutes: 9,
    category: "Rengøring",
    tags: ["sofa", "rengoering", "moebler", "laeder"],
    loader: () => import("./posts/SofaCleaning"),
  },
  {
    slug: "rens-af-taepper-og-gulvtaepper",
    title: "Rens af tæpper og gulvtæpper — pletter, lugt og dybderens",
    description: "Sådan plet- og dybderenser du tæpper hjemme uden at skrumpe eller bløde farverne. Plus hvornår professionel tæpperens er pengene værd.",
    publishedAt: "2026-12-07",
    readingMinutes: 8,
    category: "Rengøring",
    tags: ["taepper", "rengoering", "gulv", "pletter"],
    loader: () => import("./posts/RugCleaning"),
  },
  {
    slug: "fjern-skimmel-paa-fuger-badevaerelse",
    title: "Fjern skimmel på fuger i badeværelset — komplet guide",
    description: "Klor eller eddike? Sådan fjerner du sort skimmel fra silikone- og cementfuger — og hvornår fugen skal udskiftes helt.",
    publishedAt: "2026-12-08",
    readingMinutes: 9,
    category: "Rengøring",
    tags: ["skimmel", "fuger", "badevaerelse", "rengoering"],
    loader: () => import("./posts/MoldOnGrout"),
  },
  {
    slug: "hvad-koster-flytterengoering-2026",
    title: "Hvad koster flytterengøring i 2026? Pris pr. m² inkl. afleveringsgaranti",
    description: "60–110 kr./m² inkl. moms. Få fuldt prisoverblik, hvad der skal være med, og hvordan du sparer 20–30% uden at risikere depositum.",
    publishedAt: "2026-12-09",
    readingMinutes: 8,
    category: "Rengøring",
    tags: ["flytterengoering", "pris", "fraflytning", "boligjob"],
    loader: () => import("./posts/MoveOutCleaningPrice"),
  },
  {
    slug: "hvad-koster-haveservice-pr-time-2026",
    title: "Hvad koster haveservice pr. time i 2026? Regionspriser & abonnement",
    description: "Timepriser 295–595 kr. fordelt på regioner. Fast pris vs. timepris, abonnement vs. engangs, og hvordan BoligJob-fradraget kan halvere udgiften.",
    publishedAt: "2026-12-10",
    readingMinutes: 7,
    category: "Haveservice",
    tags: ["haveservice", "pris", "havemand", "boligjob"],
    loader: () => import("./posts/GardenServiceHourlyPrice"),
  },
  {
    slug: "tilstoppet-afloeb-selv-eller-vvs",
    title: "Tilstoppet afløb — sådan løser du det selv (eller hvornår VVS)",
    description: "Natron, eddike, svuppert og spiral i den rigtige rækkefølge. Plus de tegn der betyder du skal ringe efter en VVS i stedet for at fortsætte selv.",
    publishedAt: "2026-12-11",
    readingMinutes: 8,
    category: "VVS",
    tags: ["afloeb", "tilstoppet", "vvs", "diy"],
    loader: () => import("./posts/CloggedDrain"),
  },
  {
    slug: "lugt-i-vaskemaskine-loesninger",
    title: "Lugt i vaskemaskine — sådan fjerner du den permanent",
    description: "Pakning, sæberum, afløbsfilter og 90° tom-vask med eddike. Få de daglige vaner der holder maskinen lugtfri uden specielle produkter.",
    publishedAt: "2026-12-12",
    readingMinutes: 7,
    category: "Rengøring",
    tags: ["vaskemaskine", "lugt", "rengoering", "vedligehold"],
    loader: () => import("./posts/SmellyWashingMachine"),
  },
];

export const findBlogPost = (slug?: string) =>
  BLOG_POSTS.find((p) => p.slug === slug?.toLowerCase());