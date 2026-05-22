import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./markdown";

describe("markdownToHtml", () => {
  it("returns empty html for empty or whitespace-only markdown", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml(" \n\t\n")).toBe("");
  });

  it("renders h1, h2, and h3 headings", () => {
    expect(markdownToHtml("# Titolo\n## Sezione\n### Dettaglio")).toBe(
      "<h1>Titolo</h1><h2>Sezione</h2><h3>Dettaglio</h3>"
    );
  });

  it("documents that headings without a space are plain paragraphs", () => {
    expect(markdownToHtml("#Titolo")).toBe("<p>#Titolo</p>");
  });

  it("merges paragraph lines until the next block starts", () => {
    expect(markdownToHtml("Una riga\ncontinua qui\n\nNuovo paragrafo")).toBe(
      "<p>Una riga continua qui</p><p>Nuovo paragrafo</p>"
    );
  });

  it("separates headings that appear after punctuation in the same paragraph", () => {
    expect(markdownToHtml("Intro. ## Sezione")).toBe(
      "<p>Intro.</p><h2>Sezione</h2>"
    );
  });

  it("renders unordered and ordered lists", () => {
    expect(markdownToHtml("- Uno\n- **Due**\n\n1. Primo\n2. Secondo")).toBe(
      "<ul><li>Uno</li><li><strong>Due</strong></li></ul><ol><li>Primo</li><li>Secondo</li></ol>"
    );
  });

  it("documents that nested lists are not parsed as nested list structures", () => {
    expect(markdownToHtml("- Padre\n  - Figlio")).toBe(
      "<ul><li>Padre</li></ul><p>  - Figlio</p>"
    );
  });

  it("renders markdown tables with inline formatting inside cells", () => {
    expect(
      markdownToHtml("| Nome | Score |\n| --- | --- |\n| Idea | **10** |")
    ).toBe(
      "<table><thead><tr><th>Nome</th><th>Score</th></tr></thead><tbody><tr><td>Idea</td><td><strong>10</strong></td></tr></tbody></table>"
    );
  });

  it("renders fenced code blocks and escapes their contents", () => {
    expect(markdownToHtml("```ts\nconst tag = \"<script>\";\n```")).toBe(
      '<pre><code class="language-ts">const tag = &quot;&lt;script&gt;&quot;;\n</code></pre>'
    );
  });

  it("renders fenced code blocks without language classes when language is missing", () => {
    expect(markdownToHtml("```\nplain\n```")).toBe(
      "<pre><code>plain\n</code></pre>"
    );
  });

  it("renders blockquotes across contiguous quote lines", () => {
    expect(markdownToHtml("> Uno\n> Due")).toBe(
      "<blockquote>Uno Due</blockquote>"
    );
  });

  it("renders horizontal rules", () => {
    expect(markdownToHtml("Prima\n---\nDopo")).toBe(
      "<p>Prima</p><hr /><p>Dopo</p>"
    );
  });

  it("renders inline emphasis, code, strikethrough, links, and images", () => {
    expect(
      markdownToHtml(
        "**bold** _italic_ `code` ~~old~~ [link](https://example.com?a=1&b=2) ![logo](/logo.png)"
      )
    ).toBe(
      '<p><strong>bold</strong> <em>italic</em> <code>code</code> <del>old</del> <a href="https://example.com?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">link</a> <img src="/logo.png" alt="logo" /></p>'
    );
  });

  it("escapes raw HTML because the output is rendered with dangerouslySetInnerHTML", () => {
    expect(markdownToHtml('<script>alert("x")</script>')).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>"
    );
  });

  it("sanitizes dangerous link and image protocols", () => {
    expect(
      markdownToHtml(
        "[bad](javascript:alert) ![bad](data:text/html;base64,PHNjcmlwdA)"
      )
    ).toBe(
      '<p><a href="#" target="_blank" rel="noopener noreferrer">bad</a> <img src="#" alt="bad" /></p>'
    );
  });
});
