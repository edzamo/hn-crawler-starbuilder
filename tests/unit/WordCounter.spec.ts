import { countWords } from '../../src/domain/service/WordCounter';

describe('countWords', () => {
  it('counts the example from the spec as 5 words', () => {
    expect(countWords('This is - a self-explained example')).toBe(5);
  });

  it('counts simple space-separated titles', () => {
    expect(countWords('Show HN: a small tool')).toBe(5);
  });

  it('treats a hyphenated compound word as a single word', () => {
    expect(countWords('State-of-the-art model released')).toBe(3);
  });

  it('ignores standalone punctuation tokens', () => {
    expect(countWords('A - B -- C')).toBe(3);
  });

  it('collapses repeated whitespace', () => {
    expect(countWords('Too   many    spaces here')).toBe(4);
  });

  it('returns 0 for an empty or whitespace-only title', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });

  it('counts a single word title as 1', () => {
    expect(countWords('Kubernetes')).toBe(1);
  });
});
