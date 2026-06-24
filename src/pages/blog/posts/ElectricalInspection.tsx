import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "el-tjek-foer-koeb-af-bolig",
  keywords:
    "el-tjek bolig, eltjek inden boligkøb, autoriseret elektriker, el-installationsrapport, HFI-relæ, HPFI, sikkerhedsgennemgang el, tilstandsrapport el",
  faq: [
    { q: "Er et el-tjek lovpligtigt før salg af bolig?", a: "Nej, men sælger har oplysningspligt om kendte fejl, og en el-installationsrapport (frivillig) reducerer sælgers ansvar 6 mdr. efter overtagelse — og dækker køber via ejerskifteforsikringen." },
    { q: "Hvad koster et el-tjek i 2026?", a: "Bolig op til 150 m²: 1.500–2.800 kr. inkl. moms. 150–250 m² eller bolig med kælder: 2.500–4.200 kr. Sommerhus eller landejendom: tillæg på 500–1.500 kr." },
    { q: "Hvad finder elektrikeren typisk?", a: "Manglende HPFI-afbryder, gamle stofledninger, manglende jord i stikkontakter, ulovlige forlængere bag køkkenelementer, overophedede klemmer i tavlen og badeværelser uden korrekt zoneinddeling." },
    { q: "Hvad er forskellen på HFI og HPFI?", a: "HFI udløser kun ved fejlstrøm 30–500 mA og må ikke længere tilsluttes ny installation. HPFI udløser allerede ved 30 mA og er det eneste tilladte ved nybyg og udvidelser siden 2008." },
    { q: "Kan jeg bruge el-tjekket i forhandlingen?", a: "Ja — find fejlene før prisen er fast. En rapport der viser 25.000 kr. i nødvendige udbedringer er et stærkt argument for nedslag eller forbehold i købsaftalen." },
    { q: "Hvor lang tid tager et el-tjek?", a: "1,5–3 timer for et almindeligt parcelhus. Du skal helst være med, så fejlene kan vises konkret — bagefter får du en skriftlig rapport med billeder." },
    { q: "Hvad er en el-installationsrapport (lovpligtig autoriseret rapport)?", a: "Det er en formel rapport efter standard fra Sikkerhedsstyrelsen. Den koster typisk 2.800–4.500 kr. og er gyldig i 1 år ved salg — og indgår i forsikringsdækningen ved ejerskifte." },
  ],
  sections: [
    {
      paragraphs: [
        "Et el-tjek inden boligkøb er en af de bedste forsikringer du kan tegne for under 3.000 kr. Det kan afsløre fejl der ellers ville koste 20.000–80.000 kr. at rette efter overtagelse — og som ejerskifteforsikringen ikke nødvendigvis dækker, hvis fejlene var synlige.",
      ],
    },
    {
      heading: "Det gennemgår elektrikeren (typisk tjekliste)",
      list: [
        "El-tavle: automatsikringer, klemmernes tilspænding, mærkning",
        "HPFI-afbryderens funktion (testknap + lækstrømsmåling)",
        "Jordforbindelse i alle stikkontakter (kontinuitetsmåling)",
        "Kabelføring på loft og i krybekælder — synlig og skjult",
        "Køkken og bad: zoneinddeling, IP-klasse, fugtskader",
        "Lampeudtag, dimmere, lyskontakter — ingen brandrøde mærker",
        "Installationer i bryggers, garage og udhus",
        "Eltavlens belastning kontra antal kredse",
      ],
    },
    {
      heading: "Priser på de typiske udbedringer (2026)",
      list: [
        "Udskiftning af HFI til HPFI: 2.500–4.500 kr.",
        "Ny eltavle med 12–18 grupper: 12.000–25.000 kr.",
        "Etablering af jord i stikkontakter (pr. stk.): 450–950 kr.",
        "Udskiftning af stofledninger 50 m²: 18.000–35.000 kr.",
        "Etablering af bad-installation efter zoneregler: 6.500–14.000 kr.",
        "Ekstra gruppe til induktion/varmepumpe: 3.500–6.500 kr.",
      ],
      paragraphs: [
        "Se også vores guide til ",
      ],
      body: (
        <p>
          regler for selvgør-el i <Link to="/blog/hvornaar-skal-du-have-autoriseret-elektriker">hvornår skal du have en autoriseret elektriker</Link> og aktuelle <Link to="/blog/elektriker-timepris-2026">timepriser på elektriker 2026</Link>.
        </p>
      ),
    },
    {
      heading: "Hvornår er el-tjek særligt vigtigt?",
      ordered: [
        "Huse bygget før 1975 (stofledninger der knækker)",
        "Boliger med oprindelig eltavle (keramiske skruesikringer)",
        "Boliger med tilbygning der ikke er dokumenteret",
        "Sommerhuse der bruges helårligt",
        "Boliger med selvbyg, hvor sælger har \"hjulpet en ven der er elektriker\"",
        "Alle huse hvor el-installationsrapporten er mere end 8 år gammel",
      ],
      paragraphs: [
        "Boliger med HFI uden HPFI må ikke udvides — så snart du sætter en ny gruppe i tavlen, skal hele tavlen opgraderes. Det er en typisk skjult omkostning ved køb af huse fra 1980–2005.",
      ],
    },
    {
      heading: "Sådan bruger du el-tjekket i handlen",
      paragraphs: [
        "Bestil tjekket inden underskrift, eller tag forbehold for det i købsaftalen (6 dages fortrydelsesret + advokatforbehold). Får du en rapport der viser fejl for 25.000 kr., kan du enten kræve prisnedslag, kræve sælger udbedrer inden overtagelse, eller trække dig uden tab af handelsomkostninger.",
        "Husk: BoligJob-fradraget dækker arbejdslønnen ved efterfølgende lovliggørelse — op til 17.500 kr. pr. voksen i 2026.",
      ],
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/hvornaar-skal-du-have-autoriseret-elektriker">Hvornår skal du have en autoriseret elektriker?</Link></li>
          <li><Link to="/blog/elektriker-timepris-2026">Elektriker timepris 2026</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});
