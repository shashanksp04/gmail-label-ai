import { describe, expect, it } from 'vitest';
import { deterministicClassify } from '../src/classification/deterministic-classifier';
import type { EmailMetadata, GmailLabel } from '../src/domain';

const email: EmailMetadata = { id: 'm1', threadId: 't1', subject: 'AlphaSignal weekly report', from: 'AlphaSignal', fromEmail: 'news@alphasignal.ai', snippet: 'Your weekly report', labelIds: ['INBOX'] };
const labels: GmailLabel[] = [{ id: 'label-alpha', name: 'AlphaSignal', normalizedName: 'alphasignal' }, { id: 'label-work', name: 'Work', normalizedName: 'work' }];

describe('deterministic classification', () => {
  it('selects a strong existing label', () => {
    const result = deterministicClassify(email, labels, {});
    expect(result.decision).toBe('label');
    expect(result.labelId).toBe('label-alpha');
    expect(result.source).toBe('deterministic');
  });

  it('skips when there is no confident candidate', () => {
    const result = deterministicClassify({ ...email, subject: 'Hello', from: 'Unknown', fromEmail: 'x@example.com', snippet: '' }, labels, {});
    expect(result.decision).toBe('skip');
    expect(result.labelId).toBeNull();
  });
});
