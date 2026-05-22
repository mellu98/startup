export function formatContextSnapshot(
  snapshot: Record<string, unknown> | null
): string {
  if (!snapshot) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === null || value === undefined) continue;
    const formatted = formatSnapshotValue(value);
    parts.push(`${key}: ${formatted}`);
  }
  return parts.join(", ");
}

function formatSnapshotValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatSnapshotValue).join(", ");
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function stripThinkTags(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export type StreamThinkFilter = ((chunk: string) => string) & {
  flush: () => string;
};

export function createStreamThinkFilter(): StreamThinkFilter {
  let buffer = "";
  let inThink = false;

  const filter = ((chunk: string): string => {
    buffer += chunk;
    let output = "";
    let i = 0;

    while (i < buffer.length) {
      if (inThink) {
        const closeIdx = buffer.indexOf("</think>", i);
        if (closeIdx !== -1) {
          inThink = false;
          i = closeIdx + 8;
        } else {
          buffer = buffer.slice(i);
          return output;
        }
      } else {
        const openIdx = buffer.indexOf("<think>", i);
        if (openIdx !== -1) {
          output += buffer.slice(i, openIdx);
          inThink = true;
          i = openIdx + 7;
        } else {
          const maxPrefixLen = 7;
          if (buffer.length - i > maxPrefixLen) {
            output += buffer.slice(i, buffer.length - maxPrefixLen);
            i = buffer.length - maxPrefixLen;
          }
          buffer = buffer.slice(i);
          return output;
        }
      }
    }

    buffer = "";
    return output;
  }) as StreamThinkFilter;

  filter.flush = (): string => {
    const output = inThink ? "" : buffer;
    buffer = "";
    inThink = false;
    return output;
  };

  return filter;
}

/**
 * DeepSeek occasionally emits invalid UTF-8 byte sequences that get
 * converted to the Unicode replacement character (U+FFFD / �).
 * This strips those artefacts and normalises whitespace so the text
 * remains readable even when a few glyphs are lost.
 */
export function sanitizeMojibake(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\uFFFD/g, "")
    .replace(/\u00EF\u00BF\u00BD/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
