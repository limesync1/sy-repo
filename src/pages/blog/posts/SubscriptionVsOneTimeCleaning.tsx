import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "abonnement-vs-engangsrengoering",
  keywords: "abonnement vs engangsrengøring, fast rengøring vs engang, hvad er billigst rengøring",
  faq: [
    { q: "Hvor meget billigere er abonnement?", a: "Typisk 20–30% billigere pr. besøg end engangsrengøring. Du betaler fx 590 kr. pr. abonnementsbesøg vs. 850 kr. for et tilsvarende engangsbesøg." },
    { q: "Skal jeg binde mig?", a: "Hos langt de fleste firmaer er det løbende abonnement uden binding — du kan opsige med 1 måneds varsel." },
    { q: "Hvad med ferieperioder?", a: "Du kan typisk pause aftalen 2–4 uger om året uden gebyr. Bed om dette i kontrakten." },
    { q: "Hvornår vælger jeg engangsrengøring?", a: "Hovedrengøring 2× årligt, før gæster, efter renovering, fraflytningsrengøring eller hvis du selv klarer den løbende rengøring." },
  ],
  sections: [
    { heading: "Abonnement — fordele", list: [
      "20–30% billigere pr. besøg.",
      "Fast personale der kender hjemmet.",
      "Forudsigelig månedlig udgift.",
      "BoligJob-fradrag løber automatisk.",
      "Kvalitet stiger over tid (kender dine præferencer).",
    ]},
    { heading: "Engangsrengøring — fordele", list: [
      "Ingen binding overhovedet.",
      "God til hovedrengøring og dybderens.",
      "Fleksibel — kun når du har brug for det.",
      "Lettere at vælge premium kvalitet.",
    ]},
    { heading: "Eksempel — årlig totalpris (90 m²)", list: [
      "Abonnement 2 t/14. dag: 590 kr. × 26 = 15.340 kr. − BoligJob = 9.665 kr.",
      "1× engang/måned 3 t: 850 kr. × 12 = 10.200 kr. − BoligJob = 6.426 kr.",
      "Selv vask + 2× hovedrengøring: 2× 2.495 = 4.990 kr. − BoligJob = 3.144 kr.",
    ]},
    { heading: "Læs også", list: [
      <a href="/priser/rengoering">Rengøring prisguide 2026</a>,
      <a href="/blog/hovedrengoering-pris-pr-m2-2026">Hovedrengøring pris pr. m²</a>,
      <a href="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du rengøringsfirma</a>,
    ]},
  ],
});
export default Post;