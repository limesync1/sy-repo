import { Fragment, useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { isValidSitePath, normalizeSitePath } from "@/lib/site-paths";

/**
 * Letvægts-markdown til chatbeskeder.
 * Understøtter: **fed**, *kursiv*, `kode`, [tekst](url), rå URL'er/e-mails,
 * punktlister (-, *, •) og nummererede lister.
 * Ingen ekstern afhængighed, og alt tekst brydes så bobler aldrig flyder ud.
 * Interne links valideres mod de sider der faktisk findes — ugyldige stier
 * vises som ren tekst i stedet for et dødt link.
 */

const INLINE_RE =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/|mailto:)[^)\s]+\)|https?:\/\/[^\s<>()]+|(?:^|\s)\/[a-z0-9\-/]{2,}|[\w.+-]+@[\w-]+\.[\w.]{2,})/gi;

const LINK_CLASS =
  "font-medium underline decoration-current/40 underline-offset-[3px] transition-colors hover:decoration-current [overflow-wrap:anywhere]";

function toInternalPath(href: string) {
  if (href.startsWith("/")) return normalizeSitePath(href);
  const m = href.match(/^https?:\/\/(?:www\.)?serviceydere\.dk(\/[^\s]*)?$/i);
  return m ? normalizeSitePath(m[1] || "/") : null;
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  const internal = toInternalPath(href);
  if (internal && !internal.endsWith(".pdf")) {
    // Ugyldig intern sti → vis teksten uden link, så kunden aldrig lander på 404.
    if (!isValidSitePath(internal)) return <>{children}</>;
    return (
      <RouterLink to={internal} className={LINK_CLASS}>
        {children}
      </RouterLink>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {children}
      <ArrowUpRight className="ml-0.5 inline h-3 w-3 align-[-1px] opacity-70" aria-hidden="true" />
    </a>
  );
}



function renderInline(text: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(INLINE_RE.source, "gi");

  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const leading = raw.match(/^\s/) ? raw[0] : "";
    const token = leading ? raw.slice(1) : raw;
    const start = match.index + leading.length;

    if (start > last) nodes.push(text.slice(last, start));
    const key = `${keyPrefix}-${start}`;

    if (/^(\*\*|__)/.test(token)) {
      nodes.push(<strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>);
    } else if (/^\*[^*]/.test(token)) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-current/10 px-1 py-0.5 font-mono text-[0.9em] [overflow-wrap:anywhere]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const m = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (m) nodes.push(<Link key={key} href={m[2]}>{m[1]}</Link>);
      else nodes.push(token);
    } else if (/^https?:\/\//i.test(token)) {
      const trimmed = token.replace(/[.,;:)]+$/, "");
      nodes.push(<Link key={key} href={trimmed}>{trimmed.replace(/^https?:\/\//, "")}</Link>);
      if (trimmed !== token) nodes.push(token.slice(trimmed.length));
    } else if (token.startsWith("/")) {
      nodes.push(<Link key={key} href={token}>{token}</Link>);
    } else {
      nodes.push(<Link key={key} href={`mailto:${token}`}>{token}</Link>);
    }

    if (leading) nodes.splice(nodes.length - 1, 0, leading);
    last = match.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ChatMessageText({ content, className = "" }: { content: string; className?: string }) {
  const blocks = useMemo(() => {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const out: Array<
      | { type: "p"; lines: string[] }
      | { type: "ul"; items: string[] }
      | { type: "ol"; items: string[] }
    > = [];

    for (const line of lines) {
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
      const last = out[out.length - 1];

      if (bullet) {
        if (last?.type === "ul") last.items.push(bullet[1]);
        else out.push({ type: "ul", items: [bullet[1]] });
      } else if (numbered) {
        if (last?.type === "ol") last.items.push(numbered[1]);
        else out.push({ type: "ol", items: [numbered[1]] });
      } else if (line.trim() === "") {
        if (last?.type === "p") out.push({ type: "p", lines: [] });
      } else {
        const clean = line.replace(/^\s*#{1,6}\s+/, "");
        if (last?.type === "p") last.lines.push(clean);
        else out.push({ type: "p", lines: [clean] });
      }
    }
    return out.filter((b) => (b.type === "p" ? b.lines.length > 0 : b.items.length > 0));
  }, [content]);

  return (
    <div className={`space-y-2 [overflow-wrap:anywhere] ${className}`}>
      {blocks.map((block, bi) => {
        if (block.type === "p") {
          return (
            <p key={bi} className="leading-relaxed">
              {block.lines.map((line, li) => (
                <Fragment key={li}>
                  {li > 0 && <br />}
                  {renderInline(line, `${bi}-${li}`)}
                </Fragment>
              ))}
            </p>
          );
        }
        const ListTag = block.type === "ul" ? "ul" : "ol";
        return (
          <ListTag
            key={bi}
            className={`space-y-1 pl-4 leading-relaxed ${block.type === "ul" ? "list-disc" : "list-decimal"} marker:text-current/50`}
          >
            {block.items.map((item, ii) => (
              <li key={ii} className="pl-0.5">
                {renderInline(item, `${bi}-${ii}`)}
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}

export default ChatMessageText;
