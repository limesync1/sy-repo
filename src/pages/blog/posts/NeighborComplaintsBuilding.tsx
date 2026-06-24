import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "nabo-klager-over-byggeri-stoj-regler",
  keywords: "nabo klager byggeri, byggestøj regler, støj tider håndværker, nabolovs byggeri, varsel byggeri nabo, gener fra håndværker",
  faq: [
    { q: "Hvornår må håndværker arbejde og larme?", a: "Hverdage 07.00–18.00, lørdage 08.00–14.00. Søn- og helligdage er som hovedregel forbudt med støjende arbejde. Kommunen kan have lokale regler — tjek miljøforvaltningens hjemmeside." },
    { q: "Skal jeg varsle naboen før byggeri?", a: "Ja, ved længere byggeri (over 2 uger) er det god skik at varsle skriftligt min. 14 dage før. Ved arbejde tæt på skel (under 2,5 m) er det lovpligtigt." },
    { q: "Hvad kan naboen kræve?", a: "Naboen kan kræve at støjende arbejde holder sig indenfor lovlige tider, at adgangsveje holdes farbare, og at evt. skader på deres grund udbedres. Ikke standse byggeriet hvis det har gyldig tilladelse." },
  ],
  sections: [
    { paragraphs: ["Et godt naboforhold før byggestart er guld værd — en sur nabo kan trække klagesager i månedsvis og forsinke alt. Her er de regler og kutymer der gælder, så I undgår konflikten."] },
    { heading: "Lovlige støjtider (standard)", list: [
      "Mandag–fredag: 07.00–18.00",
      "Lørdag: 08.00–14.00 (mange kommuner skærper til 16.00)",
      "Søndag og helligdage: forbudt med støjende arbejde",
      "Akutte VVS/el-skader: tilladt udenfor tider mod efterfølgende dokumentation",
    ] },
    { heading: "Tjekliste — før byggeriet starter", ordered: [
      "Send skriftligt varsel til nærmeste 2–4 naboer (min. 14 dage før).",
      "Beskriv: hvad I bygger, hvornår I starter, forventet varighed, kontaktperson.",
      "Inviter til afklarende kaffe hvis stort byggeri (over 1 mdr.).",
      "Aftal hvor håndværkernes biler må parkere.",
      "Hav telefonnummer på byggeleder klar — så naboen kan ringe direkte.",
    ] },
    { heading: "Hvis naboen klager", ordered: [
      "Lyt og tag det seriøst — selv hvis du er i din ret.",
      "Tjek om der reelt er overtrædelser (tider, skader, gener).",
      "Dokumentér din egen praksis (tider, fotos af adgangsveje).",
      "Tilbyd kompromiser: pauser, færre lørdagstimer, opfølgningssamtaler.",
      "Hvis konflikten eskalerer: brug kommunens nabokonfliktsmægler.",
    ] },
    { heading: "Det må naboen IKKE", paragraphs: ["En nabo kan ikke standse byggeri med gyldig tilladelse, ikke kræve adgang til at \"tjekke\" arbejdet, og ikke kræve at håndværker bruger særlige materialer. Klagesager skal gå gennem kommunen, ikke direkte til håndværker."] },
  ],
});
