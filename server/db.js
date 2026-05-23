import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'chromacoustic_research.db');

let dbConnection = null;

export async function getDb() {
  if (dbConnection) return dbConnection;

  // Open the SQLite file
  dbConnection = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create table matching scientific types
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS research_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pseudo_id TEXT NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      consent_version TEXT NOT NULL,
      granted_at TEXT NOT NULL,
      share_data INTEGER NOT NULL,
      age_band TEXT,
      language_family TEXT,
      native_language TEXT,
      region TEXT,
      is_multilingual INTEGER,
      summary TEXT NOT NULL, -- JSON string representation
      app_version TEXT NOT NULL,
      device_class TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`SQLite database successfully initialized at: ${dbPath}`);
  return dbConnection;
}
