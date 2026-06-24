import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "erhvervsrengoering-kontrakt-tjekliste",
  keywords: "erhvervsrengøring kontrakt, rengøringsaftale tjekliste, opsigelse rengøring, kvalitetskontrol erhvervsrengøring, SLA rengøring, kontorrengøring kontrakt",
  faq: [
    { q: "Hvor lang er typisk bindingsperiode?", a: "Standarden er 3–6 måneders løbende opsigelse. Undgå længere binding end 12 måneder — kvaliteten falder ofte efter de første måneder hvis du ikke kan komme ud." },
    { q: "Skal jeg have kvalitetskontrol skrevet ind?", a: "Ja. Min. 1 stikprøvekontrol pr. kvartal, dokumenteret med tjekliste og foto. Uden måling kan du ikke reklamere konkret." },
    { q: "Må firmaet sende underleverandører?", a: "Kun hvis det fremgår af kontrakten. Bed om navne på faste medarbejdere og krav om dansk straffeattest hvis I har følsomme data eller udstyr." },
  ],
  sections: [
    { paragraphs: ["En erhvervsrengøringsaftale binder typisk 50.000–500.000 kr. om året. Bruger du 30 minutter på at læse kontrakten igennem med denne tjekliste, sparer du ofte 5-cifrede beløb om året — og slipper for de typiske konflikter."] },
    { heading: "Det SKAL stå i kontrakten", ordered: [
      "Detaljeret rumliste med m² og frekvens (dagligt/2×ugen/ugentligt)",
      "Opgaveliste pr. rumtype (kontor, toilet, køkken, mødelokaler)",
      "Hvad er IKKE inkluderet (vinduer, gulvbehandling, hovedrengøring)",
      "Pris pr. måned + timepris til ekstraopgaver",
      "Prisreguleringsklausul (typisk DA-statistikken, max 1× årligt)",
      "Opsigelsesvarsel (min. 3, max 6 måneder)",
      "Kvalitetskontrol-frekvens og dokumentationskrav",
      "Reklamationsproces og frist for udbedring (typisk 48 timer)",
      "Erhvervsansvarsforsikring (min. 10 mio. kr.)",
      "GDPR-databehandleraftale hvis personale har nøgleadgang",
    ] },
    { heading: "Røde flag i kontraktudkast", list: [
      "Automatisk forlængelse uden aktivt valg",
      "Prisregulering uden loft",
      "Vagt formuleret opgaveliste (\"almindelig rengøring\")",
      "Ingen kvalitetskontrol eller måling",
      "Ansvarsfraskrivelse for skader på inventar",
      "Bindingsperiode over 12 måneder",
    ] },
    { heading: "Bonus: bed altid om referencer fra samme branche", paragraphs: ["Et rengøringsfirma der rengør tandlægeklinikker, har andre kompetencer end et der rengør lagerhaller. Bed om 2–3 referencer fra virksomheder på samme størrelse og branche som jeres — og RING til dem."] },
  ],
});
