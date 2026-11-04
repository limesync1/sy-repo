import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "medarbejder-app-uden-daekning",
  keywords: "offline app, medarbejder app, app uden internet",
  faq: [
    { q: "Kan billeder sendes offline?", a: "Billeder kræver net for at blive gemt; resten af stoppet kan markeres udført." },
    { q: "Virker det på Android og iPhone?", a: "Ja, Serviceydere findes som Android-app og som app på hjemmeskærmen på iPhone." },
  ],
  sections: [
    { paragraphs: [
      "Mange stop ligger netop dér, hvor dækningen er dårlig. Hvis appen kræver net for at markere et stop udført, ender medarbejderen med at huske det til senere — og glemme det.",
    ] },
    { heading: "Det skal en offline-venlig app kunne", list: [
      "Vise dagens rute, selv om nettet er væk.",
      "Gemme 'udført' lokalt og sende det, når nettet kommer igen.",
      "Vise tydeligt, hvad der venter på at blive sendt.",
      "Undgå dobbelte registreringer, når forbindelsen kommer tilbage.",
    ] },
    { heading: "Gode råd i hverdagen", list: [
      "Åbn dagens rute om morgenen med net.",
      "Lad appen køre i baggrunden frem for at lukke den.",
      "Tjek at køen er tom ved dagens afslutning.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
