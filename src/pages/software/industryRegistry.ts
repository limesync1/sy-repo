/**
 * Alle udekørende servicebrancher og underbrancher. Hver branche får en
 * offentlig systemside på /software/branche/{slug}, som også bruges af
 * sitemap og forudrenderet HTML. Teksterne bygges ud fra branchens
 * arbejdsform, så ingen side opfinder priser, kunder eller tal.
 */
import type { SoftwareConfig } from "./defineSoftwarePage";

type Mode = "recurring" | "seasonal" | "project" | "emergency" | "inspection";

export interface Industry {
  slug: string;
  label: string;
  /** Firmaer i flertal, fx "snerydningsfirmaer". */
  firms: string;
  group: string;
  mode: Mode;
  subs: string[];
}

const I = (slug: string, label: string, firms: string, group: string, mode: Mode, subs: string[]): Industry =>
  ({ slug, label, firms, group, mode, subs });

export const INDUSTRIES: Industry[] = [
  // Rengøring og pleje af bygninger
  I("privatrengoering", "Privatrengøring", "rengøringsfirmaer til private", "Rengøring", "recurring", ["Fast ugentlig rengøring", "Rengøring hver 14. dag", "Hovedrengøring", "Flytterengøring", "Rengøring efter håndværkere"]),
  I("erhvervsrengoering", "Erhvervsrengøring", "erhvervsrengøringsfirmaer", "Rengøring", "recurring", ["Kontorrengøring", "Butiksrengøring", "Institutionsrengøring", "Trappevask", "Rengøring af fællesarealer"]),
  I("trappevask", "Trappevask", "trappevaskfirmaer", "Rengøring", "recurring", ["Trappevask i boligforeninger", "Vask af kælder og vaskeri", "Pudsning af opgangsvinduer", "Måtteservice"]),
  I("vinduespolering", "Vinduespolering", "vinduespoleringsfirmaer", "Rengøring", "recurring", ["Vinduespudsning hos private", "Erhvervsvinduer og butiksruder", "Rentvandsanlæg og teleskopstang", "Ovenlys og glastage", "Solcellerens"]),
  I("tagrenderens", "Tagrenderens", "firmaer der renser tagrender", "Rengøring", "seasonal", ["Rensning af tagrender", "Rensning af nedløbsrør", "Montering af bladfang"]),
  I("facaderens", "Facaderens", "facaderensfirmaer", "Rengøring", "project", ["Algebehandling af facade", "Graffitifjernelse", "Højtryksrens af murværk", "Imprægnering"]),
  I("tagrens", "Tagrens", "tagrensfirmaer", "Rengøring", "project", ["Algebehandling af tag", "Afrensning af mos", "Tagmaling", "Imprægnering af tag"]),
  I("fliserens", "Fliserens", "fliserensfirmaer", "Rengøring", "seasonal", ["Rens af terrasse og indkørsel", "Fugning med fugesand", "Imprægnering af fliser", "Algebehandling af belægning"]),
  I("solcellerens", "Solcellerens", "firmaer der renser solceller", "Rengøring", "recurring", ["Rens af solceller på villaer", "Rens af erhvervsanlæg", "Rens af solfangere"]),
  I("taepperens", "Tæpperens", "tæpperensfirmaer", "Rengøring", "project", ["Tæpperens hos private", "Møbelrens", "Madrasrens", "Rens af kontorstole"]),
  I("skadeservice", "Skadeservice", "skadeservicefirmaer", "Rengøring", "emergency", ["Vandskade og affugtning", "Brand- og sodskade", "Skimmelsanering", "Kloakoversvømmelse"]),
  I("vaskeriservice", "Vaskeri og måtteservice", "vaskerier og måtteserviceer", "Rengøring", "recurring", ["Måtteudskiftning", "Arbejdstøj", "Linned og håndklæder", "Hentning og levering"]),

  // Have og udeområder
  I("haveservice", "Haveservice", "haveservicefirmaer", "Have og udeareal", "recurring", ["Græsslåning", "Hækklipning", "Lugning", "Beskæring", "Bortkørsel af haveaffald"]),
  I("graesslaaning", "Græsslåning", "firmaer der slår græs", "Have og udeareal", "recurring", ["Fast græsslåning", "Robotplæneklipper-service", "Kantklipning", "Vertikalskæring"]),
  I("haekklipning", "Hækklipning", "firmaer der klipper hække", "Have og udeareal", "seasonal", ["Hækklipning af liguster og bøg", "Nedskæring af høje hække", "Bortkørsel af afklip"]),
  I("anlaegsgartner", "Anlægsgartner", "anlægsgartnere", "Have og udeareal", "project", ["Belægning og fliser", "Terrasser", "Beplantning", "Dræn", "Haveanlæg"]),
  I("traefaeldning", "Træfældning", "træfældningsfirmaer", "Have og udeareal", "project", ["Træfældning", "Topkapning", "Stubfræsning", "Beskæring af store træer"]),
  I("snerydning", "Snerydning", "snerydningsfirmaer", "Have og udeareal", "seasonal", ["Snerydning af indkørsler", "Saltning og glatførebekæmpelse", "Snerydning for boligforeninger", "Snerydning af p-pladser", "Vintervagt"]),
  I("groen-pleje-erhverv", "Grøn pleje for erhverv", "firmaer med grøn pleje for erhverv", "Have og udeareal", "recurring", ["Pleje af boligforeningers arealer", "Pleje af erhvervsarealer", "Ukrudtsbekæmpelse", "Fejning"]),
  I("ukrudtsbekaempelse", "Ukrudtsbekæmpelse", "firmaer der bekæmper ukrudt", "Have og udeareal", "recurring", ["Ukrudt på belægning", "Termisk ukrudtsbekæmpelse", "Fugeukrudt"]),
  I("poolservice", "Pool- og spaservice", "poolservicefirmaer", "Have og udeareal", "recurring", ["Vandbehandling", "Opstart og vinterlukning", "Rens af spabad"]),
  I("vandingsanlaeg", "Vandingsanlæg", "firmaer der installerer vandingsanlæg", "Have og udeareal", "seasonal", ["Installation af vandingsanlæg", "Forårsopstart", "Vintersikring"]),

  // Håndværk
  I("elektriker", "Elektriker", "elinstallatører", "Håndværk", "project", ["Elinstallation", "Ladestandere", "Eltjek", "Fejlfinding", "Belysning"]),
  I("vvs", "VVS", "VVS-firmaer", "Håndværk", "emergency", ["Stoppede afløb", "Toilet og armaturer", "Fjernvarmeunits", "Gasfyrservice", "Blikkenslagerarbejde"]),
  I("varmepumpe", "Varmepumpe og køleteknik", "varmepumpe- og kølefirmaer", "Håndværk", "inspection", ["Luft-til-luft varmepumper", "Luft-til-vand varmepumper", "Årligt eftersyn", "Køle- og frostanlæg"]),
  I("toemrer", "Tømrer og snedker", "tømrerfirmaer", "Håndværk", "project", ["Døre og vinduer", "Terrasser", "Tag og udhæng", "Stormskader", "Køkkenmontering"]),
  I("maler", "Maler", "malerfirmaer", "Håndværk", "project", ["Indvendig maling", "Facademaling", "Spartling og filt", "Fraflytningsmaling"]),
  I("murer", "Murer", "murerfirmaer", "Håndværk", "project", ["Omfugning", "Pudsning af sokkel", "Fliser i badeværelser", "Sætningsrevner"]),
  I("tagdaekker", "Tagdækker", "tagdækkerfirmaer", "Håndværk", "project", ["Nyt tag", "Tagpap", "Tagreparation", "Inddækninger"]),
  I("gulvlaegger", "Gulvlægger", "gulvfirmaer", "Håndværk", "project", ["Gulvafslibning", "Lægning af trægulv", "Vinyl og linoleum", "Gulvbehandling"]),
  I("laasesmed", "Låsesmed", "låsesmede", "Håndværk", "emergency", ["Døroplukning", "Cylinderskift", "Kodelåse og adgangskontrol", "Sikringsrådgivning"]),
  I("glarmester", "Glarmester", "glarmestre", "Håndværk", "emergency", ["Akut ruderskift", "Energiruder", "Spejle og glasværn"]),
  I("handyman", "Handyman", "handymen", "Håndværk", "project", ["Småreparationer", "Montering af møbler", "Ophængning", "Vicevært-opgaver"]),
  I("vicevaert", "Viceværtservice", "viceværtfirmaer", "Håndværk", "recurring", ["Tilsyn med ejendomme", "Småreparationer", "Affaldshåndtering", "Pleje af fællesarealer"]),
  I("solcelleinstallation", "Solcelleinstallation", "solcellefirmaer", "Håndværk", "project", ["Montering af solceller", "Batterier", "Service og eftersyn"]),

  // Miljø, kloak og forsyning
  I("kloakmester", "Kloakmester og slamsuger", "kloakfirmaer", "Miljø og forsyning", "emergency", ["Højtryksspuling", "TV-inspektion", "Strømpeforing", "Rottespærrer", "Tømning af septiktanke"]),
  I("skadedyrsbekaempelse", "Skadedyrsbekæmpelse", "skadedyrsfirmaer", "Miljø og forsyning", "inspection", ["Rotter og mus", "Hvepsebo", "Væggelus og kakerlakker", "Mår", "Fast sikringsaftale"]),
  I("skorstensfejer", "Skorstensfejer og ventilation", "skorstensfejere og ventilationsfirmaer", "Miljø og forsyning", "inspection", ["Fejning af skorsten", "Brændeovne", "Ventilationsrens", "Genvexanlæg"]),
  I("fugt-og-skimmel", "Fugt og skimmel", "fugt- og skimmelfirmaer", "Miljø og forsyning", "project", ["Fugtmåling", "Affugtning", "Skimmelsanering", "Termografi"]),
  I("affaldshaandtering", "Affald og containerservice", "affalds- og containerfirmaer", "Miljø og forsyning", "recurring", ["Tømning af containere", "Vask af affaldsspande", "Storskrald", "Genbrug for erhverv"]),
  I("brandsikring", "Brandsikring", "brandsikringsfirmaer", "Miljø og forsyning", "inspection", ["Eftersyn af brandslukkere", "Røgalarmer", "Nødbelysning", "Brandtætning"]),

  // Bil, cykel og mobilt værksted
  I("mobil-bilpleje", "Mobil bilpleje", "mobile bilplejefirmaer", "Mobilt værksted", "recurring", ["Håndvask på adressen", "Indvendig rens", "Lakforsegling", "Firmabiler"]),
  I("mobil-daekservice", "Mobil dækservice", "mobile dækfirmaer", "Mobilt værksted", "seasonal", ["Hjulskift hjemme", "Hjulskift på arbejdspladsen", "Dækhotel", "Lapning"]),
  I("mobil-cykelservice", "Mobil cykelservice", "mobile cykelværksteder", "Mobilt værksted", "recurring", ["Cykelservice på adressen", "Ladcykler og elcykler", "Firmacykler"]),
  I("forrudeskift", "Forrudeskift og stenslag", "rudefirmaer til biler", "Mobilt værksted", "emergency", ["Stenslagsreparation", "Forrudeskift", "Kalibrering af kamera"]),

  // Flytning og transport
  I("flyttefirma", "Flyttefirma", "flyttefirmaer", "Flytning og transport", "project", ["Privatflytning", "Erhvervsflytning", "Pakkeservice", "Klaverflytning", "Opmagasinering"]),
  I("bortkoersel", "Bortkørsel og rydning", "firmaer til bortkørsel", "Flytning og transport", "project", ["Storskrald", "Dødsboer", "Loftsrydning", "Byggeaffald"]),
  I("budservice", "Bud og levering", "budfirmaer", "Flytning og transport", "recurring", ["Faste leveringsruter", "Kurerkørsel", "Varelevering til erhverv"]),

  // Personlig og hjemmeservice
  I("hjemmepleje", "Privat hjemmehjælp", "private hjemmehjælpsfirmaer", "Hjemmeservice", "recurring", ["Praktisk hjælp", "Indkøb", "Ledsagelse", "Tøjvask"]),
  I("hundeluftning", "Hundeluftning og dyrepasning", "hundeluftere og dyrepassere", "Hjemmeservice", "recurring", ["Daglig hundeluftning", "Pasning i hjemmet", "Kattepasning"]),
  I("mobil-frisoer", "Mobil frisør og fodpleje", "mobile frisører og fodplejere", "Hjemmeservice", "recurring", ["Frisør i hjemmet", "Fodpleje i hjemmet", "Besøg på plejehjem"]),
  I("it-support", "IT-support på adressen", "IT-supportfirmaer", "Hjemmeservice", "project", ["Opsætning af netværk", "Hjælp til computer", "TV og antenne"]),
  I("hvidevarereparation", "Hvidevarereparation", "hvidevareteknikere", "Hjemmeservice", "emergency", ["Vaskemaskine", "Opvaskemaskine", "Køleskab", "Ovn og komfur"]),
  I("serviceteknikere", "Serviceteknikere og eftersyn", "servicetekniker-firmaer", "Hjemmeservice", "inspection", ["Kaffemaskiner", "Vandautomater", "Porte og døre", "Elevatorer"]),
];

export const industryHref = (i: Industry) => `/software/branche/${i.slug}`;
export const findIndustry = (slug?: string) => INDUSTRIES.find((i) => i.slug === slug);

const MODE_TEXT: Record<Mode, { focus: string; plan: string; tip: string; faqQ: string; faqA: string }> = {
  recurring: {
    focus: "faste kunder med besøg hver uge, hver 14. dag eller hver måned",
    plan: "Opret aftalen én gang med interval. Serviceydere laver selv næste besøg, når det forrige er udført, og lægger det i puljen, så det kan sættes på en rute.",
    tip: "Saml kunder i samme område på samme dag. Det giver færre kilometer og flere besøg pr. medarbejder.",
    faqQ: "Kan besøgene gentage sig automatisk?",
    faqA: "Ja. Du vælger interval på aftalen, og næste besøg oprettes, når det forrige er markeret som udført.",
  },
  seasonal: {
    focus: "travle sæsoner, hvor mange kunder skal besøges på kort tid",
    plan: "Læg sæsonens kunder ind på forhånd og fordel dem på ruter pr. medarbejder. Når sæsonen starter, er dagene allerede planlagt.",
    tip: "Brug ruteoptimering til at finde den hurtigste rækkefølge, når der er mange stop på én dag.",
    faqQ: "Kan jeg planlægge en hel sæson på forhånd?",
    faqA: "Ja. Kunder og aftaler kan lægges ind før sæsonen og fordeles på ruter dag for dag.",
  },
  project: {
    focus: "opgaver, der skal gives tilbud på, planlægges og faktureres",
    plan: "Giv tilbud, opret bestillingen, sæt medarbejdere på og fakturer, når opgaven er udført. Opgaver kan strække sig over flere dage.",
    tip: "Lad medarbejderne tage før/efter-billeder. Så er der dokumentation, hvis kunden har spørgsmål bagefter.",
    faqQ: "Kan en opgave vare flere dage?",
    faqA: "Ja. En opgave kan planlægges over flere dage og fordeles på flere medarbejdere.",
  },
  emergency: {
    focus: "akutte udkald blandet med planlagte opgaver",
    plan: "Se med det samme, hvem der er nærmest, og flyt et stop ind på dagens rute. Medarbejderen får opgaven i appen med adresse og noter.",
    tip: "Hold plads i planen til akutte opgaver, så resten af dagens kunder ikke bliver forsinket.",
    faqQ: "Kan jeg få et akut udkald ind på dagens rute?",
    faqA: "Ja. Du kan tilføje et stop til en rute i løbet af dagen, og medarbejderen ser det i appen.",
  },
  inspection: {
    focus: "faste eftersyn og serviceaftaler, der skal huskes år efter år",
    plan: "Opret serviceaftalen med interval, fx hvert år. Serviceydere husker næste eftersyn og kan sende påmindelse til kunden før besøget.",
    tip: "Brug noter og billeder på hvert besøg, så næste medarbejder ved, hvad der blev lavet sidst.",
    faqQ: "Kan systemet huske næste eftersyn?",
    faqA: "Ja. Med et interval på aftalen oprettes næste eftersyn automatisk, og kunden kan få påmindelse på SMS eller e-mail.",
  },
};

export function industryConfig(i: Industry): SoftwareConfig {
  const t = MODE_TEXT[i.mode];
  const lower = i.label.toLowerCase();
  const subs = i.subs.slice(0, 4).map((s) => s.toLowerCase()).join(", ");
  return {
    canonicalPath: industryHref(i),
    metaTitle: `System til ${i.firms} — ruteplanlægning | Serviceydere`.slice(0, 90),
    metaDescription: `Ruteplanlægning, medarbejder-app og fakturering til ${i.firms}: ${subs}. Prøv gratis i 30 dage uden betalingskort.`,
    keywords: `system til ${lower}, ${lower} software, program til ${lower}, ruteplanlægning ${lower}, ${i.subs.map((s) => s.toLowerCase()).join(", ")}`,
    heroEyebrow: `Til ${i.firms}`,
    heroTitle: `System til ${lower}`,
    heroSubtitle: `Planlæg ruter, styr medarbejdere og fakturer — bygget til ${t.focus}.`,
    breadcrumbLabel: i.label,
    answer: `Serviceydere er et dansk system til ${i.firms}. Det samler kunder, faste aftaler, ruteplanlægning, en medarbejder-app med manuel tidsregistrering og fakturering med e-conomic eller Dinero. Det passer til ${t.focus} — fx ${subs}.`,
    facts: [
      "Ruteplanlægger med hurtigste rækkefølge og køretid",
      "Medarbejder-app med dagens rute, noter og frivillige før/efter-billeder",
      "Manuel tidsregistrering pr. besøg",
      "Fakturainterval: efter hvert besøg, hver 14. dag, månedligt eller kvartalsvis",
      "Bogføring i e-conomic og Dinero",
      "30 dages gratis prøve uden betalingskort",
    ],
    sections: [
      { heading: `Sådan planlægger ${i.firms} med Serviceydere`, paragraphs: [t.plan, t.tip] },
      { heading: `Opgaver inden for ${lower}`, list: i.subs.map((s) => `${s} — opret som service med egen pris uden moms og eget interval.`) },
      {
        heading: "Fra udført besøg til betalt faktura",
        paragraphs: [
          "Når medarbejderen markerer besøget som udført i appen, er det klar til fakturering. Med fakturainterval kan flere besøg samles på én faktura, og fakturaen sendes til jeres regnskabsprogram.",
          "Kunden kan selv se sine aftaler og fakturaer i kundeportalen.",
        ],
      },
      {
        heading: "Kom i gang på en eftermiddag",
        list: [
          "Opret jeres services og priser.",
          "Læg kunder og faste aftaler ind — eller få dem flyttet over fra jeres nuværende system af vores kundeservice.",
          "Opret medarbejdere, så de kan hente appen.",
          "Planlæg den første rute.",
        ],
      },
    ],
    faq: [
      { q: `Passer Serviceydere til ${i.firms}?`, a: `Ja. Systemet er lavet til udekørende servicefirmaer, herunder ${i.firms} med opgaver som ${subs}.` },
      { q: t.faqQ, a: t.faqA },
      { q: "Kan I flytte vores data over?", a: "Ja. Kundeservice kan flytte kunder, aftaler, services, ruter, medarbejdere og noter over fra jeres nuværende system." },
      { q: "Skal jeg bruge betalingskort for at prøve?", a: "Nej. Du kan prøve Serviceydere gratis i 30 dage uden betalingskort." },
    ],
    cta: { heading: `Prøv Serviceydere til ${lower}`, body: "Opret jeres første rute i dag. 30 dages gratis prøve, intet betalingskort." },
  };
}
