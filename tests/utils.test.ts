import { describe, expect, it } from 'vitest';
import { containsLabel, extractDomain, wordOverlapSimilarity } from '../src/utils';

describe('text utilities', () => {
  it('normalizes and extracts sender domains', () => {
    expect(extractDomain('User@Example.COM')).toBe('example.com');
    expect(containsLabel('Your Alpha-Signal report', 'Alpha-Signal')).toBe(true);
  });

  it('calculates bounded word overlap', () => {
    expect(wordOverlapSimilarity('weekly finance report', 'finance report')).toBe(1);
    expect(wordOverlapSimilarity('', 'finance')).toBe(0);
  });
});
