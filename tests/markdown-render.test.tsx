import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppDescriptionMarkdown,
  legacyToHardBreaks,
  looksLikeMarkdown,
} from "@/components/apps/app-description-markdown";

function render(text: string): string {
  return renderToStaticMarkup(React.createElement(AppDescriptionMarkdown, { text }));
}

describe("AppDescriptionMarkdown", () => {
  it("renders markdown blocks and safe external links", () => {
    // Note: the heading must start its own line for CommonMark to parse it as
    // an ATX heading (the brief's one-line variant renders "# Heading" as text).
    const html = render("**bold**\n\n# Heading\n\n- عنصر\n- آخر\n\n[حلقة](https://x.example)");

    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain('<a href="https://x.example"');
    // Link must open in a new tab with a safe rel.
    const linkMatch = html.match(/<a [^>]*href="https:\/\/x\.example"[^>]*>/);
    expect(linkMatch, "anchor tag for external link").toBeTruthy();
    expect(linkMatch![0]).toContain('target="_blank"');
    const rel = linkMatch![0].match(/rel="([^"]*)"/);
    expect(rel, "rel attribute on external link").toBeTruthy();
    expect(rel![1]).toContain("noopener");
  });

  it("does not emit javascript: hrefs", () => {
    const html = render("[x](javascript:alert(1))");
    expect(html).not.toContain('href="javascript:');
  });

  it("does not emit literal <script> elements", () => {
    const html = render("plain <script>alert(1)</script> text");
    expect(html).not.toContain("<script");
  });

  it("does not throw on garbage input", () => {
    expect(() => render("*[broken](")).not.toThrow();
  });

  it("uses logical properties for list indentation (RTL support)", () => {
    // The CSS that styles .app-md must indent lists with a logical property so
    // Arabic (RTL) content indents on the right automatically.
    const cssPath = path.resolve(__dirname, "../src/components/apps/app-detail.css");
    const css = fs.readFileSync(cssPath, "utf8");
    // Find the .app-md ul/ol rule specifically.
    const listRule = css.match(/\.app-md\s+ul[^{]*\{[^}]*\}/);
    expect(listRule, ".app-md ul/ol rule in app-detail.css").toBeTruthy();
    expect(listRule![0]).toContain("padding-inline-start");
    // Tailwind v4 preflight strips list markers (list-style: none), so the
    // rule must restore them or lists render as marker-less indented lines.
    expect(listRule![0]).toContain("list-style: revert");
    // The wrapper rule should exist too.
    expect(css.match(/\.app-md\s*\{/), ".app-md wrapper rule in app-detail.css").toBeTruthy();
  });

  it("preserves legacy single-newline text as hard breaks", () => {
    // A single \n becomes a hard break; the blank line stays a paragraph break.
    const html = render("صف\nأول\n\nثاني");
    expect(html).toContain("<br");
    expect(html).toContain("صف");
    expect(html).toContain("أول");
    expect(html).toContain("ثاني");
  });

  it("leaves legacy text with no newlines unchanged", () => {
    const html = render("نص بسيط بدون أسطر جديدة");
    expect(html).not.toContain("<br");
    expect(html).toContain("نص بسيط بدون أسطر جديدة");
  });

  it("renders markdown-marked text verbatim (list, no hard breaks)", () => {
    const html = render("قائمة:\n- عنصر 1\n- عنصر 2");
    expect(html).toContain("<ul>");
    const lis = html.match(/<li>/g) ?? [];
    expect(lis).toHaveLength(2);
    expect(html).not.toContain("<br");
  });
});

describe("legacyToHardBreaks", () => {
  it("converts single newlines to hard breaks, keeps paragraph breaks", () => {
    expect(legacyToHardBreaks("صف\nأول\n\nثاني")).toBe("صف  \nأول\n\nثاني");
  });

  it("is a no-op when there are no newlines", () => {
    expect(legacyToHardBreaks("بسيط")).toBe("بسيط");
  });

  it("preserves multi-blank-line paragraph breaks", () => {
    expect(legacyToHardBreaks("a\n\n\nb")).toBe("a\n\n\nb");
  });
});

describe("looksLikeMarkdown", () => {
  it("returns false for plain legacy text", () => {
    expect(looksLikeMarkdown("صف\nأول\n\nثاني")).toBe(false);
  });

  it("returns true for markdown-marked text", () => {
    expect(looksLikeMarkdown("قائمة:\n- عنصر 1\n- عنصر 2")).toBe(true);
  });

  it.each([
    ["# عنوان", "heading"],
    ["1. أول", "ordered list"],
    ["> اقتباس", "blockquote"],
    ["```\ncode\n```", "fenced code"],
    ["a | b", "table pipe"],
    ["[رابط](https://x.example)", "link"],
  ])("detects %s", (text) => {
    expect(looksLikeMarkdown(text)).toBe(true);
  });
});
