import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const FloorChoice = defineBlogPost({
  slug: "gulvlaegger-vinyl-laminat-eller-traegulv",
  keywords:
    "vælg gulv, vinyl vs laminat, trægulv pris, gulvlægger pris pr m2, klikgulv, lamelparket",
  faq: [
    { q: "Hvad er billigst pr. m²?", a: "Laminat er typisk billigst (150–400 kr./m² for materialer). Vinyl 250–600 kr./m², massivt trægulv 600–1.500 kr./m², fliser 300–1.200 kr./m² + lægning." },
    { q: "Hvor meget koster det at få lagt?", a: "Gulvlægger tager typisk 175–300 kr./m² for klikgulv og 350–650 kr./m² for massivt trægulv. Fliser koster 600–1.200 kr./m² i lægning." },
    { q: "Hvad holder længst?", a: "Massivt trægulv holder 50–100 år og kan slibes flere gange. Laminat 15–25 år (kan ikke slibes). Vinyl 20–30 år. Fliser 50+ år." },
    { q: "Hvilket gulv er bedst med gulvvarme?", a: "Fliser leder varme bedst. Lamelparket og vinyl fungerer godt. Massivt trægulv er sværest — kræver lav fremløbstemperatur (max ~27 °C) og særlige træsorter (eg/ask)." },
    { q: "Skal jeg vælge klik eller limet?", a: "Klik er hurtigere, billigere at lægge og kan demonteres. Limet giver bedre lyd, mindre fugespringere ved gulvvarme og længere levetid. Massive trægulve limes ofte." },
    { q: "Er gulvlægger fradragsberettiget?", a: "Ja — lægning af gulv i eksisterende rum er omfattet af BoligJob. Selve materialerne er ikke fradragsberettiget." },
    { q: "Hvor lang tid tager et gulvprojekt?", a: "30 m² klikgulv: 1–2 dage. 30 m² massivt trægulv (limet): 3–5 dage. Fliser med ny støbning: 5–10 dage inkl. tørretid." },
  ],
  sections: [
    {
      paragraphs: [
        "Vinyl, laminat, trægulv eller fliser? Det rigtige valg afhænger af slid, vand-risiko, gulvvarme og budget. Her er den ærlige sammenligning med 2026-priser og en tjekliste til tilbudsindhentning.",
      ],
    },
    {
      heading: "Materialepris pr. m² (2026)",
      list: [
        "Laminat: 150–400 kr./m²",
        "Vinyl (LVT/SPC): 250–600 kr./m²",
        "Lamelparket: 400–900 kr./m²",
        "Massivt trægulv (eg): 600–1.500 kr./m²",
        "Keramiske fliser: 300–1.200 kr./m²",
        "Tæpper (rul): 200–600 kr./m²",
      ],
    },
    {
      heading: "Lægningspris hos gulvlægger",
      list: [
        "Klikgulv (laminat/vinyl): 175–300 kr./m²",
        "Limet vinyl: 250–400 kr./m²",
        "Lamelparket: 250–450 kr./m²",
        "Massivt trægulv: 350–650 kr./m²",
        "Fliser: 600–1.200 kr./m²",
        "Afretning af underlag: +75–200 kr./m²",
        "Bortskaffelse af gammelt gulv: 35–80 kr./m²",
      ],
      body: (
        <p>
          Sammenlign med <Link to="/blog/gulvlaegning-pris-pr-m2-2026">gulvlægning pris pr. m² 2026</Link>,{" "}
          <Link to="/blog/gulvslibning-pris-pr-m2-2026">gulvslibning pris pr. m²</Link> og{" "}
          <Link to="/blog/flisemontoer-pris-pr-m2-2026">flisemontør pris pr. m²</Link>.
        </p>
      ),
    },
    {
      heading: "Laminat — billigt og hurtigt",
      paragraphs: [
        "Trækopi af træ med slidstærk overflade. Billigt, hurtigt at lægge, og findes i tusindvis af dekorationer. Tåler dog ikke stående vand — ikke ideelt til badeværelse og sjældent anbefalet i køkken med åbent layout. Slidstyrke angives i AC-klasser; AC4 er minimum til opholdsrum, AC5 til erhverv.",
      ],
    },
    {
      heading: "Vinyl (LVT / SPC) — det alsidige valg",
      paragraphs: [
        "Vandtæt, varmt at gå på, dæmper lyd og findes nu i meget realistiske trælook. Perfekt til køkken, entré og badeværelse (med vådrumsgodkendelse). SPC-vinyl har en stenkomposit-kerne, der gør den ekstra stabil ved temperatursvingninger — det rigtige valg over gulvvarme.",
      ],
    },
    {
      heading: "Massivt trægulv og lamelparket",
      paragraphs: [
        "Massivt trægulv kan slibes 5–10 gange og holder generationer. Patinerer smukt og giver en varmere fornemmelse end klikgulve. Lamelparket er 'halv-vejen' — en slidlag af ægte træ på krydsfinér. Kan slibes 1–2 gange, mere stabilt end massivt træ og lægges typisk over gulvvarme.",
      ],
      body: (
        <p>
          Læs også <Link to="/blog/hvor-mange-gange-slibe-traegulv">hvor mange gange kan trægulv slibes</Link> og{" "}
          <Link to="/blog/gulvvarme-paa-traegulv-pris-krav">gulvvarme på trægulv</Link>.
        </p>
      ),
    },
    {
      heading: "Fliser — robust, men koldt",
      paragraphs: [
        "Mest holdbart og bedst med gulvvarme — men koldt at gå på uden varme, og hård lyd. Standardvalg i badeværelse og bryggers, mere sjældent i opholdsrum. Vælg PEI-klasse 4 til entré og PEI 3 til opholdsrum.",
      ],
    },
    {
      heading: "Tjekliste før du booker gulvlægger",
      ordered: [
        "Opmål rummet og tilføj 10 % spild (15 % for parket i diagonale mønstre)",
        "Tjek underlaget — er gulvet plant? Krummer kræver afretning",
        "Beslut afslutning ved døre, paneler og overgange",
        "Få skriftligt tilbud med materialer, lægning og oprydning",
        "Spørg om garanti — typisk 5 år på lægningen, 10–25 år på materialet",
        "Klargør rummet: tøm, afmonter paneler og fjern gamle gulvlister",
      ],
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/gulvlaegning-pris-pr-m2-2026">Gulvlægning pris pr. m² 2026</Link></li>
          <li><Link to="/blog/gulvslibning-traegulv-trin-for-trin">Gulvslibning trin for trin</Link></li>
          <li><Link to="/blog/flisemontoer-pris-pr-m2-2026">Flisemontør pris pr. m²</Link></li>
          <li><Link to="/blog/gulvvarme-paa-traegulv-pris-krav">Gulvvarme på trægulv</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default FloorChoice;