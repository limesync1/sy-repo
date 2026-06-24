import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "alarm-uden-abonnement",
  keywords: "alarm uden abonnement, smart alarm, Ajax alarm, Aqara alarm, alarm uden månedlig betaling, gør-det-selv alarm, alarm sammenligning",
  faq: [
    { q: "Virker en alarm uden abonnement i praksis?", a: "Ja — den larmer, advarer dig på telefonen og kan optage video. Men der kommer INGEN vægter ud — det er forskellen fra et abonnement med kontrolcentral. Mange er fine med en SMS-advarsel og en høj sirene." },
    { q: "Hvad mister jeg uden abonnement?", a: "Tre ting: 1) Vægterudrykning (typisk under 30 min ved abonnement), 2) Automatisk politiopkald fra kontrolcentral ved bekræftet indbrud, 3) Forsikringsrabat (3–8 % hos nogle selskaber kræver kontrolcentral-tilslutning)." },
    { q: "Hvad koster en god alarm uden abonnement?", a: "Ajax Hub 2 startsæt: 4.500–7.500 kr. + 3.000–6.000 kr. i ekstra sensorer/kameraer. Aqara eller Yale (mere DIY-orienteret): 2.500–5.000 kr. for komplet sæt. Ingen månedlig udgift." },
    { q: "Giver forsikringen rabat?", a: "Nogle selskaber giver rabat (3–8 %) for kontrolcentral-tilsluttet alarm. Almindelig DIY-alarm uden abonnement giver typisk ikke rabat — men kan stadig hjælpe ved skadesanmeldelse som dokumentation." },
    { q: "Hvad er bedst til lejlighed vs. parcelhus?", a: "Lejlighed: simpelt DIY-sæt (Aqara, Yale) dækker en hoveddør og 1–2 sensorer. Parcelhus: invester i Ajax eller Verisure DIY med udendørs detektorer, sirene udenfor og indendørs IP-kameraer." },
  ],
  sections: [
    { paragraphs: [
      "Smart-alarmer uden månedligt abonnement er blevet seriøse alternativer til de klassiske abonnementsalarmer fra Verisure og G4S. Men de er ikke 1:1 erstatninger — du mister vægterudrykning og forsikringsrabat. Her er hvad du reelt får, og hvornår det er det rigtige valg.",
    ] },
    { heading: "Sådan virker en typisk DIY-alarm", ordered: [
      "Sensorer (døre, vinduer, bevægelse) sender signal til hub via radio.",
      "Hub'en sender push-besked til din telefon over wifi/4G.",
      "Sirene (indvendig + udvendig) larmer 100–110 dB.",
      "Eventuelle kameraer optager og uploader video til sky eller lokal harddisk.",
      "Du beslutter selv: ring politi, kør hjem, kontakt nabo, eller ignorer falsk alarm.",
    ] },
    { heading: "DIY-alarmer der virker", list: [
      "Ajax Hub 2 (4.500 kr. start): bedste DIY-system, 10 års batteri, professionel kvalitet",
      "Verisure DIY (3.500 kr. start): kendt mærke uden tvunget abonnement",
      "Yale Smart Living (2.500 kr. start): simpel, til lejlighed",
      "Aqara M3 (1.500 kr. start): Apple HomeKit / Matter, integreret med smart home",
      "Reolink Argus kamera-baseret (1.000 kr./kamera): hvis du primært vil overvåge udenfor",
    ] },
    { heading: "Hvornår skal du have abonnement?", list: [
      "Du bor afsides og en sirene alarmerer ingen",
      "Du rejser meget — kan ikke selv reagere på SMS",
      "Forsikringsselskabet kræver det for fuld dækning (typisk ved højværdiforsikringer)",
      "Du har boligværdier > 500.000 kr. løsøre — vægterudrykning kan begrænse skaden",
      "Du har ikke lyst til selv at vurdere falske alarmer 02:00 om natten",
    ] },
    { heading: "Hvornår er DIY-alarm fint?", list: [
      "Lejlighed eller parcelhus i tæt bymæssig bebyggelse hvor naboer reagerer",
      "Du selv kan se kamera live på telefonen og vurdere situationen",
      "Forsikringen har ingen krav om abonnement (læs policen!)",
      "Du primært vil have afskrækkende effekt — synlig sirene + skilt",
      "Du vil spare 3.000–6.000 kr./år i abonnement",
    ] },
  ],
});
