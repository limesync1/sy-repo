// Metadata for alle blogartikler. Bruges af både /blog index, sitemap
// og individuelle artikelsider, så vi har én sandhed.

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO
  updatedAt?: string;
  readingMinutes: number;
  category: string;
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
  },
  {
    slug: "tjekliste-til-flyttedag",
    title: "Tjekliste til flyttedag — alt du skal huske før, under og efter flytningen",
    description:
      "Praktisk flyttejekliste: 8 uger før, ugen op til, selve dagen og den første uge i det nye hjem. Inkl. adresseflyt, forsikring og opsigelser.",
    publishedAt: "2026-06-10",
    readingMinutes: 13,
    category: "Flyttehjælp",
  },
  {
    slug: "boligjob-fradrag-2026",
    title: "BoligJob-fradraget 2026 — komplet guide til hvad du kan trække fra",
    description:
      "Hvad må du trække fra i 2026? Beløbsgrænser, hvem kan bruge fradraget, krav til betaling og dokumentation — samt eksempler for rengøring, håndværker og have.",
    publishedAt: "2026-06-05",
    readingMinutes: 9,
    category: "Økonomi",
  },
  {
    slug: "saadan-vaelger-du-maler",
    title: "Sådan vælger du den rette maler — pris, proces og faldgruber",
    description:
      "Få styr på malerpriser, proces, forsikring og typiske faldgruber inden du booker en maler — både til lejlighed, hus og erhverv.",
    publishedAt: "2026-06-25",
    readingMinutes: 10,
    category: "Maler",
  },
  {
    slug: "vvs-akut-foer-installatoeren-kommer",
    title: "VVS-akut: hvad gør du før installatøren kommer?",
    description:
      "Sprunget vandrør, tilstoppet afløb eller stoppet toilet? Her er trin-for-trin hvad du skal gøre — og hvad du IKKE skal gøre — inden VVS'eren ankommer.",
    publishedAt: "2026-06-28",
    readingMinutes: 8,
    category: "VVS",
  },
  {
    slug: "hvornaar-skal-du-have-autoriseret-elektriker",
    title: "Hvornår skal du have en autoriseret elektriker?",
    description:
      "Hvilke elinstallationer må du selv lave i 2026, og hvad kræver en autoriseret elektriker? Få reglerne, sikkerhedstjeklisten og prisniveauet.",
    publishedAt: "2026-07-02",
    readingMinutes: 9,
    category: "Elektriker",
  },
  {
    slug: "aarshjul-for-haveservice",
    title: "Årshjul for haveservice — hvornår skal hvad gøres?",
    description:
      "Klip, beskæring, gødning, løvfald og vintersikring — komplet månedligt årshjul så din have ser velholdt ud hele året.",
    publishedAt: "2026-07-05",
    readingMinutes: 11,
    category: "Haveservice",
  },
  {
    slug: "vinduespudser-eller-selv",
    title: "Vinduespudser eller selv — hvad betaler sig egentlig?",
    description:
      "Hvad koster en vinduespudser pr. vindue, hvor ofte bør vinduer pudses, og hvornår betaler det sig at gøre det selv? Realistisk regnestykke og tjekliste.",
    publishedAt: "2026-07-08",
    readingMinutes: 7,
    category: "Vinduespudsning",
  },
  {
    slug: "tomrerprojekt-hjemme-trin-for-trin",
    title: "Tømrerprojekt hjemme — fra idé til færdig opgave",
    description:
      "Trin-for-trin guide: planlæg, indhent tilbud, vælg tømrer, byggetilladelse, kontrakt, afleveringsforretning og 1-års gennemgang.",
    publishedAt: "2026-07-12",
    readingMinutes: 12,
    category: "Tømrer",
  },
  {
    slug: "murer-revner-og-fugtskader",
    title: "Revner i muren? Sådan vurderer du om det haster — og hvad det koster",
    description:
      "Sætningsrevner, fugtskader og løse mursten — lær at se forskel på kosmetiske og kritiske revner, og få realistiske priser på murerreparation.",
    publishedAt: "2026-07-16",
    readingMinutes: 9,
    category: "Murer",
  },
  {
    slug: "rotter-i-haven-hvad-goer-jeg",
    title: "Rotter i haven — hvad gør du? Komplet handlingsguide",
    description:
      "Symptomer, anmeldelsespligt, hvad kommunen gør, hvad du selv kan gøre, og hvornår du skal hyre skadedyrsbekæmper. Plus forebyggelse trin-for-trin.",
    publishedAt: "2026-07-20",
    readingMinutes: 8,
    category: "Skadedyrsbekæmpelse",
  },
  {
    slug: "gulvlaegger-vinyl-laminat-eller-traegulv",
    title: "Vinyl, laminat eller trægulv? Sådan vælger du det rette gulv",
    description:
      "Sammenligning af pris, holdbarhed, vandbestandighed og fornemmelse for vinyl, laminat, trægulv og fliser — plus hvad det koster at få lagt.",
    publishedAt: "2026-07-24",
    readingMinutes: 10,
    category: "Gulvlægger",
  },
  {
    slug: "anlaegsgartner-terrasse-og-have",
    title: "Ny terrasse og indretning af haven — hvad koster det egentlig?",
    description:
      "Realistiske priser på fliseterrasse, træterrasse, plantning af hæk og anlæg af bede. Trin-for-trin processen fra idé til færdig have.",
    publishedAt: "2026-07-28",
    readingMinutes: 11,
    category: "Anlægsgartner",
  },
  {
    slug: "algebehandling-tag-og-facade",
    title: "Algebehandling af tag og facade — virker det, og hvor ofte?",
    description:
      "Hvornår skal taget algebehandles, hvad er forskellen på softwash og højtryk, hvad koster det, og hvor længe holder en behandling? Komplet guide.",
    publishedAt: "2026-08-02",
    readingMinutes: 8,
    category: "Algebehandling",
  },
  {
    slug: "saadan-finder-du-billig-flyttehjaelp",
    title: "Sådan finder du billig flyttehjælp — uden at gå på kompromis med kvaliteten",
    description:
      "Sammenlign timepris og fast pris, undgå skjulte gebyrer, og lær hvornår en billig flyttemand faktisk bliver dyr. 9 konkrete tips til at spare 20–40%.",
    publishedAt: "2026-08-05",
    readingMinutes: 9,
    category: "Flyttehjælp",
  },
  {
    slug: "hovedrengoering-foer-flytning",
    title: "Hovedrengøring før indflytning — tjekliste rum for rum",
    description:
      "Komplet tjekliste til hovedrengøring inden indflytning: køkken, bad, vinduer, gulve, ovne og hårde hvidevarer. Plus prisniveau for professionel hovedrengøring.",
    publishedAt: "2026-08-08",
    readingMinutes: 10,
    category: "Rengøring",
  },
  {
    slug: "fraflytningsrengoering-hvad-skal-med",
    title: "Fraflytningsrengøring — hvad kræver udlejer reelt, og hvad koster det?",
    description:
      "Lovkrav, normal misligholdelse vs. ekstraordinær rengøring, hvad udlejer må trække i depositum, og realistiske priser for fraflytningsrengøring i 2026.",
    publishedAt: "2026-08-12",
    readingMinutes: 9,
    category: "Rengøring",
  },
  {
    slug: "el-tjek-foer-koeb-af-bolig",
    title: "El-tjek før boligkøb — derfor er det 1.500 kr. godt givet ud",
    description:
      "Hvad er et el-tjek, hvad opdager elektrikeren, hvad må sælger ikke skjule, og hvornår er det lovpligtigt? Plus hvad et el-tjek koster i 2026.",
    publishedAt: "2026-08-16",
    readingMinutes: 8,
    category: "Elektriker",
  },
  {
    slug: "varmepumpe-installation-priser-2026",
    title: "Varmepumpe — installation, tilskud og pris i 2026",
    description:
      "Luft-til-vand vs. luft-til-luft, hvor meget kan du spare på varmeregningen, hvilke tilskud findes der i 2026, og hvad koster en installation?",
    publishedAt: "2026-08-20",
    readingMinutes: 12,
    category: "VVS",
  },
  {
    slug: "tagrender-vedligehold-og-rens",
    title: "Rens af tagrender — hvor ofte, hvad koster det og kan jeg selv?",
    description:
      "Tilstoppede tagrender giver fugtskader for titusinder af kroner. Lær hvor ofte du skal rense, prisniveau for professionel rens og hvornår du selv kan klare det.",
    publishedAt: "2026-08-24",
    readingMinutes: 7,
    category: "Haveservice",
  },
  {
    slug: "maling-af-facade-traek-og-puds",
    title: "Facademaling — træ, puds eller mursten? Pris, holdbarhed og proces",
    description:
      "Sådan vælger du den rigtige maling til træfacade, pudset facade eller mursten. Holdbarhed, kvm-pris og hvad maleren laver trin for trin.",
    publishedAt: "2026-08-28",
    readingMinutes: 10,
    category: "Maler",
  },
  {
    slug: "haek-og-traefaeldning-regler",
    title: "Hækklipning og træfældning — regler, naboaftaler og priser",
    description:
      "Hvornår må du fælde et træ uden tilladelse, hvilke regler gælder for hækhøjde mod skel, og hvad koster det at få professionelle ind? Plus hegnsloven kort.",
    publishedAt: "2026-09-01",
    readingMinutes: 9,
    category: "Haveservice",
  },
  {
    slug: "vinduer-udskiftning-energi-og-pris",
    title: "Udskiftning af vinduer — energibesparelse, pris og tilskud",
    description:
      "Hvornår betaler det sig at udskifte vinduer, hvad er forskellen på 2- og 3-lags energiruder, hvad koster det pr. vindue, og hvilke tilskud findes der?",
    publishedAt: "2026-09-05",
    readingMinutes: 11,
    category: "Tømrer",
  },
  {
    slug: "skadedyr-i-koekkenet-hvad-goer-jeg",
    title: "Skadedyr i køkkenet — sølvfisk, melmøl og kakerlakker",
    description:
      "Identifikation, forebyggelse og bekæmpelse af de mest almindelige køkkenskadedyr. Hvornår skal du selv sætte ind, og hvornår skal du ringe efter en professionel?",
    publishedAt: "2026-09-09",
    readingMinutes: 8,
    category: "Skadedyrsbekæmpelse",
  },
  {
    slug: "skorstensfejer-pligt-og-pris",
    title: "Skorstensfejer — lovpligt, intervaller og hvad det koster",
    description:
      "Hvor ofte skal skorstenen fejes, hvad koster lovpligtigt skorstenssyn, og hvad sker der hvis du skipper det? Praktisk guide for husejere med brændeovn eller pejs.",
    publishedAt: "2026-09-13",
    readingMinutes: 7,
    category: "Skorstensfejer",
  },
  {
    slug: "alarm-eller-videoovervaagning-til-hjemmet",
    title: "Alarm eller videoovervågning til hjemmet — hvad virker bedst i 2026?",
    description:
      "Sammenligning af alarmsystem, smart-kameraer og kombinationsløsninger. Hvad afskrækker indbrudstyve, hvad kræver GDPR, og hvad koster det at få installeret?",
    publishedAt: "2026-09-17",
    readingMinutes: 10,
    category: "Sikkerhed",
  },
  {
    slug: "gulvslibning-traegulv-trin-for-trin",
    title: "Slibning og lakering af trægulv — pris, proces og DIY-vurdering",
    description:
      "Hvornår skal et trægulv slibes, hvor mange gange kan det lade sig gøre, hvad koster det pr. m², og kan du selv? Realistisk vurdering plus tjekliste til gulvlæggeren.",
    publishedAt: "2026-09-21",
    readingMinutes: 9,
    category: "Gulvlægger",
  },
  {
    slug: "saadan-bestiller-du-haandvaerker-rigtigt",
    title: "Sådan bestiller du en håndværker rigtigt — undgå de 7 klassiske fejl",
    description:
      "Specifik opgavebeskrivelse, fast vs. timepris, kontrakt, betalingsplan, afleveringsforretning og 1-års gennemgang. Bestil bedre — og bliv ikke snydt.",
    publishedAt: "2026-09-25",
    readingMinutes: 11,
    category: "Håndværker",
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
  },
  {
    slug: "fjern-tuschpletter-fra-toej",
    title: "Fjern tuschpletter fra tøj — guide til alle slags tusch",
    description:
      "Sprittusch, vandbaseret tusch, kuglepen og whiteboard-tusch fjernes vidt forskelligt. Få den rigtige metode for hver type — uden at ødelægge stoffet.",
    publishedAt: "2026-10-02",
    readingMinutes: 7,
    category: "Rengøring",
  },
  {
    slug: "fjern-rustpletter-fra-toej",
    title: "Rustpletter på tøj — sådan fjerner du dem uden at ødelægge stoffet",
    description:
      "Citronsaft, eddike og rustfjerner: hvilken metode virker på bomuld, hør, uld og syntetisk? Komplet guide med trin-for-trin og advarsler.",
    publishedAt: "2026-10-03",
    readingMinutes: 7,
    category: "Rengøring",
  },
  {
    slug: "fjern-klistermaerker-og-limrester",
    title: "Fjern klistermærker og limrester — fra glas, plast, træ og tøj",
    description:
      "Madolie, eucalyptusolie, sprit, hårtørrer og acetone — den rigtige metode afhænger af overfladen. Få den komplette guide til hver materialetype.",
    publishedAt: "2026-10-04",
    readingMinutes: 7,
    category: "Rengøring",
  },
  {
    slug: "fjern-olie-og-fedtpletter-fra-toej",
    title: "Fjern olie- og fedtpletter fra tøj — også gamle og indtørrede",
    description:
      "Opvaskemiddel, talkum, brun sæbe og galdesæbe. Trin-for-trin for friske og indtørrede fedtpletter — på både hvidt, kulørt og delikate stoffer.",
    publishedAt: "2026-10-05",
    readingMinutes: 8,
    category: "Rengøring",
  },
  {
    slug: "pudse-vinduer-uden-skraber",
    title: "Pudse vinduer uden skraber — sådan får du stribefri ruder",
    description:
      "Mikrofiberklud, avispapir, gummiviskere og den rigtige blanding. Få stribefri, klare vinduer uden professionelt udstyr — i fem trin.",
    publishedAt: "2026-10-06",
    readingMinutes: 6,
    category: "Vinduespudser",
  },
  {
    slug: "lav-dit-eget-vinduespudsemiddel",
    title: "Lav dit eget vinduespudsemiddel — 4 opskrifter der virker",
    description:
      "Eddike, sprit, opvaskemiddel og citronsyre: præcise opskrifter til vinduespudsemiddel der ikke laver striber. Plus advarsler mod blanding du skal undgå.",
    publishedAt: "2026-10-07",
    readingMinutes: 6,
    category: "Vinduespudser",
  },
  {
    slug: "afkalkning-komplet-guide",
    title: "Afkalkning — komplet guide til kaffemaskine, elkedel, bruser og toilet",
    description:
      "Eddike, citronsyre eller specialprodukter? Få den rigtige metode og dosis til hver type apparat og overflade — og undgå skader på pakninger og krom.",
    publishedAt: "2026-10-08",
    readingMinutes: 9,
    category: "Rengøring",
  },
  {
    slug: "rengoering-af-aluminium",
    title: "Rengøring af aluminium — vinduer, gryder, havemøbler og biler",
    description:
      "Aluminium iltes og bliver mat. Få den rigtige metode med eddike, citronsyre, tandpasta eller specialpolish — uden at ridse eller misfarve.",
    publishedAt: "2026-10-09",
    readingMinutes: 7,
    category: "Rengøring",
  },
  {
    slug: "rens-og-vask-af-ruskind",
    title: "Rens og vask af ruskind — sko, jakke og møbler uden at ødelægge dem",
    description:
      "Ruskind tåler ikke vand som almindeligt læder. Få den rigtige proces med ruskindsbørste, viskelæder, fugtbeskyttelse og pletfjerner.",
    publishedAt: "2026-10-10",
    readingMinutes: 7,
    category: "Rengøring",
  },
  {
    slug: "statisk-elektricitet-i-toej-loesninger",
    title: "Statisk elektricitet i tøj — sådan slipper du af med stødene",
    description:
      "Antistatisk spray du selv kan lave, balsam i sidste skyl, tørreklude og hjemmelavede tricks. Forstå hvorfor det opstår — og fix det for godt.",
    publishedAt: "2026-10-11",
    readingMinutes: 6,
    category: "Rengøring",
  },
  {
    slug: "afloeb-lugter-saadan-fjerner-du-lugten",
    title: "Afløb lugter — sådan fjerner du lugten permanent",
    description:
      "Natron + eddike, kogende vand, mekanisk rens og vandlås-tjek. Find årsagen (tør vandlås, kloakgas, biofilm) og løs det rigtigt — uden ætsende midler.",
    publishedAt: "2026-10-12",
    readingMinutes: 8,
    category: "Rengøring",
  },
  {
    slug: "rengoering-af-traeoverflader",
    title: "Rengøring af træoverflader — bordplade, gulv, møbler og terrasse",
    description:
      "Olieret, lakeret, sæbebehandlet eller ubehandlet træ kræver hver sin metode. Få komplet guide til daglig pleje og dybderens uden at ødelægge overfladen.",
    publishedAt: "2026-10-13",
    readingMinutes: 9,
    category: "Rengøring",
  },
  {
    slug: "hvor-ofte-skal-du-goere-rent",
    title: "Hvor ofte skal du gøre rent i hvert rum? Komplet skema",
    description:
      "Køkken, bad, soveværelse, stue og entré — daglige, ugentlige, månedlige og halvårlige opgaver i ét overskueligt skema. Plus tips til at fordele arbejdet.",
    publishedAt: "2026-10-14",
    readingMinutes: 8,
    category: "Rengøring",
  },
  {
    slug: "emaljering-af-badekar",
    title: "Emaljering af badekar — DIY eller fagmand? Pris og proces",
    description:
      "Emaljemaling, fagmand-genemaljering eller udskiftning? Få overblik over levetid, pris (2.500–9.000 kr.), forarbejde og hvornår det betaler sig.",
    publishedAt: "2026-10-15",
    readingMinutes: 8,
    category: "Håndværker",
  },
  {
    slug: "dybdegaaende-rengoering-af-nyt-hjem",
    title: "Dybdegående rengøring af nyt hjem — komplet tjekliste før indflytning",
    description:
      "Skabe, ovn, køl, ventilation, afløb, vinduer, gulve og el-kontakter. Den fulde rækkefølge for hovedrengøring inden du flytter ind — uden at glemme noget.",
    publishedAt: "2026-10-16",
    readingMinutes: 10,
    category: "Flyttehjælp",
  },
];

export const findBlogPost = (slug?: string) =>
  BLOG_POSTS.find((p) => p.slug === slug?.toLowerCase());