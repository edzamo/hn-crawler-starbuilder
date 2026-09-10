import { HackerNewsEntry } from '../../src/domain/entities/HackerNewsEntry';
import {
  filterLongTitlesByComments,
  filterShortTitlesByPoints,
} from '../../src/application/use-cases/FilterEntries.usecase';

function entry(overrides: Partial<HackerNewsEntry>): HackerNewsEntry {
  return {
    rank: 1,
    title: 'Short title',
    points: 0,
    commentCount: 0,
    ...overrides,
  };
}

describe('filterLongTitlesByComments', () => {
  it('keeps only titles with more than five words', () => {
    const entries = [
      entry({ rank: 1, title: 'One two three four five', commentCount: 100 }),
      entry({ rank: 2, title: 'One two three four five six', commentCount: 50 }),
    ];

    const result = filterLongTitlesByComments(entries);

    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(2);
  });

  it('orders results by comment count descending', () => {
    const entries = [
      entry({ rank: 1, title: 'This title has exactly seven words', commentCount: 10 }),
      entry({ rank: 2, title: 'This other title also has seven words', commentCount: 90 }),
      entry({ rank: 3, title: 'Yet another title with seven words here', commentCount: 40 }),
    ];

    const result = filterLongTitlesByComments(entries);

    expect(result.map((e) => e.rank)).toEqual([2, 3, 1]);
  });

  it('does not mutate the input array', () => {
    const entries = [
      entry({ rank: 1, title: 'This title has exactly seven words', commentCount: 1 }),
      entry({ rank: 2, title: 'This other title also has seven words', commentCount: 2 }),
    ];
    const copy = [...entries];

    filterLongTitlesByComments(entries);

    expect(entries).toEqual(copy);
  });
});

describe('filterShortTitlesByPoints', () => {
  it('keeps only titles with five words or fewer', () => {
    const entries = [
      entry({ rank: 1, title: 'One two three four five', points: 20 }),
      entry({ rank: 2, title: 'One two three four five six', points: 999 }),
    ];

    const result = filterShortTitlesByPoints(entries);

    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
  });

  it('orders results by points descending', () => {
    const entries = [
      entry({ rank: 1, title: 'Four word title here', points: 30 }),
      entry({ rank: 2, title: 'Another short title', points: 300 }),
      entry({ rank: 3, title: 'A title', points: 150 }),
    ];

    const result = filterShortTitlesByPoints(entries);

    expect(result.map((e) => e.rank)).toEqual([2, 3, 1]);
  });
});
