import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "varmepumpe-service-drift-vedligehold",
  keywords: "varmepumpe service pris, varmepumpe vedligehold, luft vand varmepumpe filter, varmepumpe ydelse falder, varmepumpe garanti, service abonnement varmepumpe",
  faq: [
    { q: "Hvor ofte skal varmepumpen serviceres?", a: "Lovpligtigt servicetjek hvert år for varmepumper over 1 kg kølemiddel (de fleste luft/vand). Filtre i indedele tjekkes 4× årligt af dig selv." },
    { q: "Hvad koster et årligt servicetjek?", a: "Luft/luft varmepumpe (split): 950–1.600 kr. Luft/vand varmepumpe: 1.400–2.600 kr. Jord-varmepumpe: 1.800–3.200 kr. Med abonnement: 20–30% billigere pr. besøg." },
    { q: "Hvorfor falder min varmepumpe i ydelse?", a: "9 ud af 10 gange: tilstoppede filtre, snavset fordamper-ribber, lavt kølemiddeltryk eller forkert indstillet kurve. En serviceudbedring kan løfte effekt 15–30%." },
  ],
  sections: [
    { paragraphs: ["En velholdt varmepumpe kører 15–20 år. Forsømt taber den effekt år for år, og du betaler den dyre regning på strømmen. Her er hvad du skal gøre selv, og hvad firmaet skal levere."] },
    { heading: "Selv-vedligehold — gør hver 3 måneder", ordered: [
      "Støvsug eller skyl filtre i indedele",
      "Tjek for is/sne foran udedel — fri luftgennemstrømning",
      "Sørg for at udedel står 15+ cm fra mur",
      "Tjek for løse paneler eller vibrationer",
      "Kig i app: er forbrug og COP normal eller faldende?",
    ] },
    { heading: "Årligt servicetjek skal indeholde", list: [
      "Kontrol af kølemiddeltryk og lækage (lovpligtigt)",
      "Rengøring af fordamper- og kondensator-ribber",
      "Test af kompressor, ventilatorer og defrost-funktion",
      "Indstilling af varmekurve efter forbrug",
      "Tjek af inverter og styringssoftware",
      "Skriftlig rapport med målte værdier",
    ] },
    { heading: "Serviceabonnement — er det værdien?", paragraphs: ["Ja, hvis varmepumpen er mere end 4 år gammel. Et abonnement koster 1.800–3.500 kr./år og inkluderer typisk: lovpligtigt tjek, kort responstid ved fejl, garantiforlængelse og 10–20% rabat på reservedele. Ny varmepumpe under garanti: vent med abonnement til garantien udløber."] },
    { heading: "Røde flag på din varmepumpe", list: [
      "Stigende strømforbrug uden ændret indeklima",
      "Pumpen kører konstant uden pause",
      "Mislyde fra kompressor eller ventilator",
      "Is-opbygning på udedel også om sommeren",
      "Vandlækage under indedel",
    ] },
    { heading: "Faldgruber ved firmavalg", list: [
      "Vælger billigste firma uden VPO-certificering",
      "Tror at sælgers \"installations-tjek\" er service — det er det ikke",
      "Skipper service mens garantien løber — kan miste hele garantien",
      "Får ikke skriftlig servicerapport med målinger",
    ] },
  ],
});
