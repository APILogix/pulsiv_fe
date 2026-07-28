import { Fragment, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free Markdown renderer.
 *
 * The project ships no markdown library, so this renders the subset the AI
 * surfaces produce — headings, paragraphs, bold/italic, inline code, fenced
 * code blocks, links, blockquotes, and ordered/unordered lists — without ever
 * using dangerouslySetInnerHTML (all output is React nodes, so untrusted model
 * output can't inject markup).
 */

type Block =
  | { kind: "code"; lang: string; content: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" }
  | { kind: "p"; text: string };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ kind: "code", lang, content: buf.join("\n") });
      continue;
    }

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph (consume until blank line)
    const buf: string[] = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^```/.test(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }

  return blocks;
}

// Inline tokenizer: bold, italic, inline code, links. Returns React nodes.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex =
    /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<Fragment key={`${keyPrefix}-t${n}`}>{text.slice(lastIndex, match.index)}</Fragment>);
      n += 1;
    }
    const [, , bold, boldU, ital, italU, code, linkText, linkHref] = match;
    if (bold ?? boldU) {
      nodes.push(
        <strong key={`${keyPrefix}-b${n}`} className="font-semibold text-[var(--text)]">
          {bold ?? boldU}
        </strong>,
      );
    } else if (ital ?? italU) {
      nodes.push(
        <em key={`${keyPrefix}-i${n}`} className="italic">
          {ital ?? italU}
        </em>,
      );
    } else if (code) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${n}`}
          className="rounded-[5px] bg-[var(--bg3)] px-1.5 py-0.5 font-[family-name:var(--mono)] text-[0.85em] text-[var(--brand)]"
        >
          {code}
        </code>,
      );
    } else if (linkText && linkHref) {
      nodes.push(
        <a
          key={`${keyPrefix}-l${n}`}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--brand)] underline underline-offset-2 hover:text-[var(--brand-d)]"
        >
          {linkText}
        </a>,
      );
    }
    n += 1;
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t${n}`}>{text.slice(lastIndex)}</Fragment>);
  }
  return nodes;
}

function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="group relative my-3 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg2)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        <span className="font-[family-name:var(--mono)] text-[11px] uppercase tracking-wide text-[var(--text3)]">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-1 text-[11px] text-[var(--text3)] transition-colors hover:text-[var(--text)]"
        >
          {copied ? <Check className="size-3 text-[var(--green)]" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="sidebar-scroll overflow-x-auto p-3">
        <code className="font-[family-name:var(--mono)] text-[12.5px] leading-relaxed text-[var(--text)]">
          {content}
        </code>
      </pre>
    </div>
  );
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = parseBlocks(content ?? "");
  return (
    <div className={cn("text-[13.5px] leading-relaxed text-[var(--text2)]", className)}>
      {blocks.map((block, index) => {
        const key = `blk-${index}`;
        switch (block.kind) {
          case "code":
            return <CodeBlock key={key} lang={block.lang} content={block.content} />;
          case "hr":
            return <hr key={key} className="my-4 border-[var(--border)]" />;
          case "heading": {
            const sizes = ["text-[18px]", "text-[16px]", "text-[15px]", "text-[14px]", "text-[13px]", "text-[13px]"];
            return (
              <p
                key={key}
                className={cn("mt-4 mb-2 font-semibold text-[var(--text)]", sizes[block.level - 1])}
              >
                {renderInline(block.text, key)}
              </p>
            );
          }
          case "ul":
            return (
              <ul key={key} className="my-2 ml-1 flex flex-col gap-1.5">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-[var(--text3)]" />
                    <span>{renderInline(item, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-2 ml-1 flex flex-col gap-1.5">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`} className="flex gap-2">
                    <span className="font-[family-name:var(--mono)] text-[12px] font-semibold text-[var(--brand)]">
                      {j + 1}.
                    </span>
                    <span>{renderInline(item, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="my-3 border-l-2 border-[var(--brand)] pl-3 text-[var(--text2)] italic"
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          default:
            return (
              <p key={key} className="my-2">
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
