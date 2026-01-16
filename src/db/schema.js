import { run } from "./db";

export async function initDb() {
  await run(`PRAGMA foreign_keys = ON;`);

  await run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- bank|cash|wallet|investment
      currency TEXT NOT NULL DEFAULT 'COP',
      created_at TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      kind TEXT NOT NULL, -- income|expense
      FOREIGN KEY(parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL, -- income|expense|transfer|adjustment|loan
      amount INTEGER NOT NULL, -- COP in pesos (integer)
      account_id INTEGER NOT NULL,
      category_id INTEGER,
      note TEXT,
      attachment_uri TEXT,
      transfer_group TEXT, -- to link two sides of transfer
      related_id INTEGER, -- e.g. loan_id
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transaction_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY(transaction_id, tag_id),
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL, -- owed_to_me | i_owe
      person TEXT NOT NULL,
      principal INTEGER NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      note TEXT,
      start_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' -- open|closed
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(loan_id) REFERENCES loans(id) ON DELETE CASCADE,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL, -- YYYY-MM
      category_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      rollover INTEGER NOT NULL DEFAULT 0, -- 0/1
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      target_date TEXT,
      saved_amount INTEGER NOT NULL DEFAULT 0,
      note TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- expense|income
      amount INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      category_id INTEGER,
      day_of_month INTEGER NOT NULL, -- 1-28/30/31
      next_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  await run(`
  CREATE TABLE IF NOT EXISTS goal_contributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount INTEGER NOT NULL, -- + aporta, - retira
    account_id INTEGER,      -- opcional (si quieres ligar a una cuenta real)
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE SET NULL
  );
`);

  // Seed básico de categorías (si no existen)
  const catCount = await run(`SELECT COUNT(*) as c FROM categories`);
  if ((catCount.rows.item(0)?.c ?? 0) === 0) {
    // Expense
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Vivienda', NULL, 'expense')`);
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Transporte', NULL, 'expense')`);
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Comida', NULL, 'expense')`);
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Servicios', NULL, 'expense')`);
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Salud', NULL, 'expense')`);
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Ocio', NULL, 'expense')`);
    // Income
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Salario', NULL, 'income')`);
    await run(`INSERT INTO categories(name, parent_id, kind) VALUES ('Otros ingresos', NULL, 'income')`);
  }
}
