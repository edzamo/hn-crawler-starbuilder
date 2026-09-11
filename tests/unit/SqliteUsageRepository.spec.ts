import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SqliteUsageRepository } from '../../src/infrastructure/adapter/out/persistence/SqliteUsageRepository';
import Database from 'better-sqlite3';

describe('SqliteUsageRepository', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hn-usage-')), 'usage.sqlite');
  });

  afterEach(() => {
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  it('creates the schema and persists a usage record', async () => {
    const repository = new SqliteUsageRepository(dbPath);

    await repository.record({
      requestedAt: new Date('2024-05-01T10:00:00.000Z'),
      filterApplied: 'long-titles',
      entryCount: 30,
      resultCount: 12,
      durationMs: 450,
      source: 'api',
    });
    repository.close();

    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare('SELECT * FROM usage_log').all() as any[];
    db.close();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      filter_applied: 'long-titles',
      entry_count: 30,
      result_count: 12,
      duration_ms: 450,
      source: 'api',
    });
  });

  it('appends multiple records across calls', async () => {
    const repository = new SqliteUsageRepository(dbPath);

    await repository.record({
      requestedAt: new Date(),
      filterApplied: 'short-titles',
      entryCount: 30,
      resultCount: 18,
      durationMs: 100,
      source: 'api',
    });
    await repository.record({
      requestedAt: new Date(),
      filterApplied: 'none',
      entryCount: 30,
      resultCount: 30,
      durationMs: 90,
      source: 'api',
    });
    repository.close();

    const db = new Database(dbPath, { readonly: true });
    const count = db.prepare('SELECT COUNT(*) as count FROM usage_log').get() as { count: number };
    db.close();

    expect(count.count).toBe(2);
  });
});
