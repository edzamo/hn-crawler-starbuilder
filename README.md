# HN Crawler

A small Hacker News crawler that scrapes the top 30 front-page entries
(rank, title, points, comment count) and supports two filtering
operations, with every request logged for usage analysis.

## Requirements

- Node.js >= 18

## Setup

```bash
npm install
```

## Usage

```bash
# Build once, then run the compiled CLI
npm run build
npm start                        # top 30, no filter
npm start -- --filter=long-titles   # >5-word titles, ordered by comments desc
npm start -- --filter=short-titles  # <=5-word titles, ordered by points desc

# or run directly against source with ts-node
npm run dev -- --filter=long-titles
```

Each run prints the applied filter, the result count, and one line
per entry (`rank`, `points`, `comment count`, `word count`, `title`).
A `data/usage.sqlite` file is created (gitignored) recording one row
per request.

## Tests

```bash
npm test
```

22 tests cover the word counter, the two filters, the crawler
(against a captured real HN page fixture, plus an edge case for
stories with no comments yet), the usage repository, and the
orchestrating use case (including the crawler-failure path).

## Design decisions

**Architecture.** The code is organized in three layers, loosely
following ports & adapters:

- `src/domain` — pure business rules with no I/O: the `HackerNewsEntry`
  shape, the `countWords` rule, and the two ports (`HackerNewsCrawlerPort`,
  `UsageRepositoryPort`) that the application layer depends on as
  interfaces rather than concrete implementations.
- `src/application` — use cases: the two filters
  (`filterLongTitlesByComments`, `filterShortTitlesByPoints`) as pure
  functions, and `CrawlAndFilterUseCase`, which orchestrates a crawl,
  applies a filter, and always records usage — including when the
  crawl fails, so crawler errors show up in the usage data instead of
  disappearing silently.
- `src/infrastructure` — the concrete adapters: `CheerioHackerNewsCrawler`
  (axios + cheerio) and `SqliteUsageRepository` (better-sqlite3).

This separation is what makes the use case and filter tests run
without any network or filesystem access — they're given fakes for
the two ports — while the crawler and repository are still tested
against something close to reality (a real captured HTML page, a real
temp SQLite file).

**Word counting.** "Words" are whitespace-separated tokens that
contain at least one letter or digit. A hyphenated compound like
`self-explained` is one token (no internal space), so it counts as
one word; a bare `-` or `--` between words has no alphanumeric
character, so it's dropped. This matches the example in the exercise
(`"This is - a self-explained example"` → 5 words) without needing a
hand-rolled punctuation stripping list, and it's Unicode-aware
(`\p{L}`/`\p{N}`) rather than ASCII-only.

**Crawler.** HN's classic front end renders each story as a
`tr.athing` row (rank, title, link) immediately followed by a sibling
`tr` holding the subtext (points, age, comment count) — the two rows
have no shared container, so the crawler explicitly pairs each
`tr.athing` with `.next('tr')` rather than relying on two independent
selectors that could drift out of sync. Fetching more than 30 entries
walks HN's `?p=N` pagination sequentially. A "discuss" link (a story
with no comments yet) is treated as 0 comments rather than causing a
parse error.

**Storage.** Usage tracking uses SQLite (via `better-sqlite3`)
instead of an external database or cache so the exercise runs with
zero infrastructure setup (`npm start` just works) while still using
a real schema and real SQL, migrated automatically on first run. Each
row records the request timestamp, the filter applied, how many
entries were crawled vs. returned after filtering, the request
duration, and the source (`cli` — the only caller today, kept as a
field since the same use case could be driven by an API later without
changing the schema).

**Filtering semantics.** Filtering and sorting are two different pure
functions rather than one function with a sort-direction flag,
because the two operations in the exercise aren't structurally
parallel (one filters on title length and sorts by comments, the
other filters on the same predicate's complement and sorts by
points) — a shared abstraction would need a branch per call anyway,
so two small named functions read more clearly than one parameterized
one.

**What was left out on purpose.** No HTTP API, no database beyond
SQLite, no retry/backoff logic — none of these were required by the
exercise, and adding them would be speculative complexity for a
scraper that runs once per invocation.

## Project structure

```
src/
  domain/
    entities/HackerNewsEntry.ts
    services/WordCounter.ts
    ports/HackerNewsCrawler.port.ts
    ports/UsageRepository.port.ts
  application/
    use-cases/FilterEntries.usecase.ts
    use-cases/CrawlAndFilter.usecase.ts
  infrastructure/
    crawler/CheerioHackerNewsCrawler.ts
    persistence/SqliteUsageRepository.ts
  cli.ts
tests/
  unit/
  fixtures/
```
