import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "erhvervsrengoering-pris-pr-m2",
  keywords:
    "erhvervsrengøring pris pr m2, kontorrengøring pris, butiksrengøring pris, lagerrengøring pris, restaurantrengøring pris",
  faq: [
    { q: "Hvad koster erhvervsrengøring pr. m² i 2026?", a: "Kontor 4–9 kr./m², butik 5–11 kr./m², lager 2,5–5 kr./m², klinik 8–14 kr./m², restaurantkøkken 12–22 kr./m² pr. besøg. Prisen afhænger af frekvens, branche og standardkrav (klinik > kontor)." },
    { q: "Er der minimumstid pr. besøg?", a: "Ja — typisk 1,5–2 timer pr. besøg eller minimum 350–550 kr. Det dækker transport og opstart. Mindre lokationer (under 100 m²) ender ofte med at betale 8–14 kr./m² pga. denne minimumsregel." },
    { q: "Hvor ofte skal et kontor rengøres?", a: "Småkontorer (under 100 m², 1–5 ansatte): hver 14. dag. Mellemstore kontorer (100–400 m²): 1–2× ugentligt. Store kontorer + åbne kontorlandskaber: 2–5× ugentligt. Klinikker, lægehuse og fødevarevirksomheder: dagligt." },
    { q: "Er moms og udgift fradragsberettiget?", a: "Ja — virksomheder fratrækker 25% moms fuldt. Arbejdslønnen er en almindelig driftsudgift der kan udgiftsføres 100%. Det reducerer den effektive omkostning markant ift. privatrengøring." },
    { q: "Hvad er forskellen på m²-pris og timepris?", a: "M²-pris er en fast pris pr. besøg uafhængigt af hvor lang tid det tager — du betaler for resultat. Timepris er nem ved enkeltbesøg, men risikerer at tage længere tid end forventet. Til abonnement: altid m²-pris." },
    { q: "Hvor lang opsigelse er normal i erhvervsaftaler?", a: "Standard er 3 måneders opsigelse til en måneds udgang. Mange firmaer prøver at låse 12 måneder fast — undgå binding over 12 mdr. Sæt opsigelse skriftligt i kontrakten." },
    { q: "Hvad bør stå i serviceaftalen (SLA)?", a: "Frekvens pr. opgave (gulve, badeværelser, køkken, skraldespande, glasdøre, støv), responstid ved fejl/sygdom, vikarpolitik, kvalitetstjek (audit hver 3–6 mdr.), og specifik liste over hvad der IKKE er inkluderet." },
  ],
  sections: [
    { paragraphs: [
      "Erhvervsrengøring er et af de mest gennemsigtige indkøb — næsten alle leverandører bruger m²-pris pr. besøg. Til gengæld svinger kvaliteten massivt, og uden en god SLA (service level agreement) ender du ofte med at betale for et resultat du ikke får.",
      "Her er konkrete 2026-priser pr. branche, hvad der bør stå i serviceaftalen, og hvordan du presser prisen 10–20% i et udbud uden at gå på kompromis med kvaliteten.",
    ]},
    { heading: "Priser pr. branche (pr. m² pr. besøg, 2026)", list: [
      "Kontor under 200 m²: 6–9 kr./m²",
      "Kontor 200–800 m²: 4,5–7 kr./m²",
      "Kontor 800+ m² (volumenrabat): 3,5–5,5 kr./m²",
      "Butik/retail: 5–11 kr./m²",
      "Lager (kun gulve/toiletter): 2,5–5 kr./m²",
      "Klinik/lægehus/tandlæge: 8–14 kr./m²",
      "Restaurant (køkken + sal): 12–22 kr./m²",
      "Daginstitution: 9–14 kr./m²",
    ]},
    { heading: "Eksempel: 400 m² kontor, 2 gange/uge", paragraphs: [
      "Realistisk månedlig pris for et almindeligt 400 m² kontor med 25 ansatte, åbent kontorlandskab og 2 badeværelser."
    ], list: [
      "Pris pr. besøg: 400 m² × 5,5 kr. = 2.200 kr.",
      "Besøg pr. md: 8 (2 × ugen, 4 uger)",
      "Månedlig: 2.200 × 8 ≈ 17.600 kr. ekskl. moms",
      "Årlig: ca. 211.200 kr. ekskl. moms",
      "Med vinduespudsning 4× årligt: +8.000–14.000 kr./år",
    ]},
    { heading: "Hvad SKAL stå i SLA'en", list: [
      "Frekvens pr. opgave (gulve dagligt, vinduer månedligt, mv.)",
      "Specifik liste pr. lokation (entrédørmåtter, mødelokaler, køkken, skraldespande)",
      "Responstid ved akut hændelse (typisk samme dag)",
      "Vikarpolitik ved medarbejderens sygdom",
      "Kvalitetstjek pr. kvartal med skriftlig audit",
      "Specifik liste over hvad der IKKE er inkluderet (gulvbehandling, hovedrengøring)",
      "Pris pr. ekstra opgave (hovedrengøring, vinduespudsning, polish)",
    ]},
    { heading: "Sådan får du bedre pris i udbuddet", ordered: [
      "Indhent 3–4 tilbud — markedet er konkurrencepræget, og prisspændet er ofte 20–30% på samme opgave.",
      "Bed om m²-pris pr. besøg, ikke månedligt fast beløb. Så kan du sammenligne æble-til-æble.",
      "Forpligt dig på 12 måneder = 8–15% rabat. Men aldrig binding over 12 mdr.",
      "Saml flere lokationer = volumenrabat 10–20%.",
      "Definér kvalitetsniveau præcist (frekvens af specifikke opgaver). Uden definition kan dårlig kvalitet ikke håndhæves.",
      "Få medarbejderkontinuitet — fast person på lokationen er 30–50% bedre end skiftende vikarer.",
      "Indsæt kvartalsvis audit i kontrakten med ret til at opsige ved gentagne afvigelser.",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/privatrengoering-pris-pr-time">Privatrengøring pris pr. time</Link></li>
        <li key="l1"><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du det rigtige rengøringsfirma</Link></li>
        <li key="l2"><Link to="/blog/erhvervsrengoering-kontrakt-tjekliste">Tjekliste til erhvervsrengøringskontrakt</Link></li>
        <li key="l3"><Link to="/blog/akustikregulering-kontor-stojdaempning-pris">Akustikregulering på kontoret</Link></li>
        <li key="l4"><Link to="/erhvervsrengoering">Find erhvervsrengøring</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
