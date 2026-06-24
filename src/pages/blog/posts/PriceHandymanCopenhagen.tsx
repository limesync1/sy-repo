import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haandvaerker-koebenhavn-timepris-2026",
  keywords:
    "håndværker København timepris 2026, allround håndværker pris kbh, handyman københavn pris, hvad koster en handyman, håndværker pris pr time",
  faq: [
    { q: "Hvad koster en handyman i København pr. time i 2026?", a: "495–695 kr./time inkl. moms for allround håndværker. Faglærte specialer (elektriker, VVS, murer) ligger 595–895 kr./time. Akut udkald uden for arbejdstid: 895–1.495 kr./time." },
    { q: "Hvad er forskellen på fagmand og handyman?", a: "Handyman løser småjobs på tværs af fag: montering, opsætning, små reparationer. Fagmand er certificeret indenfor ét specifikt fag (el, VVS, murer, tømrer) og MÅ udføre autorisationspligtigt arbejde — handymand må ikke." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al arbejde på helårsbolig giver 25% retur på arbejdslønnen, op til 12.900 kr./person/år i 2026. Et par kan dele udgiften. Krav: CVR + digital betaling." },
    { q: "Hvad koster et udkald?", a: "Typisk 1 times kørsel + minimum 1 times arbejde, eller fast udkaldspris 895–1.395 kr. Samles flere småopgaver i ét besøg sparer du 25–40%." },
    { q: "Hvad må en handyman IKKE lave?", a: "Faste el-installationer (kun autoriseret elektriker), vand- og afløbsinstallationer der kræver autorisation, gasinstallationer og bærende konstruktioner. Han må gerne skifte stikkontakter på eksisterende installation hvis han er fagligt kompetent." },
    { q: "Hvor mange tilbud bør jeg indhente?", a: "På opgaver over 5.000 kr.: minimum 2–3 tilbud. På små opgaver under 2.000 kr.: ét tilbud rækker — tiden brugt på sammenligning æder rabatten." },
    { q: "Hvad koster en time hos en handyman på Frederiksberg vs. vestegnen?", a: "Frederiksberg + Indre By: 595–695 kr./time. Vestegnen (Glostrup, Albertslund): 495–595 kr./time. Forskel på ca. 100 kr./time = 800 kr. på en 8-timers opgave." },
  ],
  sections: [
    { paragraphs: [
      "En handyman i København dækker alt fra at samle et PAX-skab til at hænge gardiner op og skifte en vandhane — alle de småopgaver hvor det er overkill at tilkalde en specialist. Timeprisen ligger 495–695 kr. inkl. moms, men den reelle udgift afhænger af kørsel, minimumstid og om opgaven egentlig kræver en fagmand i stedet.",
      "Her får du de aktuelle KBH-priser pr. bydel, faste priser på de mest bookede småopgaver, og en klar tjekliste over hvornår du sparer penge på at hyre en specialist i stedet for en handyman.",
    ]},
    { heading: "Timepris pr. bydel (inkl. moms 2026)", list: [
      "Indre By + Frederiksberg: 595–695 kr./time",
      "Vesterbro / Nørrebro / Østerbro: 545–645 kr./time",
      "Amager + Valby + Vanløse: 525–625 kr./time",
      "Hellerup + Charlottenlund + Gentofte: 595–695 kr./time",
      "Lyngby + Virum: 565–665 kr./time",
      "Vestegnen (Glostrup, Albertslund, Hvidovre): 495–595 kr./time",
    ]},
    { heading: "Faste priser på typiske KBH-opgaver", list: [
      "Hænge billeder/spejle op (5 stk.): 750–1.295 kr.",
      "Samle IKEA PAX-skab (3 lågers): 1.295–2.495 kr.",
      "Samle køkken-bordplade (laminat): 1.495–2.995 kr.",
      "Skifte vandhane køkken/bad: 695–1.495 kr.",
      "Skifte 5 stikkontakter (m. autoriseret elektriker): 1.795–2.995 kr.",
      "Opsætning af gardinstænger (3 vinduer): 595–1.295 kr.",
      "Tætning af badeværelse (silikonefuger): 1.495–2.495 kr.",
      "Skifte dørhåndtag/låsecylinder: 495–1.495 kr./stk.",
      "Reparation af dørkarm/list: 695–1.795 kr.",
      "Akut tilkald (storm/lækage): 1.495–2.995 kr. startpris",
    ]},
    { heading: "Handyman eller fagmand — hvornår sparer du?", paragraphs: [
      "Tommelfingerregel: handyman på alt der er montering eller småreparation. Fagmand så snart der skal røres ved installationer (el, vand, gas, kloak) eller bærende konstruktioner.",
    ], list: [
      "Hænge skab op: handyman (500 kr./time billigere).",
      "Lægge ny vandlås under vask: handyman ok.",
      "Skifte radiatorventil: VVS (autorisation).",
      "Skifte stikkontakt på eksisterende installation: handyman ok hvis han er fagligt kompetent.",
      "Trække ny ledning, ny gruppe i tavlen: autoriseret elektriker.",
      "Reparere defekt karm: tømrer (præcision).",
    ]},
    { heading: "Sådan får du den bedste pris", ordered: [
      "Saml alle småopgaver til ét besøg — du betaler kun ét udkald og én opstart.",
      "Send fotos før tilbuddet — du får en mere realistisk pris og undgår overraskelser.",
      "Spørg om timepris ekskl. materialer, og bed om at indkøbe selv (IKEA-dele, fittings).",
      "Få oplyst kørselstakst og minimumstid skriftligt.",
      "Bed om CVR + ansvarsforsikring (krav for BoligJob-fradrag).",
      "Forhandl prisen ned 5–10% mod kontant samme dag eller MobilePay-betaling.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/goer-det-selv-vs-haandvaerker">DIY vs. håndværker — hvornår betaler det sig?</Link></li>
        <li key="l1"><Link to="/blog/toemrer-timepris-2026">Tømrer timepris 2026</Link></li>
        <li key="l2"><Link to="/blog/hvornaar-skal-du-have-autoriseret-elektriker">Hvornår skal du have autoriseret elektriker?</Link></li>
        <li key="l3"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026 — komplet guide</Link></li>
        <li key="l4"><Link to="/haandvaerker/koebenhavn">Find håndværker i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
