import { describe, expect, it } from 'vitest';
import { parseFromHeader, parseMessageMetadata, parseLabels } from '../src/gmail/gmail-parser';

describe('Gmail parser', () => {
  it('parses display names and addresses', () => {
    expect(parseFromHeader('"AlphaSignal" <news@alphasignal.ai>')).toEqual({ name: 'AlphaSignal', email: 'news@alphasignal.ai' });
  });

  it('filters system labels and parses metadata', () => {
    expect(parseLabels({ labels: [{ id: 'INBOX', name: 'Inbox' }, { id: 'L1', name: 'Work' }] })).toHaveLength(1);
    expect(parseMessageMetadata({ id: 'm1', threadId: 't1', snippet: 'hi', labelIds: ['INBOX'], payload: { headers: [{ name: 'Subject', value: 'Hello' }, { name: 'From', value: 'a@example.com' }] } })).toMatchObject({ id: 'm1', subject: 'Hello', fromEmail: 'a@example.com' });
  });
});
