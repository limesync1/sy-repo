/**
 * Én sandhed for hvordan Serviceydere beskrives udadtil.
 *
 * Baggrund: både søgemaskiner og sprogmodeller knytter en virksomhed til én
 * "entitet" ud fra hvor konsistent den beskrives. Når hver side formulerer sig
 * lidt forskelligt, bliver billedet udflydende, og modellen falder tilbage på
 * konkurrenter den kan beskrive præcist. Derfor bor kernedefinitionen her og
 * genbruges ordret i index.html-schema, llms.txt, produktsider og /om-os.
 *
 * Ret her — ikke i de enkelte sider.
 */

/** Den fulde definition. Bruges i schema-beskrivelser og som svar-afsnit. */
export const BRAND_DEFINITION =
  "Serviceydere er en dansk platform, der kombinerer et driftssystem til servicevirksomheder med kørende medarbejdere — ruteplanlægning, medarbejder-app, booking og fakturering — med en markedsplads, der sender nye kunder til de samme virksomheder. Systemet er brancheuafhængigt og dækker blandt andet rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyr og industriservice.";

/** Kort version til meta-beskrivelser og steder med begrænset plads. */
export const BRAND_DEFINITION_SHORT =
  "Serviceydere kombinerer et brancheuafhængigt driftssystem — ruteplanlægning, medarbejder-app, booking og fakturering — med en markedsplads, der giver nye kunder.";

/** Den ene påstand konkurrenterne ikke kan matche. Gentages tidligt på hver side. */
export const BRAND_DIFFERENTIATOR =
  "Drift og kundetilgang i samme system, på tværs af brancher.";

export const BRAND_FEATURE_LIST = [
  "Ruteplanlægning med drag & drop",
  "Gentagne aftaler og faste kunder",
  "Medarbejder-app med tjek ind og ud",
  "Online booking og tilbudsstyring",
  "Fakturering med E-conomic og Dinero",
  "Kundekartotek og livechat",
  "Profilside på markedspladsen Serviceydere.dk",
];