import { CONFIG } from '../config';
import type { EmailMetadata, GmailLabel, ClassificationResult } from '../domain';
import { containsLabel, extractDomain, senderNameFromDomain, wordOverlapSimilarity } from '../utils';

export function scoreLabel(email: EmailMetadata, label: GmailLabel, mappings: Record<string, string>, threadLabelId?: string | null): number {
  const domain = extractDomain(email.fromEmail);
  let score = mappings[domain] === label.id ? CONFIG.scores.mapping : 0;
  if (threadLabelId === label.id) score += CONFIG.scores.thread;
  if (containsLabel(email.subject, label.name, CONFIG.minLabelMatchLength)) score += CONFIG.scores.subject;
  if (containsLabel(email.from, label.name, CONFIG.minLabelMatchLength) || containsLabel(senderNameFromDomain(email.fromEmail), label.name, CONFIG.minLabelMatchLength)) score += CONFIG.scores.sender;
  if (containsLabel(label.name, senderNameFromDomain(email.fromEmail), CONFIG.minLabelMatchLength) || containsLabel(label.name, domain, CONFIG.minLabelMatchLength)) score += CONFIG.scores.domain;
  const similarity = wordOverlapSimilarity(email.snippet, label.name);
  if (similarity > 0.3) score += Math.round(CONFIG.scores.snippet * similarity);
  return score;
}

export function deterministicClassify(email: EmailMetadata, labels: GmailLabel[], mappings: Record<string, string>, threadLabelId?: string | null): ClassificationResult {
  const ranked = labels.map((label) => ({ label, score: scoreLabel(email, label, mappings, threadLabelId) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.score < CONFIG.minConfidenceThreshold) return { decision: 'skip', labelId: null, confidence: top?.score ?? 0, source: 'none', reason: 'No deterministic candidate met the confidence threshold' };
  if (second && top.score === second.score) return { decision: 'skip', labelId: null, confidence: top.score, source: 'none', reason: 'Top candidates were tied' };
  return { decision: 'label', labelId: top.label.id, confidence: top.score, source: 'deterministic', reason: `Matched with score ${top.score}` };
}
