const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'expenses.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6c5ce7',
  icon TEXT DEFAULT '💰',
  is_default INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER,
  amount REAL NOT NULL,
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER,
  month TEXT NOT NULL,
  amount REAL NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(user_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
`);

// ---------- Default categories given to every new user ----------
const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', color: '#ff6b6b', icon: '🍔' },
  { name: 'Transport', color: '#4ecdc4', icon: '🚌' },
  { name: 'Shopping', color: '#ffe66d', icon: '🛍️' },
  { name: 'Bills & Utilities', color: '#1a8fe3', icon: '💡' },
  { name: 'Entertainment', color: '#a66cff', icon: '🎮' },
  { name: 'Health', color: '#2ecc71', icon: '💊' },
  { name: 'Education', color: '#ff9f43', icon: '📚' },
  { name: 'Other', color: '#95a5a6', icon: '📦' }
];

function seedDefaultCategories(userId) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO categories (user_id, name, color, icon, is_default) VALUES (?, ?, ?, ?, 1)`
  );
  for (const c of DEFAULT_CATEGORIES) {
    insert.run(userId, c.name, c.color, c.icon);
  }
}

module.exports = { db, seedDefaultCategories };
