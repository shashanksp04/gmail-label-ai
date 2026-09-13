import { CONFIG } from '../config';
import type { EmailMetadata, GmailLabel } from '../domain';
import { normalizeText } from '../utils';

interface RawHeader { name?: string; value?: string }
interface RawMessage { id?: string; threadId?: string; snippet?: string; labelIds?: string[]; payload?: { headers?: RawHeader[] } }
interface RawLabel { id?: string; name?: string }

export function parseFromHeader(value: string): { name: string; email: string } {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  return match ? { name: match[1]!.trim().replace(/^['"]|['"]$/g, ''), email: match[2]!.trim() } : { name: '', email: value.trim() };
}

export function parseMessageMetadata(input: unknown): EmailMetadata | null {
  const message = input as RawMessage;
  if (!message?.id) return null;
  const headers = Array.isArray(message.payload?.headers) ? message.payload.headers : [];
  const header = (name: string) => headers.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
  const sender = parseFromHeader(header('From'));
  return { id: message.id, threadId: message.threadId ?? '', subject: header('Subject'), from: sender.name || sender.email, fromEmail: sender.email, snippet: message.snippet ?? '', labelIds: message.labelIds ?? [] };
}

export function parseLabels(input: unknown): GmailLabel[] {
  const response = input as { labels?: RawLabel[] } | null | undefined;
  return (response?.labels ?? []).filter((label) => label.id && !CONFIG.systemLabels.has(label.id)).map((label) => ({ id: label.id!, name: label.name ?? '', normalizedName: normalizeText(label.name ?? '') }));
}
