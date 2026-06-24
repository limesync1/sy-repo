import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const WindowCleanerOrDIY = defineBlogPost({
  slug: "vinduespudser-eller-selv",
  keywords:
    "vinduespudser pris, vinduespudsning pris pr vindue, vinduespudser abonnement, gør det selv vinduespudsning, osmosevand",
  faq: [
    { q: "Hvad koster en vinduespudser pr. vindue?", a: "Typisk 18–35 kr. pr. vindue inkl. moms ved fast abonnement, og 40–60 kr. pr. vindue ved engangsbesøg. Højhuse og svært tilgængelige vinduer koster mere." },
    { q: "Hvor ofte bør vinduerne pudses?", a: "I byen typisk hver 4.–6. uge, på landet eller i forstæder hver 8.–12. uge. Vinduer mod trafikerede veje bliver hurtigere snavsede end mod baghaven." },
    { q: "Er vinduespudsning fradragsberettiget?", a: "Ja — udvendig og indvendig vinduespudsning er omfattet af BoligJob-ordningen, så længe arbejdet er udført af en momsregistreret virksomhed og betalt elektronisk." },
    { q: "Bruger professionelle vinduespudsere kemi?", a: "De fleste bruger rent osmosevand (afsaltet vand) til udvendig pudsning, så ruderne tørrer stribefrit uden sæberester. Til fedtede køkkenvinduer indvendigt bruges mildt opvaskemiddel." },
    { q: "Hvor lang opsigelse er rimelig?", a: "Maks 1 måneds opsigelse er normen. Pas på 6 måneders bindingsperioder — de er sjældent nødvendige og giver dig dårlig forhandlingsposition." },
    { q: "Hvad er forskellen på et vindue og et vinduesfag?", a: "Et vinduesfag er én ramme. Et dannebrogsvindue tæller fx som 2–4 fag. Pudsere fakturerer pr. fag, så vær præcis i tilbudsindhentningen." },
    { q: "Kan vinduerne pudses i regnvejr?", a: "Ja — det er en myte at regn ødelægger pudsningen. Med rent vand og skraber bliver ruden ren og tørrer stribefrit, uanset om det regner samme aften." },
  ],
  sections: [
    {
      paragraphs: [
        "Spørgsmålet kommer hver forår: skal jeg booke en vinduespudser, eller skal jeg klare det selv? Svaret afhænger af antal vinduer, hvor højt de sidder, og hvor meget din egen tid er værd. Her får du de faktiske 2026-priser og en ærlig sammenligning.",
      ],
    },
    {
      heading: "Hvad koster en professionel vinduespudser i 2026?",
      list: [
        "Fast abonnement, lejlighed (6–8 fag): 150–250 kr. pr. besøg",
        "Fast abonnement, parcelhus (20 fag): 400–700 kr. pr. besøg",
        "Engangsbesøg, parcelhus: 700–1.200 kr.",
        "Pr. vindue (abonnement): 18–35 kr. inkl. moms",
        "Pr. vindue (engang): 40–60 kr. inkl. moms",
        "Sprosser/karme: +30–60 % oveni",
        "Lift eller stige over 4 m: +400–800 kr. pr. opgave",
      ],
      paragraphs: [
        "Et typisk parcelhus med 20 vinduer betaler 3.500–5.000 kr. om året ved abonnement hver 6. uge. Bor du i lejlighed med 8 vinduer, ligger årsomkostningen typisk på 1.300–2.200 kr. Se også vores ",
      ],
      body: (
        <p>
          Se også vores opslag <Link to="/blog/vinduespudsning-pris-pr-m2">vinduespudsning pris pr. m²</Link> og{" "}
          <Link to="/blog/vinduespudsning-aarhus-pris-2026">priser i Aarhus 2026</Link> for regionale benchmarks.
        </p>
      ),
    },
    {
      heading: "Hvad koster det at gøre det selv?",
      list: [
        "God vinduesvasker + gummiskraber: 250 kr. (engangsudgift)",
        "Teleskopstang 4–6 m: 600–1.200 kr.",
        "Mobilt vandfilter til osmosevand: 1.500–3.500 kr.",
        "Stige eller skammel: 400–1.500 kr.",
        "Pudsemiddel pr. år: ~150 kr.",
        "Tidsforbrug: 2–4 timer pr. omgang for 20 vinduer",
      ],
      paragraphs: [
        "Hvis du har 6 omgange om året à 3 timer, bruger du 18 timer årligt. Med en timeløn på 200 kr. svarer det til 3.600 kr. — uden materialer. Selvgør betaler sig især, hvis du har få vinduer i stueplan, eller hvis du nyder havearbejde i samme weekend.",
      ],
    },
    {
      heading: "Hvornår betaler den professionelle sig altid?",
      list: [
        "Vinduer over 2,5 m (1. sal og opefter)",
        "Karnap, kvist eller skrå tagvinduer",
        "Hus i byen med trafikvinduer (snavser 2× hurtigere)",
        "Sprosser eller dannebrogsvinduer (tager 3× så lang tid manuelt)",
        "Erhverv — momsen er fradragsberettiget oveni BoligJob til private",
      ],
      paragraphs: [
        "En professionel bruger osmosevand og teleskopstang fra jorden, så vinduerne tørrer stribefrit uden stige. Resultatet holder typisk 4–6 uger længere end almindelig vask, fordi der ikke efterlades sæberester der binder støv.",
      ],
    },
    {
      heading: "Tjekliste før du indhenter tilbud",
      ordered: [
        "Tæl vinduesfag (ikke ruder) — gå ud og noter pr. facade",
        "Beslut: kun ude, eller inde + ude?",
        "Skal karme, rammer og sålbænke med?",
        "Skal myggenet eller sprosser pudses særskilt?",
        "Adgangsforhold — havemøbler, buske, hund i haven?",
        "Faktureringsform: pr. gang eller fast månedligt beløb?",
        "Opsigelsesvarsel — maks 1 måned",
      ],
    },
    {
      heading: "Fast abonnement er typisk 30–40 % billigere",
      paragraphs: [
        "Pudseren har en fast rute, mindre kørsel pr. kunde og kender allerede dine vinduer — derfor kan abonnementsprisen lægges lavere. Bind dig ikke længere end 12 måneder, og sørg for at opsigelsesvarslet er maks 1 måned. Bed altid om skriftligt tilbud med præcis frekvens og pris pr. besøg.",
        "Husk BoligJob-fradraget på op til 17.500 kr. pr. voksen i husstanden i 2026 — det dækker arbejdslønnen til vinduespudsning. ",
      ],
      body: (
        <p>
          Læs vores guide til <Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link> for satser og dokumentationskrav, eller spring direkte til{" "}
          <Link to="/blog/lav-dit-eget-vinduespudsemiddel">hjemmelavet vinduespudsemiddel</Link> hvis du går selvgør-vejen.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/vinduespudsning-pris-pr-m2">Vinduespudsning pris pr. m²</Link></li>
          <li><Link to="/blog/vinduespudsning-villa-pris">Vinduespudsning villa — pris 2026</Link></li>
          <li><Link to="/blog/vinduespudsning-erhverv-pris-2026">Vinduespudsning erhverv</Link></li>
          <li><Link to="/blog/pudse-vinduer-uden-skraber">Pudse vinduer uden skraber</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default WindowCleanerOrDIY;