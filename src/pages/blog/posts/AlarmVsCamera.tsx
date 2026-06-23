import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "alarm-eller-videoovervaagning-til-hjemmet",
  keywords: "alarm eller kamera, hjemmealarm, videoovervågning hjem, smart kamera udendørs, GDPR videoovervågning, indbrudssikring, sikkerhedsfirma",
  faq: [
    { q: "Hvad afskrækker indbrudstyve mest — alarm eller kamera?", a: "Synlige sirener og blinklys ved indbrud afskrækker mere end kameraer. Den bedste løsning er kombinationen: alarm der trigger og kameraer der dokumenterer." },
    { q: "Hvad koster en hjemmealarm med vagtcentral?", a: "Installation: 0–5.000 kr. (ofte gratis ved binding). Månedligt: 199–399 kr. for abonnement med vagtcentral, app og udrykning." },
    { q: "Hvad er GDPR-reglerne for kameraer på huset?", a: "Du må filme egen grund. Filmer du fortov, vej eller naboens grund, er det persondatabehandling, og du skal kunne dokumentere lovligt formål samt skilte." },
  ],
  sections: [
    { paragraphs: ["Indbrud er fortsat den hyppigste ejendomsskade i Danmark, men kurven falder — bl.a. fordi tyvene rykker forbi huse med synlig sikring. Selv en simpel løsning er ofte nok til at flytte risikoen til naboens hus."] },
    { heading: "Sammenlign de tre niveauer", list: [
      "Smart-kamera (DIY): 1.500–4.000 kr. + 0–49 kr./md. — lav-mellem afskrækkelse",
      "Alarm uden vagt: 3.500–8.000 kr. + 0–99 kr./md. — mellem afskrækkelse",
      "Alarm + vagt + kamera: 0–5.000 kr. + 249–449 kr./md. — høj afskrækkelse",
    ] },
    { heading: "Tjekliste før du underskriver", list: [
      "Bindingsperiode (typisk 12–36 mdr.)",
      "Falsk alarm-gebyr og hvad der udløser udrykning",
      "Ejerskab af udstyret efter opsigelse",
      "Backup-strøm og 4G-backup hvis WiFi falder",
      "GDPR-skiltning ved kameraer mod udendørs arealer",
    ] },
  ],
});
