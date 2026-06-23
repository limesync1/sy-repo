import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fraflytningsrengoering-hvad-skal-med",
  keywords: "fraflytningsrengøring, depositum tilbage, normal misligholdelse, lejelov rengøring, pris fraflytning, fraflytningssyn",
  faq: [
    { q: "Hvad må udlejer trække i depositum for rengøring?", a: "Udlejer må kun trække for ekstraordinær rengøring der overstiger almindelig slitage. Hvis lejligheden afleveres i samme stand som ved indflytning, må der ikke trækkes." },
    { q: "Hvad koster en professionel fraflytningsrengøring?", a: "For en 60–80 m² lejlighed: typisk 2.500–4.000 kr. inkl. moms. Mange firmaer giver garanti for godkendelse ved synet." },
    { q: "Er fraflytningsrengøring fradragsberettiget?", a: "Ja — fraflytningsrengøring er omfattet af BoligJob-fradraget når firmaet er momsregistreret og du betaler digitalt." },
  ],
  sections: [
    { paragraphs: ["Reglerne om fraflytningsrengøring er strammet siden lejeloven 2015 — udlejer skal specificere konkret hvad der mangler, og må ikke kræve nyistandsættelse hvis du afleverer i samme stand som ved indflytning."] },
    { heading: "Det skal med i en godkendt fraflytningsrengøring", list: [
      "Ovn, emhætte, køle-/fryseskab — afrimet og rent",
      "Vinduer pudset både ude og inde + karme",
      "Alle skabe tømte og afvasket",
      "Badeværelse afkalket — bruser, fliser, fuger",
      "Gulve våd-/tørrengjort",
      "Lyskontakter, paneler og dørkarme",
      "Radiatorer og ventilationsriste",
    ] },
    { heading: "Sådan undgår du fradrag i depositum", ordered: [
      "Læs din indflytningsrapport — du skal aflevere i samme stand.",
      "Tag billeder af alle rum efter rengøring, dateret.",
      "Mød op til synet og få det skriftligt hvis udlejer påpeger mangler.",
      "Brug firma med garanti for godkendelse hvis du er i tvivl.",
      "Klag til Huslejenævnet inden 6 uger ved uenighed.",
    ] },
  ],
});
