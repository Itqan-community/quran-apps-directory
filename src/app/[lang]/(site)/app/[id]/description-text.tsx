"use client";

import { useState } from "react";
import { AppDescriptionMarkdown } from "@/components/apps/app-description-markdown";

/**
 * Port of the old app-detail description block: collapse >200 chars behind a
 * 90px truncated view with a fade, toggle via a read-more button.
 * Descriptions render as GitHub-flavored markdown (AppDescriptionMarkdown).
 */
export function DescriptionTextClient({
  text,
  labels,
}: {
  text: string;
  labels: { more: string; less: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const showToggle = text.length > 200;

  return (
    <>
      <div className={showToggle && !expanded ? "truncated" : undefined}>
        <AppDescriptionMarkdown text={text} />
      </div>
      {showToggle && (
        <button type="button" className="read-more-button" onClick={() => setExpanded(!expanded)}>
          {expanded ? labels.less : labels.more}
        </button>
      )}
    </>
  );
}
