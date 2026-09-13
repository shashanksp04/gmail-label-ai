export function normalizeText(text: string | undefined | null): string {
  return typeof text === 'string' ? text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim() : '';
}

export function extractDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at > 0 ? email.slice(at + 1).toLowerCase() : '';
}

export function senderNameFromDomain(email: string): string {
  return extractDomain(email).split('.')[0] ?? '';
}

export function containsLabel(text: string, label: string, minimumLength = 5): boolean {
  const normalizedLabel = normalizeText(label);
  return normalizedLabel.length >= minimumLength && normalizeText(text).includes(normalizedLabel);
}

export function wordOverlapSimilarity(first: string, second: string): number {
  const a = new Set(normalizeText(first).split(/\s+/).filter(Boolean));
  const b = new Set(normalizeText(second).split(/\s+/).filter(Boolean));
  if (!a.size || !b.size) return 0;
  let matches = 0;
  for (const word of a) if (b.has(word)) matches++;
  return matches / Math.min(a.size, b.size);
}

export function id(): string {
  return crypto.randomUUID();
}
