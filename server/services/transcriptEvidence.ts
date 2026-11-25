/**
 * Match formatting-equivalent quotes, never approximate wording. In particular,
 * negations, numbers, units, speaker text and omitted words are not removed.
 * Successful matches return the exact original source, not model-written text.
 */
function normalizedCharacters(char: string): string {
  if (/\s/.test(char)) return " ";
  if (/[\u2018\u2019]/.test(char)) return "'";
  if (/[\u201c\u201d]/.test(char)) return '"';
  if (/[\u2010\u2011\u2012\u2013\u2014]/.test(char)) return "-";
  return char;
}

function indexedText(text: string) {
  let normalized = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;
  for (const char of Array.from(text)) {
    const value = normalizedCharacters(char);
    const end = index + char.length;
    if (value === " " && normalized.endsWith(" ")) {
      ends[ends.length - 1] = end;
    } else {
      normalized += value;
      for (let offset = 0; offset < value.length; offset++) {
        starts.push(index);
        ends.push(end);
      }
    }
    index = end;
  }
  return { normalized, starts, ends };
}

export function transcriptQuoteMatcher(source: string): (quote: string) => string | null {
  let indexed: ReturnType<typeof indexedText> | undefined;
  const cache = new Map<string, string | null>();
  return (quote) => {
    if (!quote.trim()) return null;
    if (cache.has(quote)) return cache.get(quote)!;
    if (source.includes(quote)) {
      cache.set(quote, quote);
      return quote;
    }
    indexed ??= indexedText(source);
    const needle = indexedText(quote).normalized.trim();
    const position = indexed.normalized.indexOf(needle);
    const match = position < 0 ? null : source.slice(indexed.starts[position], indexed.ends[position + needle.length - 1]);
    cache.set(quote, match);
    return match;
  };
}
