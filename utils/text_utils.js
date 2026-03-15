/**
 * LabelPilot - Text normalization and similarity utilities
 */

/**
 * Normalize text for matching: remove punctuation, lowercase, collapse whitespace
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract domain from email address
 * @param {string} email
 * @returns {string}
 */
function extractDomain(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

/**
 * Extract sender name from email (e.g., "newsletter@alphasignal.ai" -> "alphasignal")
 * @param {string} email
 * @returns {string}
 */
function extractSenderNameFromDomain(email) {
  const domain = extractDomain(email);
  if (!domain) return '';
  // Remove TLD (e.g., .com, .ai)
  const namePart = domain.split('.')[0] || '';
  // Convert to title case for matching (e.g., alphasignal -> AlphaSignal)
  return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
}

/**
 * Check if text contains label (exact or normalized)
 * Skips very short label fragments to avoid false matches (e.g. "Intern" in newsletter)
 * @param {string} text
 * @param {string} labelName
 * @param {number} minLabelLength - minimum label length to match (default from CONFIG)
 * @returns {boolean}
 */
function textContainsLabel(text, labelName, minLabelLength) {
  if (!text || !labelName) return false;
  const normalizedText = normalizeText(text);
  const normalizedLabel = normalizeText(labelName);
  if (normalizedLabel.length === 0) return false;
  const minLen = minLabelLength ?? (typeof CONFIG !== 'undefined' ? CONFIG.MIN_LABEL_MATCH_LENGTH : 4);
  if (normalizedLabel.length < minLen) return false;
  return normalizedText.includes(normalizedLabel);
}

/**
 * Simple word overlap similarity (0-1)
 * @param {string} text1
 * @param {string} text2
 * @returns {number}
 */
function wordOverlapSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const words1 = new Set(normalizeText(text1).split(/\s+/).filter(Boolean));
  const words2 = new Set(normalizeText(text2).split(/\s+/).filter(Boolean));
  if (words1.size === 0 || words2.size === 0) return 0;
  let matches = 0;
  for (const w of words1) {
    if (words2.has(w)) matches++;
  }
  return matches / Math.min(words1.size, words2.size);
}
