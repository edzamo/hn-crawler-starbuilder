import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { UsageRecord, UsageRepositoryPort } from '../../../../application/out/UsageRepository.port';
import { UsageLogEntity } from './entity/UsageLogEntity';

/**
 * Persists usage records (one row per crawl/filter request) to a
 * local SQLite file. SQLite was chosen over an external database so
 * the exercise runs with zero setup while still exercising real SQL
 * and a schema instead of a flat log file.
 *
 * Implements OnModuleDestroy so Nest closes the DB handle on
 * shutdown regardless of how this instance was constructed (it's
 * bound via useFactory in infrastructure/config, not useClass).
 */
@Injectable()
export class SqliteUsageRepository implements UsageRepositoryPort, OnModuleDestroy {
  private readonly db: Database.Database;

  constructor(dbPath: string = path.join(process.cwd(), 'data', 'usage.sqlite')) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requested_at TEXT NOT NULL,
        filter_applied TEXT NOT NULL,
        entry_count INTEGER NOT NULL,
        result_count INTEGER NOT NULL,
        duration_ms INTEGER NOT NULL,
        source TEXT NOT NULL
      );
    `);
  }

  async record(usage: UsageRecord): Promise<void> {
    const entity = this.toEntity(usage);

    this.db
      .prepare(
        `INSERT INTO usage_log
          (requested_at, filter_applied, entry_count, result_count, duration_ms, source)
         VALUES (@requested_at, @filter_applied, @entry_count, @result_count, @duration_ms, @source)`,
      )
      .run(entity);
  }

  /**
   * UsageRecord (the port's type: a Date, camelCase) -> UsageLogEntity
   * (the table's type: an ISO string, snake_case columns). There's no
   * toModel() the other way yet — nothing reads usage_log back out
   * through this port today, only writes it.
   */
  private toEntity(usage: UsageRecord): UsageLogEntity {
    return {
      requested_at: usage.requestedAt.toISOString(),
      filter_applied: usage.filterApplied,
      entry_count: usage.entryCount,
      result_count: usage.resultCount,
      duration_ms: usage.durationMs,
      source: usage.source,
    };
  }

  onModuleDestroy(): void {
    this.close();
  }

  close(): void {
    this.db.close();
  }
}
