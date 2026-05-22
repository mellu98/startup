function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&");
}

function sanitizeUrl(value: string): string {
  const decoded = decodeBasicEntities(value).trim();
  const compact = decoded
    .replace(/[\u0000-\u001F\u007F\s]+/g, "")
    .toLowerCase();
  if (/^(javascript|vbscript|data):/.test(compact)) {
    return "#";
  }
  return escapeHtml(decoded);
}

function renderInline(text: string): string {
  let html = escapeHtml(text);
  // images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_match, alt: string, src: string) =>
      `<img src="${sanitizeUrl(src)}" alt="${escapeHtml(decodeBasicEntities(alt))}" />`
  );
  // links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, href: string) =>
      `<a href="${sanitizeUrl(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
  // bold + italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
  // italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");
  // strikethrough
  html = html.replace(/~~(.*?)~~/g, "<del>$1</del>");
  // inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function isBlockStart(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^```/.test(line) ||
    /^\|/.test(line) ||
    /^[-*+] /.test(line) ||
    /^\d+\. /.test(line) ||
    /^#{1,3} /.test(line) ||
    /^(---+|\*\*\*+|___+)$/.test(trimmed) ||
    /^> /.test(line)
  );
}

function renderTable(lines: string[]): string {
  if (lines.length < 2) return "";
  const headerCells = lines[0]
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
  let html = "<table><thead><tr>";
  headerCells.forEach((cell) => {
    html += `<th>${renderInline(cell)}</th>`;
  });
  html += "</tr></thead><tbody>";
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    html += "<tr>";
    cells.forEach((cell) => {
      html += `<td>${renderInline(cell)}</td>`;
    });
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

function preprocessMarkdown(md: string): string {
  return (
    md
      // Separa HR quando è attaccato a testo (es. "foo --- bar" → "foo\n---\nbar")
      .replace(/([^|\s])\s*---+(?=\s*[^|\s])/g, "$1\n---")
      .replace(/---\s*(?=[^|\s])/g, "---\n")
      // Separa heading inline dopo punteggiatura o testo
      .replace(/([.!?:])\s*(#{1,3}\s)/g, "$1\n$2")
      // Rimuovi newline multipli
      .replace(/\n{3,}/g, "\n\n")
  );
}

export function markdownToHtml(md: string): string {
  const raw = preprocessMarkdown(md);
  const lines = raw.split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      i++;
      let code = "";
      while (i < lines.length && !lines[i].startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      const safeLang = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      html += `<pre><code${safeLang}>${escapeHtml(code)}</code></pre>`;
      i++;
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      html += renderTable(tableLines);
      continue;
    }

    // Unordered list
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      html +=
        "<ul>" +
        items.map((item) => `<li>${renderInline(item)}</li>`).join("") +
        "</ul>";
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      html +=
        "<ol>" +
        items.map((item) => `<li>${renderInline(item)}</li>`).join("") +
        "</ol>";
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      html += `<h3>${renderInline(line.slice(4))}</h3>`;
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      html += `<h2>${renderInline(line.slice(3))}</h2>`;
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      html += `<h1>${renderInline(line.slice(2))}</h1>`;
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---+|\*\*\*+|___+)$/.test(line.trim())) {
      html += "<hr />";
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      let quote = "";
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote += lines[i].slice(2) + " ";
        i++;
      }
      html += `<blockquote>${renderInline(quote.trim())}</blockquote>`;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    let para = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isBlockStart(lines[i])
    ) {
      para += " " + lines[i];
      i++;
    }
    html += `<p>${renderInline(para)}</p>`;
  }

  return html;
}
