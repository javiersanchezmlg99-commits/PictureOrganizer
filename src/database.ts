import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import type { Photo, StatsData } from './shared/types';

let db: SqlJsDatabase;
let dbPath: string;

function saveDb(): void {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export async function initDatabase(): Promise<void> {
  dbPath = path.join(app.getPath('userData'), 'fauna.db');

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      species_name TEXT,
      scientific_name TEXT,
      confidence REAL DEFAULT 0,
      category TEXT,
      location_lat REAL,
      location_lng REAL,
      inference_time_ms INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS metadata (
      photo_id TEXT PRIMARY KEY,
      all_predictions TEXT,
      raw_output TEXT,
      FOREIGN KEY(photo_id) REFERENCES photos(id) ON DELETE CASCADE
    );
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_species ON photos(species_name);');
  db.run('CREATE INDEX IF NOT EXISTS idx_created ON photos(created_at);');
  db.run('CREATE INDEX IF NOT EXISTS idx_confidence ON photos(confidence);');

  saveDb();
}

function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const results = queryAll<T>(sql, params);
  return results[0] ?? null;
}

export function getAllPhotos(): Photo[] {
  return queryAll<Photo>('SELECT * FROM photos ORDER BY created_at DESC');
}

export function getPhotoById(id: string): Photo | null {
  return queryOne<Photo>('SELECT * FROM photos WHERE id = ?', [id]);
}

export function insertPhoto(data: {
  filename: string;
  file_path: string;
  species_name?: string;
  scientific_name?: string;
  confidence?: number;
  category?: string;
  inference_time_ms?: number;
  all_predictions?: Array<{ class: string; confidence: number }>;
}): Photo {
  const id = uuidv4();
  db.run(
    `INSERT INTO photos (id, filename, file_path, species_name, scientific_name, confidence, category, inference_time_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.filename,
      data.file_path,
      data.species_name ?? null,
      data.scientific_name ?? null,
      data.confidence ?? 0,
      data.category ?? null,
      data.inference_time_ms ?? null,
    ]
  );

  if (data.all_predictions) {
    db.run('INSERT INTO metadata (photo_id, all_predictions) VALUES (?, ?)', [
      id,
      JSON.stringify(data.all_predictions),
    ]);
  }

  saveDb();
  return getPhotoById(id)!;
}

export function deletePhoto(id: string): void {
  db.run('DELETE FROM metadata WHERE photo_id = ?', [id]);
  db.run('DELETE FROM photos WHERE id = ?', [id]);
  saveDb();
}

export function getStats(): StatsData {
  const total = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM photos') ?? { count: 0 };
  const unique = queryOne<{ count: number }>('SELECT COUNT(DISTINCT species_name) as count FROM photos WHERE species_name IS NOT NULL') ?? { count: 0 };
  const avg = queryOne<{ avg: number | null }>('SELECT AVG(confidence) as avg FROM photos WHERE confidence > 0') ?? { avg: null };
  const today = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM photos WHERE date(created_at) = date('now')") ?? { count: 0 };

  return {
    total_photos: total.count,
    unique_species: unique.count,
    avg_confidence: Math.round((avg.avg ?? 0) * 100) / 100,
    photos_today: today.count,
  };
}

export function getTopSpecies(limit = 10): Array<{ species_name: string; count: number }> {
  return queryAll<{ species_name: string; count: number }>(
    `SELECT species_name, COUNT(*) as count
     FROM photos WHERE species_name IS NOT NULL
     GROUP BY species_name ORDER BY count DESC LIMIT ?`,
    [limit]
  );
}

export function getTimeline(): Array<{ month: string; count: number }> {
  return queryAll<{ month: string; count: number }>(
    `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
     FROM photos GROUP BY month ORDER BY month ASC`
  );
}
