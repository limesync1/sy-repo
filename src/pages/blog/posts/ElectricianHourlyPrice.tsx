import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "hvad-koster-elektriker-pr-time-2026",
  keywords:
    "elektriker pris pr time 2026, timepris autoriseret elektriker, hvad koster elektriker, elektriker pris København, elektriker tilkald pris, fejlfinding elektriker pris, ladestander installation pris",
  faq: [
    { q: "Hvad koster en elektriker pr. time i 2026?", a: "525–795 kr./time inkl. moms for autoriseret elektriker. Mester ligger typisk 695–795 kr., svend 545–645 kr. København + Frederiksberg er 15–20% dyrere end resten af landet." },
    { q: "Hvad koster akut tilkald aften/nat/weekend?", a: "Hverdage efter 16: 50% tillæg. Nat (22–06) + weekend: 75–100% tillæg. Akut tilkald koster typisk 1.200–1.800 kr. i opstart + 875–1.350 kr./time. Helligdage 100%+ tillæg." },
    { q: "Er elektriker BoligJob-berettiget?", a: "Ja — al installation, reparation og vedligehold i helårsbolig giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år i 2026. Et par kan tilsammen trække 25.800 kr. Materialer (kabler, stikkontakter, HPFI) tæller ikke." },
    { q: "Fast pris eller timepris — hvad er bedst?", a: "Fast pris på defineret opgave (skifte 5 stik, montere lampeudtag, sætte HPFI op). Timepris ved fejlfinding hvor omfanget er ukendt. Bed altid om timeestimat selv på timepris — så har du noget at holde elektrikeren op på." },
    { q: "Hvad må jeg selv som privat?", a: "Du må: skifte pære, lampeudtag på eksisterende montage, og stikkontakter med samme antal poler uden ny føring. Du må IKKE: lave nye føringer, røre eltavlen, installere ladestander, eller arbejde i fast installation. Brud på reglerne kan annullere din indboforsikring." },
    { q: "Hvad koster en ladestander til elbil hjemme?", a: "Komplet installation 3-fase 11–22 kW: 9.500–18.000 kr. inkl. kabel, opsætning og evt. tavle-opgradering. Tilskud via Skatteministeriets ladestanderfradrag er ophørt for nye opsætninger fra 2024, men afgiftsrefusion på el til ladning gælder stadig." },
    { q: "Hvor finder jeg en autoriseret elektriker?", a: "Tjek altid el-installatørens autorisation på Sikkerhedsstyrelsens register (sik.dk). Uautoriseret arbejde ugyldiggør forsikring og er strafbart. Få mindst 3 tilbud — prisspredningen er typisk 25–40%." },
    { q: "Hvad koster opstartsgebyr/kørsel?", a: "Opstart + kørsel: 350–650 kr. inkl. moms i nærområdet (op til 20 km). Over 20 km: 8–12 kr./km. Mange elektrikere fjerner opstartsgebyret hvis du booker over 4 timers arbejde i samme besøg." },
  ],
  sections: [
    { paragraphs: [
      "Timeprisen på en autoriseret elektriker svinger 35–45% mellem region og opgavetype i 2026. Den største faktor er ikke geografi men hvornår du ringer: et akuttilkald lørdag aften kan koste 3–4× en planlagt hverdagsbooking.",
      "Her er hele billedet — regionale timepriser, faste priser på de mest bestilte opgaver, hvad du selv må, og hvordan du i praksis skærer 20–40% af regningen uden at gå på kompromis med sikkerheden.",
    ]},
    { heading: "Regionale timepriser inkl. moms (2026)", list: [
      "København + Frederiksberg: 645–795 kr./time",
      "Storkøbenhavn (Gentofte, Lyngby, Hellerup): 625–775 kr./time",
      "Aarhus + omegn: 595–745 kr./time",
      "Odense + Aalborg: 565–695 kr./time",
      "Mindre byer + landområder: 525–625 kr./time",
      "Akut nat/weekend (alle regioner): 875–1.350 kr./time + 1.200–1.800 kr. udkald",
    ]},
    { heading: "Faste priser på de mest bestilte opgaver", list: [
      "Skifte stikkontakt (eksisterende dåse): 450–750 kr.",
      "Installere lampeudtag inkl. fremføring: 950–1.650 kr.",
      "Sætte ny stikkontakt op (med ny føring): 1.250–2.450 kr.",
      "HPFI-relæ udskiftning: 2.200–3.500 kr.",
      "Komplet eltavle-renovering (parcelhus): 18.500–32.000 kr.",
      "Ladestander 3-fase 11–22 kW: 9.500–18.000 kr. inkl. installation",
      "Fejlfinding kortslutning (1–3 timer): 1.450–3.250 kr.",
      "Tilstandsrapport el-installation (boligrapport): 2.800–4.500 kr.",
    ]},
    { heading: "Hvad må du selv lave?", paragraphs: [
      "Reglerne er strikse — og uautoriseret arbejde kan både ugyldiggøre din indboforsikring og udløse bøder. Det her må du selv:",
    ], list: [
      "Skifte pære, lyskilde og LED-driver",
      "Skifte lampeudtag (loftrose) hvor montagen allerede findes",
      "Skifte stikkontakt med samme antal poler — uden at lave ny føring",
      "Tilslutte stikproppede apparater (lamper, hvidevarer) til eksisterende stik",
    ]},
    { heading: "Hvad må du IKKE selv?", list: [
      "Lave nye føringer eller flytte stikkontakter",
      "Arbejde i eltavlen (HPFI, gruppeafbrydere, hovedafbryder)",
      "Installere ladestander til elbil",
      "Lave faste tilslutninger på induktionskogeplader, ovne eller varmepumper",
      "Arbejde i vådrum (klasse 0–2 zoner ved bad og bruser)",
    ]},
    { heading: "Sådan skærer du 20–40% af regningen", ordered: [
      "Saml flere opgaver i samme besøg — du betaler kun ét opstartsgebyr.",
      "Få fast pris på alt der kan defineres (skifte X stik, montere Y lamper). Timepris kun til fejlfinding.",
      "Hent 3 tilbud — selv på akutopgaver, hvor det er muligt. Prisspredning er typisk 25–40%.",
      "Brug BoligJob-fradraget hver gang. Bed elektrikeren specificere arbejdsløn separat på fakturaen.",
      "Vælg en hverdag mellem 8–15. Undgå mandag morgen og fredag eftermiddag (mest pres på kalenderen).",
      "Tjek autorisation på sik.dk inden booking — uautoriseret arbejde er værre end ingen.",
    ]},
    { heading: "Reel pris efter BoligJob (eksempler)", list: [
      "Skifte 6 stikkontakter + 2 lampeudtag (3 timer): 4.200 kr. → ca. 3.400 kr. efter fradrag",
      "HPFI + 4 stik renovering: 7.800 kr. → ca. 6.300 kr. efter fradrag",
      "Ladestander installation: 13.500 kr. → ca. 10.700 kr. efter fradrag (kun arbejdsløn fradrag)",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvornaar-skal-du-have-autoriseret-elektriker">Hvornår skal du have autoriseret elektriker?</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-akut-vvs-tilkald">Akut VVS-tilkald — hvad koster det?</Link></li>
        <li key="l2"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026 — komplet guide</Link></li>
        <li key="l3"><Link to="/blog/fast-pris-eller-timepris-haandvaerker">Fast pris eller timepris — hvad er bedst?</Link></li>
        <li key="l4"><Link to="/blog/saadan-bestiller-du-haandvaerker-rigtigt">Sådan bestiller du håndværker rigtigt</Link></li>
      </ul>
    ) },
  ],
});

export default Post;