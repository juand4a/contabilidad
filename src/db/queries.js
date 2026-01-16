import { run } from "./db";

export async function listAccounts() {
  const r = await run(`SELECT * FROM accounts ORDER BY id DESC`);
  return r.rows._array;
}

export async function createAccount({ name, type, initialBalance, initialDate }) {
  const now = new Date().toISOString();
  const res = await run(
    `INSERT INTO accounts(name, type, currency, created_at) VALUES (?, ?, 'COP', ?)`,
    [name, type, now]
  );
  const accountId = res.insertId;

  // saldo inicial como movimiento "adjustment" (recomendado)
  if (initialBalance && Number(initialBalance) !== 0) {
    await run(
      `INSERT INTO transactions(date, type, amount, account_id, note, created_at)
       VALUES (?, 'adjustment', ?, ?, ?, ?)`,
      [initialDate || now.slice(0, 10), Number(initialBalance), accountId, "Saldo inicial", now]
    );
  }
  return accountId;
}

export async function getAccountBalance(accountId) {
  const r = await run(
    `SELECT COALESCE(SUM(
        CASE
          WHEN type IN ('income','adjustment') THEN amount
          WHEN type IN ('expense') THEN -amount
          WHEN type IN ('transfer','loan') THEN amount
          ELSE 0
        END
      ),0) AS balance
     FROM transactions
     WHERE account_id = ?`,
    [accountId]
  );
  return r.rows.item(0).balance || 0;
}

export async function listAccountTransactions(accountId) {
  const r = await run(
    `SELECT t.*, c.name as category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.account_id = ?
     ORDER BY date DESC, id DESC`,
    [accountId]
  );
  return r.rows._array;
}

export async function listCategories(kind) {
  const r = await run(
    `SELECT * FROM categories ${kind ? "WHERE kind = ?" : ""} ORDER BY name ASC`,
    kind ? [kind] : []
  );
  return r.rows._array;
}

export async function upsertTag(name) {
  const clean = name.trim().toLowerCase();
  if (!clean) return null;
  await run(`INSERT OR IGNORE INTO tags(name) VALUES (?)`, [clean]);
  const r = await run(`SELECT * FROM tags WHERE name = ?`, [clean]);
  return r.rows.item(0)?.id ?? null;
}

export async function addTransaction({
  date,
  type, // income|expense|adjustment
  amount,
  accountId,
  categoryId,
  note,
  attachmentUri,
  tagNames = [],
  splits = [] // [{categoryId, amount}]
}) {
  const now = new Date().toISOString();
  const res = await run(
    `INSERT INTO transactions(date, type, amount, account_id, category_id, note, attachment_uri, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [date, type, amount, accountId, categoryId || null, note || null, attachmentUri || null, now]
  );
  const txId = res.insertId;

  // splits: si existe, ignora categoryId y se reparte
  if (splits?.length) {
    for (const s of splits) {
      await run(
        `INSERT INTO transaction_splits(transaction_id, category_id, amount) VALUES (?,?,?)`,
        [txId, s.categoryId, s.amount]
      );
    }
  }

  // tags
  for (const tag of tagNames) {
    const tagId = await upsertTag(tag);
    if (tagId) {
      await run(`INSERT OR IGNORE INTO transaction_tags(transaction_id, tag_id) VALUES (?,?)`, [
        txId,
        tagId
      ]);
    }
  }

  return txId;
}

export async function addTransfer({ date, amount, fromAccountId, toAccountId, note }) {
  const now = new Date().toISOString();
  const group = `tr_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // salida: amount negativo en "transfer"
  await run(
    `INSERT INTO transactions(date, type, amount, account_id, note, transfer_group, created_at)
     VALUES (?, 'transfer', ?, ?, ?, ?, ?)`,
    [date, -Math.abs(amount), fromAccountId, note || "Transferencia (salida)", group, now]
  );

  // entrada: amount positivo
  await run(
    `INSERT INTO transactions(date, type, amount, account_id, note, transfer_group, created_at)
     VALUES (?, 'transfer', ?, ?, ?, ?, ?)`,
    [date, Math.abs(amount), toAccountId, note || "Transferencia (entrada)", group, now]
  );

  return group;
}

export async function monthSummary(monthYYYYMM) {
  const start = `${monthYYYYMM}-01`;
  const end = `${monthYYYYMM}-31`;

  const incomeR = await run(
    `SELECT COALESCE(SUM(amount),0) AS v FROM transactions
     WHERE type='income' AND date BETWEEN ? AND ?`,
    [start, end]
  );
  const expenseR = await run(
    `SELECT COALESCE(SUM(amount),0) AS v FROM transactions
     WHERE type='expense' AND date BETWEEN ? AND ?`,
    [start, end]
  );

  const income = incomeR.rows.item(0).v || 0;
  const expense = expenseR.rows.item(0).v || 0;
  return { income, expense, savings: income - expense };
}

export async function expensesByCategory(monthYYYYMM) {
  const start = `${monthYYYYMM}-01`;
  const end = `${monthYYYYMM}-31`;

  // incluye splits
  const r = await run(
    `
    SELECT name as category, SUM(amount) as total FROM (
      SELECT c.name, t.amount
      FROM transactions t
      JOIN categories c ON c.id=t.category_id
      WHERE t.type='expense' AND t.date BETWEEN ? AND ? AND t.id NOT IN (SELECT transaction_id FROM transaction_splits)
      UNION ALL
      SELECT c2.name, s.amount
      FROM transaction_splits s
      JOIN transactions t2 ON t2.id=s.transaction_id
      JOIN categories c2 ON c2.id=s.category_id
      WHERE t2.type='expense' AND t2.date BETWEEN ? AND ?
    )
    GROUP BY name
    ORDER BY total DESC
    `,
    [start, end, start, end]
  );
  return r.rows._array;
}

// LOANS
export async function createLoan({ direction, person, principal, interest_rate, start_date, note, accountId }) {
  await run(
    `INSERT INTO loans(direction, person, principal, interest_rate, start_date, note, status)
     VALUES (?,?,?,?,?,?, 'open')`,
    [direction, person, principal, interest_rate || 0, start_date, note || null]
  );
  const r = await run(`SELECT last_insert_rowid() as id`);
  const loanId = r.rows.item(0).id;

  // movimiento inicial:
  // owed_to_me: sale plata de mi cuenta (-principal) y genero "activo" fuera del scope contable;
  // i_owe: entra plata a mi cuenta (+principal)
  const amount = direction === "i_owe" ? Math.abs(principal) : -Math.abs(principal);
  await run(
    `INSERT INTO transactions(date, type, amount, account_id, note, related_id, created_at)
     VALUES (?, 'loan', ?, ?, ?, ?, ?)`,
    [start_date, amount, accountId, `Préstamo (${direction === "i_owe" ? "me prestaron" : "yo presté"})`, loanId, new Date().toISOString()]
  );

  return loanId;
}

export async function listLoans() {
  const r = await run(`SELECT * FROM loans ORDER BY status ASC, id DESC`);
  return r.rows._array;
}

export async function loanPayments(loanId) {
  const r = await run(
    `SELECT p.*, a.name as account_name
     FROM loan_payments p
     JOIN accounts a ON a.id=p.account_id
     WHERE p.loan_id=?
     ORDER BY date DESC, id DESC`,
    [loanId]
  );
  return r.rows._array;
}

export async function goalBalance(goalId) {
  const r = await run(
    `SELECT COALESCE(SUM(amount),0) as saved
     FROM goal_contributions
     WHERE goal_id=?`,
    [goalId]
  );
  return r.rows.item(0)?.saved ?? 0;
}

export async function goalContributions(goalId) {
  const r = await run(
    `SELECT gc.*, a.name as account_name
     FROM goal_contributions gc
     LEFT JOIN accounts a ON a.id=gc.account_id
     WHERE gc.goal_id=?
     ORDER BY date DESC, id DESC`,
    [goalId]
  );
  return r.rows._array;
}

export async function addGoalContribution({ goalId, date, amount, accountId, note }) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO goal_contributions(goal_id, date, amount, account_id, note, created_at)
     VALUES (?,?,?,?,?,?)`,
    [goalId, date, amount, accountId || null, note || null, now]
  );
}

export async function loanBalance(loanId) {
  const loanR = await run(`SELECT principal, direction FROM loans WHERE id=?`, [loanId]);
  const loan = loanR.rows.item(0);
  const payR = await run(`SELECT COALESCE(SUM(amount),0) as paid FROM loan_payments WHERE loan_id=?`, [loanId]);
  const paid = payR.rows.item(0).paid || 0;
  const remaining = Math.max(0, (loan?.principal || 0) - paid);
  return { remaining, direction: loan?.direction };
}

export async function addLoanPayment({ loanId, date, amount, accountId, note }) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO loan_payments(loan_id, date, amount, account_id, note, created_at)
     VALUES (?,?,?,?,?,?)`,
    [loanId, date, Math.abs(amount), accountId, note || null, now]
  );

  // movimiento de cuenta:
  // si yo debo, pago => sale plata (-amount)
  // si me deben, cobro => entra plata (+amount)
  const loanR = await run(`SELECT direction FROM loans WHERE id=?`, [loanId]);
  const direction = loanR.rows.item(0).direction;
  const txAmount = direction === "i_owe" ? -Math.abs(amount) : Math.abs(amount);

  await run(
    `INSERT INTO transactions(date, type, amount, account_id, note, related_id, created_at)
     VALUES (?, 'loan', ?, ?, ?, ?, ?)`,
    [date, txAmount, accountId, `Pago préstamo`, loanId, now]
  );
}

export async function upsertBudget({ month, categoryId, amount, rollover }) {
  await run(
    `INSERT INTO budgets(month, category_id, amount, rollover)
     VALUES (?,?,?,?)
     ON CONFLICT(id) DO NOTHING`,
    [month, categoryId, amount, rollover ? 1 : 0]
  );
  // SQLite en expo no soporta UPSERT por clave compuesta sin constraint; hacemos manual:
  const r = await run(`SELECT id FROM budgets WHERE month=? AND category_id=?`, [month, categoryId]);
  if (r.rows.length) {
    await run(`UPDATE budgets SET amount=?, rollover=? WHERE month=? AND category_id=?`, [
      amount,
      rollover ? 1 : 0,
      month,
      categoryId
    ]);
  } else {
    await run(`INSERT INTO budgets(month, category_id, amount, rollover) VALUES (?,?,?,?)`, [
      month,
      categoryId,
      amount,
      rollover ? 1 : 0
    ]);
  }
}

export async function listBudgets(month) {
  const r = await run(
    `SELECT b.*, c.name as category_name
     FROM budgets b JOIN categories c ON c.id=b.category_id
     WHERE b.month=?
     ORDER BY c.name ASC`,
    [month]
  );
  return r.rows._array;
}
export async function listGoals() {
  const r = await run(`SELECT * FROM goals ORDER BY id DESC`);
  return r.rows._array;
}
// Net worth (patrimonio): cuentas + (me deben) - (debo)
export async function netWorth() {
  const accR = await run(
    `SELECT COALESCE(SUM(
      CASE
        WHEN type IN ('income','adjustment') THEN amount
        WHEN type='expense' THEN -amount
        WHEN type IN ('transfer','loan') THEN amount
        ELSE 0 END
    ),0) as total FROM transactions`
  );
  const totalCash = accR.rows.item(0).total || 0;

  const loansR = await run(`SELECT id, principal, direction FROM loans WHERE status='open'`);
  let receivable = 0;
  let payable = 0;
  for (const l of loansR.rows._array) {
    const b = await loanBalance(l.id);
    if (b.direction === "owed_to_me") receivable += b.remaining;
    else payable += b.remaining;
  }
  return { totalCash, receivable, payable, net: totalCash + receivable - payable };
}
