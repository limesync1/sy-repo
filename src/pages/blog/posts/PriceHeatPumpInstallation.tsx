import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "varmepumpe-installation-pris-2026",
  keywords:
    "varmepumpe installation pris 2026, luft til vand varmepumpe pris, luft til luft varmepumpe pris, jordvarme pris, varmepumpetilskud 2026, skifte fra olie til varmepumpe",
  faq: [
    { q: "Hvad koster en varmepumpe installeret i 2026?", a: "Luft-til-luft (1 split): 18.000–35.000 kr. inkl. moms. Luft-til-vand 8–12 kW: 95.000–175.000 kr. Jordvarme 10 kW: 145.000–245.000 kr. inkl. boring/slangeudlægning. Priserne er komplet installeret inkl. el og rør." },
    { q: "Kan jeg få tilskud i 2026?", a: "Ja — Energistyrelsens varmepumpetilskud 2026 giver typisk 15.000–35.000 kr. ved skift fra olie eller gas til luft-til-vand eller jordvarme. Tilskuddet søges FØR installation. Bygningspuljen kan derudover give 5.000–15.000 kr. til energiforbedringer." },
    { q: "Hvor lang tid tager installationen?", a: "Luft-til-luft (1 split): 1 dag. Luft-til-luft multisplit: 1–2 dage. Luft-til-vand: 2–4 dage. Jordvarme: 5–10 dage inkl. boring/jordarbejde. Bestil i god tid — ventetiden er 4–12 uger på populære modeller." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — arbejdsløn på installation og service er fradragsberettiget op til 12.900 kr./person/år. Et par kan trække 25.800 kr. Selve varmepumpen og materialer er IKKE fradragsberettiget, men varmepumpetilskuddet kan kombineres med BoligJob." },
    { q: "Hvor mange penge sparer jeg på opvarmning?", a: "Skift fra oliefyr til luft-til-vand: typisk 12.000–24.000 kr./år sparet på parcelhus 150 m². Skift fra gasfyr: 6.000–15.000 kr./år. Tilbagebetalingstid efter tilskud + BoligJob er typisk 6–10 år." },
    { q: "Hvilken type passer til mit hus?", a: "Lejlighed/lille bolig u. radiatorer: luft-til-luft. Parcelhus med radiatorer eller gulvvarme: luft-til-vand. Nybyggeri eller stor grund med god jord: jordvarme (dyrest, men mest effektiv). Bed altid om dimensioneringsberegning — undgå 'standardpakker' uden besøg." },
    { q: "Skal jeg have ny eltavle?", a: "Ofte ja. Luft-til-vand kræver 3-fase tilslutning (16–25 A). Ældre boliger har typisk kun 1-fase eller for lille hovedsikring. Tavleopgradering: 8.500–18.000 kr. ekstra. Inkluderes i tilbuddet hvis du gør elektrikeren opmærksom på det." },
    { q: "Hvad med støjen?", a: "Moderne udedele ligger på 35–48 dB(A) i 3 meter (svarer til en hvisken). Reglerne: max 35 dB(A) ved naboskel om natten. Placer den væk fra soveværelser og naboskel. Garanti dækker ikke støjklager — så aftal placering på et besøg, ikke pr. tegning." },
  ],
  sections: [
    { paragraphs: [
      "En varmepumpe er den største enkelt-investering du laver i din bolig efter taget og køkkenet — og en hvor du let kan tabe 40.000 kr. på den forkerte beslutning. Her er det fulde 2026-billede: faktiske priser, tilskud, hvilken type der passer til hvilken bolig, og hvad du skal kræve af et tilbud.",
      "Tre ting afgør prisen: typen (luft-til-luft, luft-til-vand, jordvarme), boligens m² og varmebehov, og hvor god din nuværende installation er (rør, eltavle, varmtvandsbeholder). Et godt tilbud specificerer alle tre.",
    ]},
    { heading: "Komplet pris pr. type inkl. moms (2026)", list: [
      "Luft-til-luft 1 split (lejlighed/lille bolig): 18.000–35.000 kr.",
      "Luft-til-luft multisplit (3 enheder, parcelhus): 35.000–55.000 kr.",
      "Luft-til-vand 8 kW (lille parcelhus): 95.000–145.000 kr.",
      "Luft-til-vand 12 kW (mellem parcelhus 130–160 m²): 115.000–165.000 kr.",
      "Luft-til-vand 16 kW (stort hus): 135.000–175.000 kr.",
      "Jordvarme 10 kW horisontal (stor grund): 145.000–195.000 kr.",
      "Jordvarme 10 kW vertikal boring: 175.000–245.000 kr.",
    ]},
    { heading: "Tilskud du kan kombinere (2026)", list: [
      "Varmepumpetilskud (Energistyrelsen): 15.000–35.000 kr. ved skift fra olie/gas",
      "Bygningspuljen energiforbedringer: 5.000–15.000 kr.",
      "BoligJob på arbejdsløn: op til 12.900 kr./person — ca. 4.000–6.500 kr. retur",
      "Skrotningspræmie for oliefyr: 2.000–5.000 kr. (varierer pr. kommune)",
    ]},
    { heading: "Reel nettopris (eksempler efter tilskud)", paragraphs: [
      "Parcelhus 130 m², skift fra oliefyr til luft-til-vand 12 kW. Bruttopris: 135.000 kr.",
    ], list: [
      "− Varmepumpetilskud: −25.000 kr.",
      "− Bygningspuljen: −10.000 kr.",
      "− BoligJob (par): −5.500 kr.",
      "= Reel pris: ca. 94.500 kr.",
      "Årlig besparelse vs. oliefyr: 18.000 kr. → tilbagebetalt på ca. 5,5 år.",
    ]},
    { heading: "Sådan undgår du 30.000 kr. i overraskelser", ordered: [
      "Kræv et fysisk besøg + dimensioneringsberegning. Ikke 'standardpakke pr. m²'.",
      "Få tilbuddet specificeret: enhed, montage, el, rør, evt. ny varmtvandsbeholder, tavleopgradering.",
      "Spørg om SCOP/COP-tal (effektivitet). SCOP under 4,0 er for dårligt i 2026.",
      "Aftal placering af udedel skriftligt + tjek støjkrav 35 dB(A) ved naboskel om natten.",
      "Bekræft at tilskud søges FØR opstart — ellers mister du dem.",
      "Få 3 tilbud. Spredningen er typisk 30–50% på identiske anlæg.",
      "Tjek garanti: 5 år på arbejde, 10 år på kompressor er markedsstandard.",
    ]},
    { heading: "Driftsomkostninger sammenlignet", list: [
      "Oliefyr 130 m² parcelhus: 28.000–35.000 kr./år",
      "Gasfyr 130 m²: 22.000–28.000 kr./år",
      "Fjernvarme 130 m²: 14.000–22.000 kr./år",
      "Luft-til-vand SCOP 4,2: 8.500–12.500 kr./år (afhænger af elpris)",
      "Jordvarme SCOP 4,8: 7.000–10.500 kr./år",
    ]},
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-elektriker-pr-time-2026">Hvad koster elektriker pr. time?</Link></li>
        <li key="l1"><Link to="/blog/varmepumpe-service-vedligehold">Varmepumpe service og vedligehold</Link></li>
        <li key="l2"><Link to="/blog/energimaerke-forklaret">Energimærke forklaret</Link></li>
        <li key="l3"><Link to="/blog/energirenovering-tilskud-2026">Tilskud til energirenovering 2026</Link></li>
        <li key="l4"><Link to="/blog/boligjob-fradrag-2026">BoligJob-fradraget 2026</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
