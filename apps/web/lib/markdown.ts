function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    .replace(/&lt;br\s*\/?&gt;/gi, "<br/>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

/** Minimal, safe-ish markdown -> HTML: escapes first, then supports headers (**Title**
 * on its own line), bullet/numbered lists, pipe tables, and paragraphs. Good enough for
 * the structured AI briefs this app generates — not a general-purpose parser. */
export function renderMarkdown(source: string): string {
  const escaped = escapeHtml(source);
  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let i = 0;
  let inList: "ul" | "ol" | null = null;

  const closeList = () => {
    if (inList) {
      html.push(`</${inList}>`);
      inList = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      closeList();
      i++;
      continue;
    }

    if (/^\|(.+)\|$/.test(trimmed)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|(.+)\|$/.test(lines[i].trim())) {
        rows.push(
          lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim())
        );
        i++;
      }
      const dataRows = rows.filter((r) => !r.every((c) => /^:?-+:?$/.test(c)));
      const [head, ...body] = dataRows;
      closeList();
      html.push('<table class="ghg-md-table">');
      if (head) html.push("<thead><tr>" + head.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead>");
      html.push("<tbody>" + body.map((r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>").join("") + "</tbody>");
      html.push("</table>");
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (bullet) {
      if (inList !== "ul") {
        closeList();
        html.push("<ul>");
        inList = "ul";
      }
      html.push(`<li>${inline(bullet[1])}</li>`);
      i++;
      continue;
    }
    if (numbered) {
      if (inList !== "ol") {
        closeList();
        html.push("<ol>");
        inList = "ol";
      }
      html.push(`<li>${inline(numbered[1])}</li>`);
      i++;
      continue;
    }

    closeList();
    const headerMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headerMatch) {
      html.push(`<h4>${inline(headerMatch[1])}</h4>`);
    } else {
      html.push(`<p>${inline(trimmed)}</p>`);
    }
    i++;
  }
  closeList();
  return html.join("\n");
}
