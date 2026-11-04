import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  "slug": "adresser-ruteplanlaegning-tjekliste",
  "keywords": "ruteplanlægning adresser, adresse uden koordinater, kørselsplanlægning",
  "faq": [
    {
      "q": "Kan jeg bruge CVR-adressen som serviceadresse?",
      "a": "Kun hvis arbejdet faktisk udføres dér. Registreret virksomhedsadresse og serviceadresse kan være forskellige."
    },
    {
      "q": "Betyder manglende koordinater, at adressen er ugyldig?",
      "a": "Nej. Det betyder, at systemet mangler et brugbart kortpunkt. Kontrollér adressen og opslagets resultat."
    }
  ],
  "sections": [
    {
      "paragraphs": [
        "Hvis en adresse mangler på kortet, bør du rette oplysningerne, før ruten optimeres. Et kundenavn og et postnummer er ikke altid nok til at finde det rigtige sted. Denne tjekliste hjælper med at skelne mellem en forkert adresse, et forkert kortpunkt og adgang til arbejdsstedet."
      ]
    },
    {
      "heading": "Kontrollér serviceadressen først",
      "paragraphs": [
        "Start med vejnavn, husnummer, eventuelt bogstav, postnummer og by. Brug den adresse, hvor opgaven udføres — ikke automatisk faktureringsadressen eller virksomhedens registrerede adresse.",
        "Ved erhvervskunder kan kontoret ligge et andet sted end lageret eller ejendommen, der skal serviceres. Et CVR-opslag er derfor ikke i sig selv bevis for den rigtige serviceadresse."
      ]
    },
    {
      "heading": "Undgå at gætte ved flere resultater",
      "paragraphs": [
        "Samme vejnavn kan findes i flere byer. Hvis opslaget giver flere forslag, skal postnummer, husnummer og by kontrolleres samlet. Vælg ikke første resultat alene, fordi vejnavnet ligner.",
        "Nye veje, alternative stavemåder og særlige husnumre kan gøre opslag vanskeligt. Spørg kunden, hvis oplysningerne ikke entydigt kan bekræftes, og behold den usikre adresse til manuel opfølgning."
      ]
    },
    {
      "heading": "Se på punktet — ikke kun adressefeltet",
      "paragraphs": [
        "En tekstadresse kan se rigtig ud, selv om kortpunktet er forkert. Kontrollér, at punktet ligger ved det relevante arbejdssted. En placering i centrum af byen eller langt fra vejnavnet er et tegn på, at resultatet kræver kontrol.",
        "Manglende koordinater betyder, at et brugbart punkt ikke er tilgængeligt i systemet. Det beviser ikke, at kunden ikke findes. Ret oplysningerne og prøv opslaget igen, før besøget indgår i en køretidsvurdering."
      ]
    },
    {
      "heading": "Adgang er en særskilt oplysning",
      "paragraphs": [
        "En korrekt adresse fortæller ikke nødvendigvis, hvor medarbejderen må parkere eller gå ind. Notér indgang, port og praktiske adgangsforhold i opgavenoterne, ikke i vejnavnet.",
        "Undgå at sprede adgangskoder eller private oplysninger i offentlige beskrivelser. Del kun det, medarbejderen har brug for, gennem den relevante interne arbejdsgang."
      ]
    },
    {
      "heading": "Kontrollér ruten igen efter rettelsen",
      "paragraphs": [
        "Når adressen er rettet, skal placeringen og stoprækkefølgen vurderes igen. En tidligere beregning kan være baseret på et forkert punkt eller et manglende stop.",
        "I Serviceydere kan adresser uden koordinater gennemgås fra ruteplanlæggerens advarsel. Brug det til at få styr på de konkrete kundeadresser, og afslut med at kontrollere den relevante rute på kortet."
      ]
    },
    { heading: "Læs videre", body: <p><a href="/blog/ruteplanlaegning-excel-til-system">adresseoprydning i regneark</a> · <a href="/blog/ruteoptimering">ruteoptimering</a> · <a href="/software/ruteplanlaegger">Serviceyderes ruteplanlægger</a></p> },
    { body: <p><a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.</p> }
  ]
});
