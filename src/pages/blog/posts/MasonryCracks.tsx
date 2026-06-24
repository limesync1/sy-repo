import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const MasonryCracks = defineBlogPost({
  slug: "murer-revner-og-fugtskader",
  keywords:
    "revner i muren, sætningsrevner, murer pris, fugtskade mur, mursten løse, omfugning",
  faq: [
    { q: "Hvornår er en revne farlig?", a: "Vandrette revner, revner bredere end 2 mm, trappetrinsrevner i hjørner og revner der vokser over tid bør altid vurderes af en byggesagkyndig eller murer. Tynde lodrette hårrevner under 1 mm er typisk kosmetiske." },
    { q: "Hvad koster det at få lavet revner?", a: "Mindre revneudbedring 3.000–8.000 kr. Større sætningsskader med fundamentsforstærkning kan løbe op i 50.000–200.000 kr." },
    { q: "Dækker forsikringen revner?", a: "Pludselige sætningsskader fra fx kloakkollaps kan være dækket. Almindelige sætninger over tid er normalt ikke dækket — handl hurtigt og dokumentér udviklingen." },
    { q: "Hvad koster en murer i timen?", a: "475–625 kr./time inkl. moms i 2026. Stilladsleje (3.000–12.000 kr.) kommer typisk oveni større opgaver. Læs vores guide til murer-timepriser." },
    { q: "Skal jeg have byggetilladelse?", a: "Reparation af eksisterende mur kræver normalt ikke tilladelse. Ændring af facadens udtryk eller bærende konstruktioner kræver byggetilladelse — tjek kommunen." },
    { q: "Kan jeg bruge BoligJob på murerarbejde?", a: "Ja — vedligehold som omfugning og revneudbedring er fradragsberettiget. Nybyg og tilbygninger er ikke. Husk elektronisk betaling og momsregistreret firma." },
    { q: "Hvor lang levetid har omfugning?", a: "Korrekt udført omfugning med kalk-cement-mørtel holder 50–80 år. Forkert mørteltype (fx for hård cementmørtel på blød gammel sten) kan ødelægge facaden på 10–20 år." },
  ],
  sections: [
    {
      paragraphs: [
        "Revner i muren spænder fra ufarlige hårrevner til alvorlige sætningsskader, der kan koste hundredtusinder. Forskellen ligger i typen, bredden og om revnen udvikler sig. Her får du den fulde tjekliste og 2026-priser.",
      ],
    },
    {
      heading: "1. Kend revnerne",
      list: [
        "Hårrevner (< 0,5 mm): kosmetiske, fuges/males over",
        "Lodrette revner: typisk svind i puds/mørtel — sjældent kritisk",
        "Vandrette revner: alarmerende — kan indikere fundament/bærende konstruktioner",
        "Trappetrinsrevner i hjørner: klassisk sætning, skal vurderes",
        "Revner ved vinduer og døre: ofte sætning af overligger, kræver beslag eller ompudsning",
      ],
    },
    {
      heading: "2. Mål revnens udvikling",
      paragraphs: [
        "Tegn en streg på tværs af revnen med en blyant og noter datoen. Mål bredden med en revnemåler (~50 kr.). Tjek igen efter 4 og 12 uger. Vokser revnen mere end 0,5 mm — ring til murer eller byggesagkyndig.",
        "En revnemåler i karton lægges på tværs af revnen og viser bredden i mm. Tag billede ved hver måling, så du har en tidslinje, hvis du senere skal anmelde en skade.",
      ],
    },
    {
      heading: "3. Fugtskader — let at overse",
      list: [
        "Mørke pletter nederst på facaden — opstigende grundfugt",
        "Hvide saltudblomstringer — salte fra grundvand der trænger igennem",
        "Smuldrende fuger — frostsprængninger eller fejlmørtel",
        "Skimmel på indersiden af ydervæg — kuldebro + fugt",
      ],
      paragraphs: [
        "Fugt der får lov at sive ind giver skimmel og svækker murværket. Få det udbedret hurtigt — udsættelsesomkostningen vokser eksponentielt.",
      ],
    },
    {
      heading: "4. Løse mursten",
      paragraphs: [
        "Bank let på stenene med en hammer — en hul lyd kan indikere løse sten. Udskift løse sten hurtigt, især i toppen af murværket, så de ikke falder ned. En enkelt sten koster typisk 600–1.200 kr. at skifte inkl. mørtel og stillads ved højde.",
      ],
    },
    {
      heading: "5. Typiske priser (2026)",
      list: [
        "Murer timepris: 475–625 kr. inkl. moms",
        "Udbedring af mindre revne: 3.000–8.000 kr.",
        "Omfugning af facade (100 m²): 35.000–60.000 kr.",
        "Ny overligger over vindue: 8.000–18.000 kr.",
        "Sætningsskade m. fundamentsforstærkning: 50.000–200.000+ kr.",
        "Byggesagkyndig vurdering (2 timer): 4.000–7.500 kr.",
      ],
      body: (
        <p>
          Sammenlign med <Link to="/blog/murer-pris-pr-time-2026">murer pris pr. time 2026</Link>,{" "}
          <Link to="/blog/maler-koebenhavn-pris-2026">maler København 2026</Link> og{" "}
          <Link to="/blog/hvad-koster-facaderens">facaderens pris</Link>.
        </p>
      ),
    },
    {
      heading: "6. Få altid 2–3 tilbud",
      paragraphs: [
        "Murerarbejde varierer kraftigt i pris. Bed om at tilbuddet inkluderer: opmåling, materialevalg (mørteltype, evt. armering), stillads/lift, opmuring og afsluttende oprydning. Ved sætningsskader: insistér på en kort skriftlig årsagsanalyse — den bruges senere ved forsikring og videresalg.",
      ],
      body: (
        <p>
          Læs også <Link to="/blog/saadan-laeser-du-haandvaerkertilbud">sådan læser du håndværkertilbud</Link>,{" "}
          <Link to="/blog/roede-flag-i-haandvaerkertilbud">røde flag i tilbud</Link> og{" "}
          <Link to="/blog/garantitider-paa-haandvaerkerarbejde">garantitider på håndværkerarbejde</Link>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      body: (
        <ul>
          <li><Link to="/blog/murer-pris-pr-time-2026">Murer pris pr. time 2026</Link></li>
          <li><Link to="/blog/algebehandling-tag-og-facade">Algebehandling — tag og facade</Link></li>
          <li><Link to="/blog/hvad-koster-facaderens">Facaderens pris</Link></li>
          <li><Link to="/blog/saadan-vaelger-du-maler">Sådan vælger du maler</Link></li>
          <li><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradrag 2026</Link></li>
        </ul>
      ),
    },
  ],
});

export default MasonryCracks;