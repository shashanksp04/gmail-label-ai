import { describe, expect, it } from 'vitest';
import { createAccount, emptyState } from '../src/storage/schema';

describe('account storage schema', () => {
  it('creates isolated empty account contexts', () => {
    const first = createAccount('one@example.com', 'one@example.com');
    const second = createAccount('two@example.com', 'two@example.com');
    first.senderMappings['example.com'] = 'label-one';
    expect(second.senderMappings).toEqual({});
    expect(emptyState()).toEqual({ schemaVersion: 2, activeAccountId: null, accounts: {} });
  });
});
