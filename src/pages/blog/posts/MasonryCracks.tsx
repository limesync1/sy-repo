import BlogArticleLayout from "../BlogArticleLayout";
import { findBlogPost } from "../blogPosts";

const post = findBlogPost("murer-revner-og-fugtskader")!;

const MasonryCracks = () => (
  <BlogArticleLayout
    post={post}
    keywords="revner i muren, sætningsrevner, murer pris, fugtskade mur, mursten løse"
    faq={[
      { q: "Hvornår er en revne farlig?", a: "Vandrette revner, revner bredere end 2 mm, trappetrinsrevner i hjørner og revner der vokser over tid bør altid vurderes af en byggesagkyndig eller murer. Tynde lodrette hårrevner under 1 mm er typisk kosmetiske." },
      { q: "Hvad koster det at få lavet revner?", a: "Mindre revneudbedring koster typisk 3.000–8.000 kr. Større sætningsskader med fundamentsforstærkning kan løbe op i 50.000–200.000 kr." },
      { q: "Dækker forsikringen revner?", a: "Pludselige sætningsskader fra fx kloakkollaps kan være dækket. Almindelige sætninger over tid er normalt ikke dækket — derfor vigtigt at handle hurtigt og dokumentere udviklingen." },
    ]}
  >
    <h2>1. Lær de forskellige typer revner at kende</h2>
    <ul>
      <li><strong>Hårrevner (&lt; 0,5 mm)</strong> — kosmetiske, kan oftest fuges/males over.</li>
      <li><strong>Lodrette revner</strong> — typisk pga. svind i puds eller mørtel, sjældent kritisk.</li>
      <li><strong>Vandrette revner</strong> — alarmerende, kan indikere problemer med fundament eller bærende konstruktioner.</li>
      <li><strong>Trappetrinsrevner</strong> i hjørner — klassisk tegn på sætning, skal vurderes.</li>
    </ul>

    <h2>2. Mål revnens udvikling</h2>
    <p>
      Tegn en streg på tværs af revnen med en blyant og noter datoen. Mål bredden med en revnemåler
      (kan fås for ~50 kr.). Tjek igen efter 4 og 12 uger. Hvis revnen vokser, ring til murer
      eller byggesagkyndig.
    </p>

    <h2>3. Fugtskader — let at overse</h2>
    <p>
      Mørke pletter, hvide saltudblomstringer eller smuldrende fuger nederst på facaden tyder på
      opstigende fugt. Det skal udbedres hurtigt — fugt der får lov at sive ind giver skimmel og
      svækker murværket.
    </p>

    <h2>4. Løse mursten</h2>
    <p>
      Bank let på stenene med en hammer — en hul lyd kan indikere løse sten. Udskift løse sten
      hurtigt, især i toppen af murværket, så de ikke falder ned.
    </p>

    <h2>5. Typiske priser (2026)</h2>
    <ul>
      <li>Murer timepris: 475–625 kr. inkl. moms.</li>
      <li>Udbedring af mindre revne: 3.000–8.000 kr.</li>
      <li>Omfugning af facade (100 m²): 35.000–60.000 kr.</li>
      <li>Sætningsskade m. fundamentsforstærkning: 50.000–200.000+ kr.</li>
    </ul>

    <h2>6. Få altid 2–3 tilbud</h2>
    <p>
      Murerarbejde varierer kraftigt i pris. Bed om at tilbuddet inkluderer: opmåling,
      materialevalg (mørteltype, evt. armering), stillads/lift, opmuring og afsluttende oprydning.
    </p>
  </BlogArticleLayout>
);

export default MasonryCracks;