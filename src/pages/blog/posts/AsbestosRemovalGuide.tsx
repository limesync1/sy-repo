import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "asbest-i-bolig-sanering-pris-regler",
  keywords: "asbest pris sanering, asbest tag eternit, asbest fjernelse regler, asbest privatperson, eternittag asbestholdig, asbest test pris",
  faq: [
    { q: "Hvor finder man typisk asbest i ældre boliger?", a: "Bølgeeternit-tag og facader (1955–1988), gulvfliser og linoleum (1950–1980), rør-isolering, ovnpakninger, asbestcementplader bag pejs. Boliger fra før 1990 har høj sandsynlighed for asbest et eller andet sted." },
    { q: "Må jeg selv fjerne asbest?", a: "Privatpersoner må fjerne mindre mængder fast bundet asbest (typisk bølgeeternit-plader) med åndedrætsværn og uden at knække pladerne. Større mængder OG løst bundet asbest (isolering): KUN autoriseret asbestfirma." },
    { q: "Hvad koster asbestsanering?", a: "Test af materiale (laboratorie): 600–1.200 kr. pr. prøve. Bølgeeternit-tag (140 m² parcelhus): 65.000–140.000 kr. Asbestholdig isolering omkring rør: 1.500–4.500 kr. pr. meter rør. Afleveringsgebyr genbrugsplads gratis ved private mængder." },
  ],
  sections: [
    { paragraphs: ["Asbest er sundhedsskadeligt og kræftfremkaldende, men kun farligt når det støver. Korrekt håndtering er ikke nødvendigvis dyr — det største problem er at ikke kende reglerne og lave hovsa-løsninger der efterlader fibre i hjemmet."] },
    { heading: "Hvor skal du være ekstra opmærksom", list: [
      "Bølgeeternit (bølgetag) på huse 1955–1988",
      "Tagdækplader \"asbestcement\" — særligt på kviste og udhuse",
      "Vinyltæpper og linoleum fra 1950–1980 (asbest i bagside)",
      "Rør-isolering der ligner gråt papmaché",
      "Pakninger til ældre brændeovne og fyrkedler",
      "Vægplader bag radiatorer og pejse",
    ] },
    { heading: "Sådan tester du for asbest", ordered: [
      "Tag prøve med åndedrætsværn FFP3 og engangshandsker",
      "Befugt materialet før prøvetagning (forhindrer støv)",
      "Brug en lille bid i lufttæt zip-pose",
      "Send til godkendt laboratorium (Eurofins, FORCE Technology)",
      "Svar inden 5–10 hverdage, pris 600–1.200 kr.",
    ] },
    { heading: "Sanering — hvem må hvad", body: (
      <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr><th className="px-4 py-3">Materiale</th><th className="px-4 py-3">Privatperson?</th><th className="px-4 py-3">Krav</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3">Bølgeeternit-plader (intakt)</td><td className="px-4 py-3">Ja, mindre mængder</td><td className="px-4 py-3">FFP3, ikke knække</td></tr>
            <tr><td className="px-4 py-3">Bølgeeternit (helt tag)</td><td className="px-4 py-3">Nej — krav om firma</td><td className="px-4 py-3">Autoriseret asbestfirma</td></tr>
            <tr><td className="px-4 py-3">Rør-isolering (løst bundet)</td><td className="px-4 py-3">Nej — forbudt</td><td className="px-4 py-3">Specialiseret saneringsfirma</td></tr>
            <tr><td className="px-4 py-3">Asbestholdige fliser</td><td className="px-4 py-3">Ja, ved hel afmontering</td><td className="px-4 py-3">FFP3, befugtning</td></tr>
            <tr><td className="px-4 py-3">Gulvtæpper med asbest</td><td className="px-4 py-3">Nej — forbudt</td><td className="px-4 py-3">Saneringsfirma</td></tr>
          </tbody>
        </table>
      </div>
    ) },
    { heading: "Afleveringspligt", paragraphs: ["Asbest skal afleveres som FARLIGT AFFALD i lufttæt, mærket emballage. Genbrugsplads tager gratis fra privatpersoner i mindre mængder. Større mængder kræver kommunal anvisning. Ulovlig deponering: bøde 5.000–25.000 kr."] },
  ],
});
