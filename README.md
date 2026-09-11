# HN Crawler

A Hacker News crawler exposed as a NestJS REST API. It scrapes the top
30 front-page entries (rank, title, points, comment count) and
supports two filtering operations, with every request logged for
usage analysis.

## Requirements

- Node.js >= 18

## Setup

```bash
npm install
```

## Usage

```bash
npm run build
npm start
# or against source directly:
npm run dev
```

```bash
curl http://localhost:3000/entries                        # top 30, no filter
curl http://localhost:3000/entries?filter=long-titles      # >5-word titles, ordered by comments desc
curl http://localhost:3000/entries?filter=short-titles     # <=5-word titles, ordered by points desc
curl http://localhost:3000/health                          # liveness/readiness probe target
```

An invalid `filter` value is rejected with `400` by a `class-validator`
DTO before it ever reaches the crawler. Each successful `/entries`
call logs a usage row (timestamp, filter applied, entry/result
counts, duration) to `data/usage.sqlite` (gitignored) — configurable
via the `USAGE_DB_PATH` env var, `PORT` selects the HTTP port
(default `3000`).

## Docker

```bash
docker compose build
docker compose up
curl http://localhost:3000/entries?filter=long-titles
docker compose down -v
```

`usage.sqlite` is written to a named volume (`hn-crawler-data`) so
usage history survives container restarts. The image is a two-stage
build: the builder stage compiles TypeScript and better-sqlite3's
native addon (needs `python3`/`make`/`g++`), the runtime stage (same
`node:20-slim` base, so the compiled addon's ABI still matches) copies
only the pruned production `node_modules` and `dist/` — no compiler
toolchain ships in the final image. `HEALTHCHECK` hits `GET /health`
with a one-line Node script (no `curl` in the slim base image).

## Kubernetes (Helm values)

`helm/` holds exactly three files: `dev.yml`, `test.yml`, `prod.yml`.
No `Chart.yaml`, no `templates/` — this repo doesn't own a Helm chart.
That mirrors how some teams' internal pipelines are set up: each
service repo carries only its per-environment values, and a chart
maintained centrally (referenced by the CI/CD pipeline) does the
actual templating. That shared chart doesn't exist for this exercise,
so treat these three files as the documented, versioned intent for
what the deployment should look like per environment (image tag,
resources, whether persistence/autoscaling/a PodDisruptionBudget are
on) — `docker compose` (above) is what's actually runnable today.

Each file is self-contained (no shared defaults file layered under
them) and covers: `image.repository`/`tag`, `service` (type/port),
`resources`, `probes` (against `/health`), `persistence` (`false` in
dev — `usage.sqlite` on an ephemeral volume; `true` from test onward,
with `storageClassName` left blank so a real chart's default
StorageClass would apply), and `replicaCount`/`autoscaling`/`pdb`.
`replicaCount` stays at 1 everywhere and `autoscaling.enabled` stays
`false`: `usage.sqlite` is single-writer, so real horizontal scaling
would need usage tracking moved off SQLite first — that tradeoff is
documented inline in `prod.yml` rather than quietly turning a knob
that wouldn't actually be safe.

## Tests

```bash
npm test
```

26 tests: the word counter, the two filters, the crawler (against a
captured real HN page fixture, plus an edge case for stories with no
comments yet), the usage repository, the orchestrating service
(including the crawler-failure path), and an end-to-end test
(`@nestjs/testing` + `supertest`) covering the full HTTP wiring —
routing, the validation pipe rejecting a bad `filter`, and DI —
against fake ports, no real network or filesystem access.

## Design decisions

**Approach.** The two domain rules in the exercise were treated as
something to reverse-engineer against real evidence, not just
implement from a paraphrase:

- The word-counting rule was derived backward from the exercise's own
  worked example rather than guessed: `"This is - a self-explained
  example"` must count as 5. Splitting on whitespace and testing each
  token for at least one letter/digit reproduces that count exactly —
  the standalone `-` has no alphanumeric character and drops out,
  while `self-explained` has no internal space and survives as one
  token. That rule is unit-tested against the exact example string
  plus edge cases (repeated spaces, an all-symbol token, an empty
  title) before it was trusted anywhere else.
- The crawler's HTML selectors were derived from inspecting HN's
  actual front page (view-source, not a guess at "how a table
  probably looks"): each story's rank/title/link and its
  points/comment-count live in two separate `<tr>` elements with no
  shared parent, which is only visible by reading the real markup.
  That inspection is what the fixture in `tests/fixtures/` captures,
  so the parsing logic is tested against real HTML, not an idealized
  mock of it.

**Architecture.** The code follows hexagonal architecture (ports &
adapters) on top of NestJS, with the direction of each port made
explicit in the folder name rather than buried in a generic `ports/`
bucket, and the application layer kept free of any NestJS import:

- `src/domain/model` — the `HackerNewsEntry` shape.
  `src/domain/service` — pure business rules with no I/O: `countWords`
  and the two filters (`filterLongTitlesByComments`,
  `filterShortTitlesByPoints`).
- `src/application/in` — the input port: the `CrawlAndFilterUseCase`
  interface any driving adapter is allowed to call, plus its
  `CRAWL_AND_FILTER_USE_CASE` injection token (TS interfaces don't
  exist at runtime, so NestJS binds/injects by token instead).
  `src/application/out` — the output ports (`HackerNewsCrawlerPort`,
  `UsageRepositoryPort`) the application needs from the outside world,
  each with its own token.
  `src/application/service` — `CrawlAndFilterService`, a plain class
  (no `@Injectable()`, no NestJS import at all) implementing the input
  port: it orchestrates `domain` and the output ports to crawl,
  filter, and always record usage — including when the crawl fails,
  so crawler errors show up in the usage data instead of disappearing
  silently. Being framework-free, it's unit-tested with `new
  CrawlAndFilterService(fakeCrawler, fakeUsageRepo)` — no
  `TestingModule`, no Nest bootstrap.
- `src/infrastructure/adapter/in/rest` — `EntriesController` and
  `HealthController`, the driving adapters that call `application/in`.
  `src/infrastructure/adapter/out/{crawler,persistence}` — the driven
  adapters implementing `application/out`: `CheerioHackerNewsCrawler`
  (axios + cheerio) and `SqliteUsageRepository` (better-sqlite3, with
  an `OnModuleDestroy` hook so Nest closes the DB handle on shutdown).
- `src/infrastructure/config/AppModule.ts` — the composition root: the
  only file that knows both NestJS and the concrete `application/service`
  classes. Every port is bound with `useFactory` (not `useClass`) so
  `application/service` never needs a NestJS decorator.

A request always flows one direction — `adapter/in` → `application/in`
→ `application/service` → `application/out` → `adapter/out` — and
never skips a layer (a controller never imports an out-adapter
directly, the service never imports an adapter).

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
parse error. Rows are parsed as a `toArray().map().filter()` pipeline
rather than a loop with a mutable accumulator.

**Storage.** Usage tracking uses SQLite (via `better-sqlite3`)
instead of an external database or cache so the service runs with
minimal infrastructure while still using a real schema and real SQL,
migrated automatically on first run. Each row records the request
timestamp, the filter applied, how many entries were crawled vs.
returned after filtering, the request duration, and the source
(currently always `'api'`, kept as a field since a second driving
adapter would be a plausible future addition).

**Filtering semantics.** Filtering and sorting are two different pure
functions rather than one function with a sort-direction flag,
because the two operations in the exercise aren't structurally
parallel (one filters on title length and sorts by comments, the
other filters on the same predicate's complement and sorts by
points) — a shared abstraction would need a branch per call anyway,
so two small named functions read more clearly than one parameterized
one.

**What was left out on purpose.** No retry/backoff logic on the
crawler, no auth on the API, no `@nestjs/terminus` for the health
check (a plain controller is enough) — none of these were required by
the exercise, and adding them would be speculative complexity.

## Project structure

```
src/
  main.ts
  domain/
    model/HackerNewsEntry.ts
    service/WordCounter.ts
    service/FilterEntries.service.ts
  application/
    in/CrawlAndFilter.in.ts
    out/HackerNewsCrawler.port.ts
    out/UsageRepository.port.ts
    service/CrawlAndFilterService.ts
  infrastructure/
    config/AppModule.ts
    adapter/
      in/rest/EntriesController.ts
      in/rest/HealthController.ts
      in/rest/dto/GetEntriesQuery.dto.ts
      out/crawler/CheerioHackerNewsCrawler.ts
      out/persistence/SqliteUsageRepository.ts
tests/
  unit/
  e2e/
  fixtures/
helm/
  dev.yml
  test.yml
  prod.yml
```
