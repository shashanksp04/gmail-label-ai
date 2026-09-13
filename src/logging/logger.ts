import { AccountStore } from '../storage/account-store';
import type { ActivityEvent } from '../domain';
import { id } from '../utils';

export class Logger {
  constructor(private readonly store: AccountStore) {}

  async write(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<void> {
    const sanitized = event.metadata ? Object.fromEntries(Object.entries(event.metadata).filter(([key]) => !/token|body|snippet|content/i.test(key))) : undefined;
    const record: ActivityEvent = { ...event, ...(sanitized ? { metadata: sanitized } : {}), id: id(), timestamp: new Date().toISOString() };
    console[event.level === 'error' ? 'error' : event.level === 'warn' ? 'warn' : 'log']('[LabelPilot]', record);
    await this.store.addActivity(record);
  }
}
