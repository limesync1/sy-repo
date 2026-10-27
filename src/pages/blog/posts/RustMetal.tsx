import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "fjern-rust-metal",
  keywords: "fjern rust, fjern rust fra metal, rust havemøbler, rust værktøj, fjern rust eddike",
  faq: [
    { q: "Hvad er det bedste middel mod rust?", a: "Til let rust virker eddike eller citronsyre godt. Til kraftig rust: stålbørste eller slibepapir, derefter rustbeskyttelse." },
  ],
  sections: [
    { paragraphs: [
      "Rust spiser sig langsomt ind i metal. Jo før du fjerner den, jo nemmere går det.",
    ] },
    { heading: "Let rust", ordered: [
      "Læg mindre ting i eddike eller citronsyrevand natten over.",
      "Skrub med stålbørste eller ståluld.",
      "Skyl, tør grundigt.",
      "Smør med olie eller rustbeskyttelse.",
    ] },
    { heading: "Større flader", list: [
      "Slib med stålbørste eller slibepapir.",
      "Påfør rustomdanner.",
      "Grund og mal havemøbler og låger.",
    ] },
    { body: (
      <p>
        <a href="/blog/fjern-rustpletter-fra-toej">Rustpletter fra tøj</a> · <a href="/guides/have">haveservice</a> · <a href="/tilbud">Indhent gratis tilbud på rengøring</a>.
      </p>
    ) },
  ],
});
