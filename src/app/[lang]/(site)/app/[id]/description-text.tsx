"use client";

import { useState } from "react";

/**
 * Port of the old app-detail description block: collapse >200 chars behind a
 * 90px truncated view with a fade, toggle via a read-more button.
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
      <p className={showToggle && !expanded ? "truncated" : undefined}>{text}</p>
      {showToggle && (
        <button type="button" className="read-more-button" onClick={() => setExpanded(!expanded)}>
          {expanded ? labels.less : labels.more}
        </button>
      )}
    </>
  );
}
