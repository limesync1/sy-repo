import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fjern-graespletter-fra-toej",
  keywords: "græspletter, fjern græs, vask, sportstøj, rengøring",
  faq: [
    { q: "Hvad er sværest at fjerne — græs eller jord?", a: "Græs. Klorofyllen binder sig til bomuldsfibre og kræver enten enzymvask, brintoverilte eller sprit. Jord skyller typisk ud med koldt vand." },
    { q: "Virker husholdningssprit?", a: "Ja, fremragende på græs. Dup pletten med en klud fugtet i ren sprit (eller vodka). Test først på et skjult sted — kan trække farver ud af farvet tøj." },
    { q: "Kan jeg bare smide børnetøjet i vasken?", a: "Behandl pletten først, ellers fikserer vask + tumbler den. Brug forvask-spray eller galdesæbe, lad virke 15 min." },
    { q: "Hvad med hvide sportssko med græs?", a: "Tandbørste + opvaskemiddel + lidt brintoverilte. Skrub forsigtigt, skyl med fugtig klud, lad tørre i skygge." },
    { q: "Hjælper vaskepulver med enzymer?", a: "Ja, markant. Vælg pulver med protease + lipase (alle moderne universale pulvere). Forbehandl + enzymvask = bedst." },
  ],
  sections: [
    { heading: "Sådan fjerner du friske græspletter", ordered: [
      "Børst overskydende græs af tørt.",
      "Dup pletten med klud fugtet i husholdningssprit.",
      "Gnid lidt galdesæbe eller flydende vaskemiddel ind, lad virke 15 min.",
      "Vask på højest tilladte temperatur med enzympulver."
    ]},
    { heading: "Indtørrede græspletter", ordered: [
      "Læg i blød 1 time i lunken vand + 2 spsk brintoverilte + 1 spsk opvaskemiddel.",
      "Børst pletten med blød tandbørste.",
      "Vask som normalt — gentag hvis nødvendigt."
    ]},
    { heading: "Forebyggelse på børne- og sportstøj", list: [
      "Imprægnerings-spray afviser græs og snavs.",
      "Mørke farver tilgiver mere end hvide.",
      "Skift altid før vask sker — pletten skal behandles inden 24 timer."
    ]},
  ]
});

export default Post;
