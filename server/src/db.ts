import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..","..");
export const dataDir=process.env.DATA_DIR??join(root,"data");
mkdirSync(dataDir,{recursive:true});
export const db=new Database(join(dataDir,"terminal.db"));
db.pragma("journal_mode = WAL");db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS portfolios(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS rss_feeds(id INTEGER PRIMARY KEY AUTOINCREMENT,url TEXT NOT NULL UNIQUE,label TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,symbol TEXT NOT NULL,side TEXT NOT NULL CHECK(side IN ('BUY','SELL')),quantity REAL NOT NULL CHECK(quantity>0),price REAL NOT NULL CHECK(price>=0),executed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS historical_bars(symbol TEXT NOT NULL,timeframe TEXT NOT NULL,time INTEGER NOT NULL,open REAL NOT NULL,high REAL NOT NULL,low REAL NOT NULL,close REAL NOT NULL,volume REAL,PRIMARY KEY(symbol,timeframe,time));
CREATE INDEX IF NOT EXISTS idx_historical_bars_lookup ON historical_bars(symbol,timeframe,time);
CREATE TABLE IF NOT EXISTS backtest_runs(id TEXT PRIMARY KEY,symbol TEXT NOT NULL,timeframe TEXT NOT NULL,strategy TEXT NOT NULL,config_json TEXT NOT NULL,result_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')));
CREATE TABLE IF NOT EXISTS strategy_experiments(id TEXT PRIMARY KEY,name TEXT NOT NULL,hypothesis TEXT NOT NULL,strategy TEXT NOT NULL,config_json TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT(datetime('now')),updated_at TEXT NOT NULL DEFAULT(datetime('now')));
`);
if(!db.prepare("SELECT id FROM portfolios LIMIT 1").get())db.prepare("INSERT INTO portfolios(name) VALUES(?)").run("Main");
