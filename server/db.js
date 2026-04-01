import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/freehold.db');

let SQL = null;
let sqlDb = null;
let initialized = false;

// Prepared statement wrapper
class PreparedStatement {
  constructor(sql, database) {
    this.sql = sql;
    this.database = database;
  }

  run(...params) {
    try {
      // Clean parameters: convert undefined to null for sql.js compatibility
      const cleanParams = params.map(p => p === undefined ? null : p);
      this.database.run(this.sql, cleanParams);

      // Get last insert rowid
      let lastID = 0;
      try {
        const lastIdResult = this.database.exec('SELECT last_insert_rowid() as id');
        if (lastIdResult[0] && lastIdResult[0].values.length > 0) {
          lastID = lastIdResult[0].values[0][0];
        }
      } catch (e) {
        // If that fails, try without alias
        try {
          const lastIdResult = this.database.exec('SELECT last_insert_rowid()');
          if (lastIdResult[0] && lastIdResult[0].values.length > 0) {
            lastID = lastIdResult[0].values[0][0];
          }
        } catch (e2) {
          console.warn('Could not get last insert rowid');
        }
      }

      const changes = this.database.getRowsModified();
      return { changes, lastID, lastInsertRowid: lastID };
    } catch (err) {
      console.error('PreparedStatement.run error:', err);
      // Try to extract meaningful error message
      if (err.message && typeof err.message === 'string') {
        throw new Error(err.message);
      }
      throw err;
    }
  }

  get(...params) {
    try {
      // Clean parameters: convert undefined to null for sql.js compatibility
      const cleanParams = params.map(p => p === undefined ? null : p);
      const result = this.database.exec(this.sql, cleanParams);
      if (result[0] && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        const row = {};
        columns.forEach((col, idx) => {
          row[col] = values[idx];
        });
        return row;
      }
      return undefined;
    } catch (err) {
      console.error('PreparedStatement.get error:', err);
      throw err;
    }
  }

  all(...params) {
    try {
      // Clean parameters: convert undefined to null for sql.js compatibility
      const cleanParams = params.map(p => p === undefined ? null : p);
      const result = this.database.exec(this.sql, cleanParams);
      if (result[0]) {
        const columns = result[0].columns;
        return result[0].values.map(values => {
          const row = {};
          columns.forEach((col, idx) => {
            row[col] = values[idx];
          });
          return row;
        });
      }
      return [];
    } catch (err) {
      console.error('PreparedStatement.all error:', err);
      throw err;
    }
  }
}

// Database wrapper
class Database {
  pragma(stmt) {
    if (!sqlDb) throw new Error('Database not initialized');
    try {
      return sqlDb.run(stmt);
    } catch (err) {
      console.warn('pragma error (ignored):', err.message);
    }
  }

  exec(sql) {
    if (!sqlDb) throw new Error('Database not initialized');
    return sqlDb.exec(sql);
  }

  prepare(sql) {
    if (!sqlDb) throw new Error('Database not initialized');
    return new PreparedStatement(sql, sqlDb);
  }

  transaction(fn) {
    // Simple transaction wrapper - not truly ACID but works for our purposes
    return (data) => {
      try {
        return fn(data);
      } catch (err) {
        throw err;
      }
    };
  }

  close() {
    if (sqlDb) {
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    }
  }
}

// Synchronous initialization wrapper
async function initDb() {
  SQL = await initSqlJs();
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (fs.existsSync(dbPath)) {
    const dbBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(dbBuffer);
  } else {
    sqlDb = new SQL.Database();
  }
  sqlDb.run('PRAGMA foreign_keys = ON');
  initialized = true;
}

// Initialize immediately
const initPromise = initDb().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export const db = new Database();

// Wait for initialization before using
export async function ensureDbInitialized() {
  await initPromise;
}

// For backward compatibility with sync code, provide a way to wait
export function getDb() {
  return db;
}

export default db;
