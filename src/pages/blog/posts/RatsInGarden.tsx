import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const RatsInGarden = defineBlogPost({
  slug: "rotter-i-haven-hvad-goer-jeg",
  keywords:
    "rotter haven, rotter anmeldelse, skadedyrsbekæmpelse pris, rotter symptomer, rotter forebyggelse, rottespærre",
  faq: [
    { q: "Skal jeg anmelde rotter?", a: "Ja — du har anmeldelsespligt til kommunen. Anmeldelse er gratis og bekæmpelse udført af kommunen er også gratis. Brug kommunens hjemmeside eller selvbetjeningen på borger.dk." },
    { q: "Hvad koster en privat skadedyrsbekæmper?", a: "Akutbesøg 1.500–3.500 kr. Mange husforsikringer dækker bekæmpelse — tjek din police inden du bestiller." },
    { q: "Hvad tiltrækker rotter?", a: "Fuglefoder på jorden, kompost med madrester, åbne skraldespande, fodervand til kæledyr, og kloakproblemer. Fjern fødekilden, og populationen falder hurtigt." },
    { q: "Hvor lang reaktionstid har kommunen?", a: "Lovkravet er senest 1 arbejdsdag ved konstaterede rotter indendørs og 8 dage udendørs. I praksis er København og Aarhus typisk inden for 1–3 dage." },
    { q: "Må jeg selv lægge rottegift?", a: "Nej — siden 2016 kræver brug af antikoagulant-gift autorisation. Du må købe almindelige rottefælder, men kemisk bekæmpelse skal foretages af autoriseret bekæmper." },
    { q: "Hvor meget koster en rottespærre?", a: "1.800–4.500 kr. for en standard mekanisk rottespærre installeret i hovedkloakken — typisk 30 minutters arbejde for en kloakmester. Mange forsikringer giver rabat oveni." },
    { q: "Er rotter farlige?", a: "Rotter kan bære Weil's sygdom (leptospirose), salmonella og hantavirus. Risikoen er lille ved indirekte kontakt, men brug handsker når du rydder op og vask hænder grundigt." },
  ],
  sections: [
    {
      paragraphs: [
        "Rotter i haven er ikke kun ulækkert — du har en lovpligtig anmeldelsespligt, og bekæmpelse virker kun, hvis du samtidig fjerner fødekilden og lukker indgangene. Her er trin-for-trin, så du er fri for problemet hurtigt.",
      ],
    },
    {
      heading: "1. Symptomer — er det faktisk rotter?",
      list: [
        "Sorte, aflange ekskrementer (15–20 mm) i klynger",
        "Gnavspor på træ, plastik og elkabler",
        "Lugt af ammoniak omkring redepladser",
        "Hul i jorden 5–10 cm i diameter, ofte langs hegn eller fundament",
        "Stier i græsset hvor de bevæger sig fast",
        "Lyde i loftet eller i krybekælderen om natten",
      ],
      body: (
        <p>
          I tvivl om det er mus eller rotter? Læs <Link to="/blog/rotter-eller-mus">rotter eller mus — kend forskellen</Link>.
        </p>
      ),
    },
    {
      heading: "2. Anmeld til kommunen — i dag",
      paragraphs: [
        "Du SKAL anmelde rotter — det er din pligt som ejer eller lejer. Gå ind på din kommunes hjemmeside eller borger.dk. Kommunen sender autoriseret bekæmper inden for få dage, og det er gratis. Manglende anmeldelse kan give bøde og kan diskvalificere forsikringsdækning ved efterfølgende skader.",
      ],
    },
    {
      heading: "3. Fjern fødekilden",
      list: [
        "Brug kun foderhuse hængt op > 1 m over jord — aldrig fuglefoder på jorden",
        "Luk komposten med rottesikret låg og net i bunden",
        "Ryd op under terrassen, brændestabel og skuret",
        "Skraldespande skal være lukkede med tæt låg",
        "Fjern fodervand til kæledyr om natten",
        "Saml nedfaldsfrugt op dagligt om efteråret",
      ],
    },
    {
      heading: "4. Tjek for kloakproblemer",
      paragraphs: [
        "Rotter kommer ofte op gennem defekte kloakrør. Har du gentagne gange rotter, eller har huset ældre kloak (> 30 år), bør du få en kloakkamera-undersøgelse. Defekte stik kan typisk udbedres for 8.000–25.000 kr. — og er ofte dækket af husforsikringen.",
      ],
      body: (
        <p>
          Se vores guide til <Link to="/blog/kloakmester-pris-2026">kloakmester pris 2026</Link>.
        </p>
      ),
    },
    {
      heading: "5. Forebyggelse",
      list: [
        "Rottespærre i kloak — kraftigt anbefalet, især for huse < 1990",
        "Hold græsset kort og buske trimmet — rotter elsker dækning",
        "Bræddesæt om bunden af kompost og brændestabel",
        "Lap revner i fundament og sokkel — selv huller på 2 cm giver adgang",
        "Net (6 mm) over ventilationsåbninger og kælderlys",
        "Hold afstand mellem hegn/hæk og hus så stier ikke gror til",
      ],
    },
    {
      heading: "6. Hvornår skal du hyre privat firma?",
      paragraphs: [
        "Hvis kommunens bekæmper ikke har løst problemet inden for 2–3 besøg, eller hvis du har akut behov uden for åbningstid, kan privat firma være vejen frem. Tjek forsikringen først — mange husforsikringer dækker både privat bekæmpelse og kloakreparation som følge af rotteskader.",
      ],
      body: (
        <p>
          Sammenlign priser i <Link to="/blog/skadedyrsbekaempelse-pris-sammenligning">skadedyrsbekæmpelse pris-sammenligning</Link>{" "}
          og se også <Link to="/blog/rottebekaempelse-pris-2026">rottebekæmpelse pris 2026</Link>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/rottebekaempelse-pris-2026">Rottebekæmpelse pris 2026</Link></li>
          <li><Link to="/blog/rotter-eller-mus">Rotter eller mus — kend forskellen</Link></li>
          <li><Link to="/blog/skadedyrsbekaempelse-pris-sammenligning">Skadedyrsbekæmpelse — prissammenligning</Link></li>
          <li><Link to="/blog/skadedyr-i-koekkenet-hvad-goer-jeg">Skadedyr i køkkenet</Link></li>
          <li><Link to="/blog/kloakmester-pris-2026">Kloakmester pris 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default RatsInGarden;