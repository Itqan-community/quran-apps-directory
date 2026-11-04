import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an app description as GitHub-flavored markdown inside `.app-md`
 * (styling lives in app-detail.css). Plain component — no "use client":
 * react-markdown is isomorphic, so this works in both RSC and client
 * components. Note: single newlines in legacy plain-text descriptions now
 * collapse to spaces (CommonMark); the old view used `white-space: pre-line`.
 * If that matters for existing content, add the `remark-breaks` plugin.
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
        {text}
      </ReactMarkdown>
    </div>
  );
}
