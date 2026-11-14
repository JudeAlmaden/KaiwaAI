"use client";

// Inline token parser for markdown: **bold**, *italic*, `code`, [label](url)
function renderInlineTokens(str: string): React.ReactNode {
  const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length >= 2) {
      return (
        <em key={i} className="italic text-fg/90">
          {tok.slice(1, -1)}
        </em>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length >= 2) {
      return (
        <code
          key={i}
          className="rounded bg-bg border border-border px-1 py-0.5 font-mono text-[11px] text-indigo-ai"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = tok.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-ai underline underline-offset-2 hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return tok;
  });
}

// Clean markdown formatted text renderer
export function FormattedText({
  text,
  className = "",
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className={`space-y-1.5 text-xs leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Headings
        if (line.startsWith("### ")) {
          return (
            <h5 key={idx} className="font-semibold text-fg text-xs mt-2 pt-0.5">
              {renderInlineTokens(line.slice(4))}
            </h5>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h4 key={idx} className="font-bold text-fg text-sm mt-2 pt-0.5">
              {renderInlineTokens(line.slice(3))}
            </h4>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h3 key={idx} className="font-bold text-fg text-base mt-2.5 pt-0.5">
              {renderInlineTokens(line.slice(2))}
            </h3>
          );
        }

        // Blockquotes
        if (line.startsWith("> ")) {
          return (
            <div
              key={idx}
              className="border-l-2 border-indigo-ai/60 pl-2.5 italic text-fg/85 my-1 bg-indigo-ai/5 py-1 rounded-r"
            >
              {renderInlineTokens(line.slice(2))}
            </div>
          );
        }

        // Bullet lists
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-fg/90">
              <span className="text-indigo-ai text-[10px] leading-tight mt-0.5 font-bold">•</span>
              <span>{renderInlineTokens(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-fg/90">
              <span className="font-mono text-[10px] text-indigo-ai font-semibold">{numMatch[1]}.</span>
              <span>{renderInlineTokens(numMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <p key={idx} className="text-fg/80">
            {renderInlineTokens(line)}
          </p>
        );
      })}
    </div>
  );
}
