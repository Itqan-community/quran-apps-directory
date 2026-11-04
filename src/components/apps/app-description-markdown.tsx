import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Heuristic: does this text "look like markdown"?
 *
 * Returns true if the text contains any structural markdown marker, i.e. the
 * author wrote it as markdown and we should hand it to the parser verbatim:
 *   - an ATX heading (`#`..`######` at line start, followed by a space/EOL)
 *   - an unordered list marker (`-`, `*`, or `+` at line start, indented OK)
 *   - an ordered list marker (digits + `.` at line start, indented OK)
 *   - a blockquote (`>` at line start)
 *   - a fenced code fence (``` or ~~~ at line start)
 *   - a table pipe (`|`) on a non-heading line
 *   - link/table syntax `[...](...)` anywhere
 *
 * Pure and exported for tests.
 */
export function looksLikeMarkdown(text: string): boolean {
  // Link or table-cell syntax anywhere in the text.
  if (/\[[^\]]*\]\([^)]*\)/.test(text)) return true;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimStart();
    if (/^#{1,6}(\s|$)/.test(line)) return true; // heading
    if (/^[-*+](\s|$)/.test(line)) return true; // unordered list
    if (/^\d+\.(?=\s|$)/.test(line)) return true; // ordered list
    if (/^>/.test(line)) return true; // blockquote
    if (/^(```|~~~)/.test(line)) return true; // fenced code
    // Table pipe used as a column separator on a non-heading line.
    if (!/^#/.test(line) && line.includes("|")) return true;
  }
  return false;
}

/**
 * Convert legacy plain-text newlines into markdown hard breaks.
 *
 * Every single `\n` that is NOT part of a `\n\n` paragraph break becomes a
 * hard break (`  \n` — two trailing spaces + newline), which CommonMark
 * renders as `<br>`. Paragraph breaks (blank lines) are left untouched.
 *
 * This restores the line-break behaviour of the old view (which used
 * `white-space: pre-line`) for pre-markdown descriptions, without adding the
 * `remark-breaks` dependency. Pure and exported for tests.
 */
export function legacyToHardBreaks(text: string): string {
  return text.replace(/(?<!\n)\n(?!\n)/g, "  \n");
}

/**
 * Preprocess a description before handing it to ReactMarkdown:
 *   - if the text looks like markdown, return it verbatim (stray single
 *     newlines collapse per CommonMark — accepted);
 *   - otherwise treat it as legacy plain text and turn single newlines into
 *     hard breaks so line breaks are preserved.
 */
export function prepareDescription(text: string): string {
  if (looksLikeMarkdown(text)) return text;
  return legacyToHardBreaks(text);
}

/**
 * Renders an app description as GitHub-flavored markdown inside `.app-md`
 * (styling lives in app-detail.css). Plain component — no "use client":
 * react-markdown is isomorphic, so this works in both RSC and client
 * components.
 *
 * Descriptions are preprocessed (see {@link prepareDescription}): markdown is
 * rendered as-is, while legacy plain-text descriptions get their single
 * newlines converted to hard breaks so line breaks survive (the old view used
 * `white-space: pre-line`). This avoids the `remark-breaks` dependency.
 */
export function AppDescriptionMarkdown({ text }: { text: string }) {
  return (
    <div className="app-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {prepareDescription(text)}
      </ReactMarkdown>
    </div>
  );
}
