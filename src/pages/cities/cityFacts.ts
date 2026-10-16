// Fælles byfakta, som alle branche-bysider bygger på. Branchens egne tekster
// kombinerer disse fakta med branchespecifikke forhold, så hver side er unik.

export interface CityFact {
  slug: string;
  name: string;
  region: string;
  postalRange: string;
  /** Prisniveau i forhold til landsgennemsnit (1 = gennemsnit). */
  factor: number;
  /** Hvor de fleste bor, fx "parcelhuse i Hasseris og Gug". */
  housing: string;
  /** Ældre bebyggelse, fx "byhusene i Vestbyen". */
  older: string;
  /** Nyere bebyggelse, fx "de nye kvarterer i Aarhus Ø". */
  newer: string;
  /** Lokalt klima/terræn i én sætning. */
  climate: string;
  areas: string[];
}

export const CITY_FACTS: CityFact[] = [
  { slug: "koebenhavn", name: "København", region: "Hovedstaden", postalRange: "1000–2500", factor: 1.12,
    housing: "lejligheder i etageejendomme på Nørrebro, Østerbro og Vesterbro", older: "de gamle etageejendomme fra 1890–1930 i brokvartererne", newer: "nybyggeriet i Nordhavn, Ørestad og Sydhavnen",
    climate: "Trange gårde, trapper uden elevator og dyr parkering gør mange opgaver mere tidskrævende end i resten af landet.",
    areas: ["Indre By", "Østerbro", "Nørrebro", "Vesterbro", "Amager", "Valby", "Vanløse", "Brønshøj"] },
  { slug: "frederiksberg", name: "Frederiksberg", region: "Hovedstaden", postalRange: "1800–2000", factor: 1.12,
    housing: "store andelslejligheder og villaer omkring Frederiksberg Allé og Søndermarken", older: "de klassiske herskabslejligheder med stuk og høje lofter", newer: "de få nye projekter ved Flintholm og Porcelænshaven",
    climate: "Tæt bebyggelse og strenge regler i bevaringsværdige ejendomme kræver ofte aftale med ejerforeningen før arbejdet går i gang.",
    areas: ["Frederiksberg C", "Fuglebakken", "Søndermarken", "Flintholm", "Frederiksberg Allé", "Grøndal"] },
  { slug: "aarhus", name: "Aarhus", region: "Midtjylland", postalRange: "8000–8270", factor: 1.05,
    housing: "lejligheder i Midtbyen og Trøjborg og parcelhuse i Risskov, Højbjerg og Viby", older: "byhusene på Frederiksbjerg og i Latinerkvarteret", newer: "de nye kvarterer på Aarhus Ø og i Lisbjerg",
    climate: "Bakket terræn og vind fra bugten slider på facader og tage i Risskov og Egå.",
    areas: ["Midtbyen", "Trøjborg", "Frederiksbjerg", "Risskov", "Højbjerg", "Viby", "Brabrand", "Aarhus Ø"] },
  { slug: "odense", name: "Odense", region: "Syddanmark", postalRange: "5000–5270", factor: 1.0,
    housing: "parcelhuse og rækkehuse i Hjallese, Tarup og Dalum", older: "de gamle byhuse omkring H.C. Andersen-kvarteret i Odense C", newer: "de nye boliger ved havnen og i Kvarterløft-områderne",
    climate: "Flad fynsk jord og kort afstand til det meste giver lave kørselstillæg.",
    areas: ["Odense C", "Hjallese", "Dalum", "Tarup", "Bolbro", "Fraugde", "Bellinge", "Paarup"] },
  { slug: "aalborg", name: "Aalborg", region: "Nordjylland", postalRange: "9000–9220", factor: 0.97,
    housing: "parcelhuse i Hasseris, Vejgaard og Gug", older: "byhusene i Vestbyen og Østbyen", newer: "studieboligerne og de nye kvarterer ved havnefronten",
    climate: "Fugt og vestenvind fra Limfjorden giver hårdere slid på udvendige materialer.",
    areas: ["Aalborg C", "Hasseris", "Vejgaard", "Nørresundby", "Gug", "Vestbyen", "Skalborg", "Svenstrup"] },
  { slug: "esbjerg", name: "Esbjerg", region: "Syddanmark", postalRange: "6700–6715", factor: 0.95,
    housing: "villaer fra 1960'erne og 70'erne i Sædding, Hjerting og Gjesing", older: "murermestervillaerne og byhusene i Esbjerg C", newer: "de nye udstykninger i Tarp og Gjesing Nord",
    climate: "Salt luft og sand fra Vesterhavet nedbryder udvendige materialer hurtigere end inde i landet.",
    areas: ["Esbjerg C", "Hjerting", "Sædding", "Gjesing", "Jerne", "Tarp", "Bramming", "Ribe"] },
  { slug: "randers", name: "Randers", region: "Midtjylland", postalRange: "8900–8983", factor: 0.93,
    housing: "parcelhuse i Vorup, Kristrup og Dronningborg", older: "de ældre arbejderboliger og byhuse omkring centrum", newer: "de nye boliger ved Gudenåen og havnen",
    climate: "Ådalen giver fugtig luft langs Gudenåen, mens de højere kvarterer ligger tørt.",
    areas: ["Randers C", "Vorup", "Kristrup", "Dronningborg", "Romalt", "Assentoft", "Langå", "Spentrup"] },
  { slug: "kolding", name: "Kolding", region: "Syddanmark", postalRange: "6000–6093", factor: 0.98,
    housing: "villakvartererne i Bramdrupdam, Seest og Strandhuse", older: "de ældre villaer og byhuse omkring Koldinghus", newer: "de nye huse i Bramdrupdam og Marielund",
    climate: "Huse ved fjorden i Strandhuse ligger åbent for vind, mens de indre kvarterer er mere skærmede.",
    areas: ["Kolding C", "Bramdrupdam", "Seest", "Strandhuse", "Sønder Bjert", "Vamdrup", "Lunderskov", "Christiansfeld"] },
  { slug: "vejle", name: "Vejle", region: "Syddanmark", postalRange: "7100–7184", factor: 1.0,
    housing: "huse på skrånende grunde i Nørremarken og Mølholm", older: "de ældre byhuse i Vejle midtby", newer: "lejlighederne ved havnen omkring Bølgen",
    climate: "Stejle grunde gør adgang, stilladser og affaldshåndtering sværere end i flade byer.",
    areas: ["Vejle C", "Nørremarken", "Mølholm", "Søndermarken", "Vinding", "Bredballe", "Give", "Jelling"] },
  { slug: "horsens", name: "Horsens", region: "Midtjylland", postalRange: "8700–8740", factor: 0.95,
    housing: "nye parcelhuse i Stensballe og Egebjerg", older: "byhusene i Horsens centrum", newer: "de mange nye udstykninger i Stensballe og Lund",
    climate: "Byen vokser hurtigt, så mange opgaver handler om nybyggeri og første vedligehold.",
    areas: ["Horsens C", "Stensballe", "Egebjerg", "Torsted", "Lund", "Hatting", "Brædstrup", "Gedved"] },
  { slug: "silkeborg", name: "Silkeborg", region: "Midtjylland", postalRange: "8600–8632", factor: 0.98,
    housing: "villaer og parcelhuse tæt på skov og søer i Balle, Virklund og Gødvad", older: "de ældre villaer på Vestre Højmark og i midtbyen", newer: "de nye boliger ved Papirfabrikken og i Sejs-Svejbæk",
    climate: "Skov og søer giver skygge og fugt, som betyder mere mos, alger og slid på træværk.",
    areas: ["Silkeborg C", "Balle", "Virklund", "Gødvad", "Sejs-Svejbæk", "Lysbro", "Kjellerup", "Them"] },
  { slug: "herning", name: "Herning", region: "Midtjylland", postalRange: "7400–7430", factor: 0.93,
    housing: "parcelhuse i Lind, Tjørring og Gullestrup", older: "de ældre villaer omkring centrum og Fruehøjgaard", newer: "de nye kvarterer ved Birk og Brændgårdvej",
    climate: "Flad hedeegn med lange afstande til oplandet, så kørsel til Sunds, Aulum og Ikast er almindelig.",
    areas: ["Herning C", "Lind", "Tjørring", "Gullestrup", "Birk", "Sunds", "Aulum", "Ikast"] },
  { slug: "roskilde", name: "Roskilde", region: "Sjælland", postalRange: "4000–4040", factor: 1.05,
    housing: "villaer i Himmelev, Svogerslev og Vor Frue", older: "de ældre villaer og byhuse omkring domkirken", newer: "de nye kvarterer i Trekroner og Musicon",
    climate: "Prisniveauet ligger tæt på hovedstadsområdet, og store villagrunde giver lang vej fra bil til hus.",
    areas: ["Roskilde C", "Himmelev", "Svogerslev", "Vor Frue", "Trekroner", "Gadstrup", "Jyllinge", "Viby Sj."] },
  { slug: "helsingoer", name: "Helsingør", region: "Hovedstaden", postalRange: "3000", factor: 1.05,
    housing: "villaer og sommerhuse langs Nordkysten i Hornbæk, Espergærde og Snekkersten", older: "de fredede købmandsgårde og byhuse i den gamle bykerne", newer: "de nye boliger ved Nordhavnen og Kronborg",
    climate: "Kystnære huse får salt og vind, og sommerhusejere bestiller ofte arbejde, mens de ikke selv er der.",
    areas: ["Helsingør C", "Snekkersten", "Espergærde", "Hornbæk", "Tikøb", "Ålsgårde", "Hellebæk"] },
  { slug: "naestved", name: "Næstved", region: "Sjælland", postalRange: "4700", factor: 0.95,
    housing: "parcelhuse i Kalbyris, Rønnebæk og Herlufmagle", older: "de ældre byhuse i Næstved centrum", newer: "de nye udstykninger mod Fensmark",
    climate: "Lerholdig jord og fugtige vintre stiller krav til fundamenter, kloak og afvanding.",
    areas: ["Næstved C", "Kalbyris", "Rønnebæk", "Herlufmagle", "Fensmark", "Glumsø", "Karrebæksminde"] },
  { slug: "hilleroed", name: "Hillerød", region: "Hovedstaden", postalRange: "3400", factor: 1.05,
    housing: "villaer og rækkehuse i Ullerød, Trollesminde og Alsønderup", older: "de ældre villaer omkring Frederiksborg Slot", newer: "den nye bydel Ullerødbyen",
    climate: "Mange skovnære grunde betyder skygge, blade i tagrender og ekstra fugt.",
    areas: ["Hillerød C", "Ullerød", "Trollesminde", "Alsønderup", "Gadevang", "Skævinge", "Gørløse"] },
  { slug: "holstebro", name: "Holstebro", region: "Midtjylland", postalRange: "7500–7560", factor: 0.92,
    housing: "parcelhuse i Mejdal, Tvis og Skave", older: "de ældre villaer omkring Storåen og centrum", newer: "de nye kvarterer i Holstebro Nord",
    climate: "Vestjysk vejr med meget vind og regn slider på tage, facader og vinduer.",
    areas: ["Holstebro C", "Mejdal", "Tvis", "Skave", "Sevel", "Vinderup", "Struer"] },
  { slug: "slagelse", name: "Slagelse", region: "Sjælland", postalRange: "4200", factor: 0.93,
    housing: "parcelhuse i Antvorskov, Vårby og Sorø-vejen", older: "de ældre byhuse omkring Sankt Mikkels Kirke", newer: "de nye boliger ved Slagelse Nord",
    climate: "Mange huse fra 1960'erne og 70'erne nærmer sig tidspunktet for større renovering.",
    areas: ["Slagelse C", "Antvorskov", "Vårby", "Korsør", "Skælskør", "Dalmose", "Sorø"] },
];

export const findCityFact = (slug?: string) => CITY_FACTS.find((c) => c.slug === slug?.toLowerCase());
