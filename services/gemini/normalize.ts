type JsonBlock = {
  start: number;
  end: number;
  html?: string;
};

const findMatchingBrace = (text: string, startIndex: number): number => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
  }

  return -1;
};

const extractJsonBlocks = (text: string): JsonBlock[] => {
  const blocks: JsonBlock[] = [];
  const seenStarts = new Set<number>();
  const markerRegex = /"html"\s*:|"section_name"\s*:/g;

  let match: RegExpExecArray | null;
  while ((match = markerRegex.exec(text))) {
    const start = text.lastIndexOf('{', match.index);
    if (start === -1 || seenStarts.has(start)) {
      continue;
    }

    const end = findMatchingBrace(text, start);
    if (end === -1) {
      continue;
    }

    const raw = text.slice(start, end);
    try {
      const parsed = JSON.parse(raw) as { html?: string };
      blocks.push({
        start,
        end,
        html: typeof parsed.html === 'string' ? parsed.html : undefined,
      });
      seenStarts.add(start);
      markerRegex.lastIndex = end;
    } catch {
      // Ignore invalid JSON blocks
    }
  }

  if (blocks.length === 0 && /^\s*json\s*$/m.test(text)) {
    const jsonLineRegex = /^\s*json\s*$/gm;
    let jsonMatch: RegExpExecArray | null;
    while ((jsonMatch = jsonLineRegex.exec(text))) {
      const afterMarker = text.indexOf('{', jsonMatch.index);
      if (afterMarker === -1) {
        continue;
      }
      const end = findMatchingBrace(text, afterMarker);
      if (end === -1 || seenStarts.has(afterMarker)) {
        continue;
      }
      const raw = text.slice(afterMarker, end);
      try {
        const parsed = JSON.parse(raw) as { html?: string };
        blocks.push({
          start: afterMarker,
          end,
          html: typeof parsed.html === 'string' ? parsed.html : undefined,
        });
        seenStarts.add(afterMarker);
      } catch {
        // Ignore invalid JSON blocks
      }
    }
  }

  return blocks.sort((a, b) => a.start - b.start);
};

export const normalizeHtmlResponse = (raw: string): string => {
  let code = raw.replace(/```html/g, '').replace(/```/g, '').trim();
  if (!code) return code;

  if (!/"html"\s*:|"section_name"\s*:|\bjson\b/.test(code)) {
    return code;
  }

  const blocks = extractJsonBlocks(code);
  if (blocks.length === 0) {
    return code.replace(/^\s*json\s*$/gm, '').trim();
  }

  let output = '';
  let cursor = 0;

  for (const block of blocks) {
    let start = block.start;
    const lineStart = code.lastIndexOf('\n', start - 1) + 1;
    const lineText = code.slice(lineStart, start).trim();
    if (lineText === 'json') {
      start = lineStart;
    }

    output += code.slice(cursor, start);
    if (block.html) {
      output += block.html;
    }
    cursor = block.end;
  }

  output += code.slice(cursor);

  return output.replace(/^\s*json\s*$/gm, '').trim();
};
