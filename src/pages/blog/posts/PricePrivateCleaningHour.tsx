import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "privatrengoering-pris-pr-time",
  keywords:
    "privatrengøring pris pr time, rengøring timepris 2026, fast rengøringshjælp pris, rengøringshjælp pris pr time, hovedrengøring pris",
  faq: [
    { q: "Hvad koster privatrengøring pr. time i 2026?", a: "265–425 kr./time inkl. moms før BoligJob-fradrag. Efter fradrag (25% af arbejdsløn) ender du typisk på 200–320 kr./time. Prisen afhænger af region, frekvens og om du har abonnement eller engangsrengøring." },
    { q: "Hvor mange timer skal jeg booke til 90 m²?", a: "Som tommelfingerregel: 2–3 timer pr. besøg hver 14. dag holder en almindelig lejlighed eller mindre hus. Til hovedrengøring eller flytterengøring skal du regne med 1 time pr. 15–20 m²." },
    { q: "Er der rabat på abonnement?", a: "Ja — fast aftale hver 14. dag giver typisk 10–25% rabat ift. engangsrengøring. Ugentligt giver lidt mere. Til gengæld binder du dig som regel i 3–6 måneder med 1 måneds opsigelse." },
    { q: "Er privatrengøring BoligJob-berettiget?", a: "Ja — almindelig rengøring i din helårsbolig er omfattet af BoligJob-ordningen 2026. Du får 25% retur på arbejdsløn, op til 12.900 kr./person/år. Et par kan altså trække op til 25.800 kr. fra." },
    { q: "Skal jeg selv stille rengøringsmidler til rådighed?", a: "De fleste firmaer medbringer professionelle midler og maskiner uden ekstra omkostning. Vil du have specifikke produkter (allergivenligt, parfumefrit), bør du aftale det i tilbuddet." },
    { q: "Hvad er forskellen på et firma og en privat hjælp?", a: "Et firma er ansvarsforsikret, betaler skat for medarbejderen, og du har én faktura. En privat hjælp er ofte billigere, men du er selv arbejdsgiver, skal indberette løn og har intet sikkerhedsnet ved sygdom eller skade." },
    { q: "Hvad koster det at få vinduer pudset oveni?", a: "Ekstratimer aftales ofte til samme timepris. Alternativt køber du et vinduespudser-besøg separat — 695–1.495 kr. for en almindelig lejlighed." },
  ],
  sections: [
    { paragraphs: [
      "Skal du i gang med at finde fast rengøringshjælp i 2026? Så er timeprisen det første tal du skal forholde dig til — og det er også der prislisterne svinger mest. På landsplan ligger en almindelig privatrengøring på 265–425 kr./time inkl. moms, men forskellen mellem en lille by i Jylland og en lejlighed på Frederiksberg kan godt være 30–40%.",
      "Her får du de aktuelle timepriser pr. region, hvor mange timer du reelt skal bruge til forskellige boligstørrelser, og hvordan du regner BoligJob-fradraget med, så du ikke ender med at betale mere end nødvendigt.",
    ]},
    { heading: "Regionale timepriser inkl. moms (2026)", list: [
      "København + Frederiksberg: 345–425 kr./time",
      "Storkøbenhavn (Lyngby, Hellerup, vestegnen): 315–395 kr./time",
      "Aarhus + Aarhus-omegn: 295–375 kr./time",
      "Odense + Aalborg: 275–345 kr./time",
      "Trekantområdet + Esbjerg: 265–335 kr./time",
      "Mindre byer og provins: 265–315 kr./time",
    ]},
    { heading: "Hvor mange timer skal du bruge?", paragraphs: [
      "Brug det her som realistisk udgangspunkt — selvfølgelig afhænger det af husets stand, antal børn, kæledyr og hvor meget pasningskrav (badeværelser, glasvægge, åbne hylder) der er."
    ], list: [
      "Lejlighed 50–70 m²: 1,5–2 timer hver 14. dag",
      "Hus/lejlighed 70–110 m²: 2–3 timer hver 14. dag",
      "Hus 110–160 m²: 3–4 timer hver 14. dag eller 2 timer ugentligt",
      "Hus 160–220 m²: 4–5 timer hver 14. dag eller 3 timer ugentligt",
      "Hovedrengøring/flytterengøring: 1 time pr. 15–20 m²",
    ]},
    { heading: "Totalpris pr. måned (90 m² lejlighed)", list: [
      "Hver 14. dag, 2 timer (KBH): 1.380–1.700 kr./md før fradrag",
      "Hver 14. dag, 2 timer (provins): 1.060–1.260 kr./md før fradrag",
      "Ugentligt, 2 timer (KBH): 2.760–3.400 kr./md før fradrag",
      "Efter BoligJob-fradrag (par, 25%): ca. 25% lavere på arbejdslønnen",
      "Engangs-hovedrengøring 90 m²: 1.495–2.495 kr.",
    ]},
    { heading: "Sådan får du den rigtige pris i tilbuddet", ordered: [
      "Bed om timepris ekskl. transport, og spørg eksplicit om der er minimum-tid (typisk 2 timer).",
      "Få aftalt frekvens og varighed skriftligt — ikke bare 'hver 14. dag', men 'tirsdage i ulige uger, 2 timer pr. gang'.",
      "Spørg om rengøringsmidler og maskiner er inkluderet. Det er de næsten altid hos firmaer.",
      "Få listet hvad der rengøres (badeværelse, køkken, gulve, støv) — så undgår I diskussion ved første besøg.",
      "Bed om CVR-nummer og forsikringsbevis. Uden CVR er du ikke berettiget til BoligJob-fradrag.",
    ]},
    { heading: "BoligJob-fradraget — sådan regner du", paragraphs: [
      "I 2026 er loftet 12.900 kr. pr. person, og du får 25% retur af arbejdslønnen (ikke moms eller materialer). For et par bor sammen i samme bolig kan I dele udgiften og hver tage fradrag — i praksis betyder det op til 25.800 kr. fradragsberettiget pr. husstand.",
      "Eksempel: Et par betaler 1.700 kr./md (KBH, 2 t hver 14. dag) = 20.400 kr./år. Heraf er fx 17.000 kr. ren arbejdsløn (resten er moms/transport). 25% af 17.000 = 4.250 kr. retur i SKAT. Reel nettoudgift: 16.150 kr./år, eller ca. 1.345 kr./md.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/robotstoevsuger-vs-rengoeringshjaelp">Robotstøvsuger vs. rengøringshjælp — hvad betaler sig?</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-flytterengoering-2026">Hvad koster flytterengøring i 2026?</Link></li>
        <li key="l2"><Link to="/blog/boligjob-fradrag-2026">Komplet guide til BoligJob-fradraget 2026</Link></li>
        <li key="l3"><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du det rigtige rengøringsfirma</Link></li>
        <li key="l4"><Link to="/rengoering">Find rengøring i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
