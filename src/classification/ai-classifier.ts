import type { ClassificationResult, EmailMetadata, GmailLabel } from '../domain';

export interface AIClient { selectLabel(email: EmailMetadata, labels: GmailLabel[]): Promise<string | null>; }

export class Classifier {
  constructor(private readonly ai: AIClient) {}

  async classify(email: EmailMetadata, labels: GmailLabel[], mappings: Record<string, string>): Promise<ClassificationResult> {
    const { deterministicClassify } = await import('./deterministic-classifier');
    const deterministic = deterministicClassify(email, labels, mappings);
    if (deterministic.decision === 'label') return deterministic;
    const id = await this.ai.selectLabel(email, labels);
    const match = id && labels.find((label) => label.id === id);
    return match ? { decision: 'label', labelId: match.id, confidence: null, source: 'ai', reason: 'Selected by Chrome built-in AI after deterministic classification was inconclusive' } : deterministic;
  }
}
