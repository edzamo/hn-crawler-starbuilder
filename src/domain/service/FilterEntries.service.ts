import { HackerNewsEntry } from '../model/HackerNewsEntry';
import { countWords } from './WordCounter';

const LONG_TITLE_THRESHOLD = 5;

/**
 * Entries whose title has more than five words, ordered by comment
 * count descending (most discussed first).
 */
export function filterLongTitlesByComments(
  entries: readonly HackerNewsEntry[],
): HackerNewsEntry[] {
  return entries
    .filter((entry) => countWords(entry.title) > LONG_TITLE_THRESHOLD)
    .sort((a, b) => b.commentCount - a.commentCount);
}

/**
 * Entries whose title has five words or fewer, ordered by points
 * descending (highest scored first).
 */
export function filterShortTitlesByPoints(
  entries: readonly HackerNewsEntry[],
): HackerNewsEntry[] {
  return entries
    .filter((entry) => countWords(entry.title) <= LONG_TITLE_THRESHOLD)
    .sort((a, b) => b.points - a.points);
}
