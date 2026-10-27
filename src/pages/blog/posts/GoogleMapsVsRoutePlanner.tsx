import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "google-maps-eller-ruteplanlaegger",
  keywords: "google maps ruteplan, google maps flere stop, ruteplanlægger firma, ruteplan bil, krak ruteplan alternativ",
  faq: [
    { q: "Kan jeg bruge Google Maps til mit firma?", a: "Til at finde vej, ja. Men det holder ikke styr på kunder, intervaller eller hvem der kører hvor — det skal du så gøre et andet sted." },
    { q: "Bruger en ruteplanlægger stadig Google Maps?", a: "Mange gør, også Serviceydere: medarbejderen kan åbne navigation til næste kunde direkte fra ruten." },
  ],
  sections: [
    { paragraphs: [
      "Google Maps, Krak og lignende er gode til én ting: at finde vej fra A til B. Et firma med faste kunder har brug for mere end det.",
    ] },
    { heading: "Det kan kortapps", list: [
      "Vise vejen og trafik i realtid.",
      "Beregne køretid mellem få adresser.",
      "Gratis og kendt af alle.",
    ] },
    { heading: "Det kan de ikke", list: [
      "Huske hvilke kunder der skal besøges hver 4. eller 8. uge.",
      "Fordele dagen mellem flere medarbejdere.",
      "Vise om dagen kan nås med de besøgstider, du har.",
      "Registrere at et besøg er udført, og sende det videre til faktura.",
    ] },
    { heading: "Tommelfingerregel", paragraphs: [
      "Har du færre end ti kunder og kører selv, kan et kort og en kalender række. Har du faste kunder med intervaller eller ansatte, sparer en ruteplanlægger dig tid hver eneste dag — og du kan stadig bruge Google Maps til selve navigationen.",
    ] },
    { body: <TrialNote /> },
  ],
});
