import { Fragment, type ReactNode } from "react";
import type { GuideConfig } from "@/pages/guides/defineGuidePage";
import type { SoftwareConfig } from "@/pages/software/defineSoftwarePage";
import QuickAnswer from "@/components/content/QuickAnswer";

type Section = { heading?: string; paragraphs?: ReactNode[]; list?: ReactNode[]; ordered?: ReactNode[]; body?: ReactNode };

export const ContentSections = ({ sections }: { sections: Section[] }) => <>
  {sections.map((section, index) => <Fragment key={index}>
    {section.heading && <h2>{section.heading}</h2>}
    {section.paragraphs?.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    {section.list && <ul>{section.list.map((item, i) => <li key={i}>{item}</li>)}</ul>}
    {section.ordered && <ol>{section.ordered.map((item, i) => <li key={i}>{item}</li>)}</ol>}
    {section.body}
  </Fragment>)}
</>;

export const ContentQuestions = ({ items }: { items: { q: string; a: string }[] }) => items.length ? <section>
  <h2>Ofte stillede spørgsmål</h2>
  {items.map(item => <Fragment key={item.q}><h3>{item.q}</h3><p>{item.a}</p></Fragment>)}
</section> : null;

export const GuideBody = ({ config }: { config: GuideConfig }) => <article>
  <h1>{config.heroTitle}</h1><p>{config.heroSubtitle}</p>
  <QuickAnswer facts={config.quickFacts} />
  <table>
    <thead><tr><th>{config.priceTable.headers?.label ?? "Opgave"}</th><th>{config.priceTable.headers?.price ?? "Typisk pris"}</th><th>{config.priceTable.headers?.note ?? "Note"}</th></tr></thead>
    <tbody>{config.priceTable.rows.map((row, i) => <tr key={i}><td>{row.label}</td><td>{row.price}</td><td>{row.note}</td></tr>)}</tbody>
  </table>
  {config.priceTable.footnote && <p>{config.priceTable.footnote}</p>}
  <ContentSections sections={config.sections} />
  <ContentQuestions items={config.faq} />
</article>;

export const SoftwareBody = ({ config }: { config: SoftwareConfig }) => <article>
  <h1>{config.heroTitle}</h1><p>{config.heroSubtitle}</p><p>{config.answer}</p>
  <h2>Kort fortalt</h2><ul>{config.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>
  <ContentSections sections={config.sections} />
  <ContentQuestions items={config.faq} />
</article>;