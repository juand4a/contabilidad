import { run } from "./db";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateISO, days) {
  const [y, m, d] = String(dateISO || todayISO()).split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function addMonthsISO(dateISO, months) {
  const [y, m, d] = String(dateISO || todayISO()).split("-").map(Number);
  const targetMonth = (m || 1) - 1 + Number(months || 0);
  const first = new Date(y, targetMonth, 1, 12, 0, 0, 0);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(d || 1, lastDay));
  return first.toISOString().slice(0, 10);
}

function daysBetween(fromISO, toISO) {
  const a = new Date(`${fromISO}T00:00:00`);
  const b = new Date(`${toISO}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export async function listAccounts() {
  const r = await run(`SELECT * FROM accounts ORDER BY type='cash' DESC, id DESC`);
  return r.rows._array;
}

export async function ensureDefaultCashAccount() {
  const r = await run(`SELECT * FROM accounts WHERE type='cash' ORDER BY id ASC LIMIT 1`);
  const existing = r.rows.item(0);
  if (existing) return existing.id;

  const now = new Date().toISOString();
  const res = await run(
    `INSERT INTO accounts(name, type, currency, created_at) VALUES ('Efectivo', 'cash', 'COP', ?)`,
    [now]
  );
  return res.insertId;
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

export async function getLiquiditySummary() {
  await ensureDefaultCashAccount();
  const accounts = await listAccounts();
  const byType = {
    cash: 0,
    bank: 0,
    wallet: 0,
    investment: 0,
    other: 0,
    total: 0,
    accounts: [],
  };

  for (const account of accounts) {
    const balance = await getAccountBalance(account.id);
    const type = byType[account.type] === undefined ? "other" : account.type;
    byType[type] += balance;
    byType.total += balance;
    byType.accounts.push({ ...account, balance });
  }

  return byType;
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

// LOANS / DEUDAS
function buildInstallmentAmounts(principal, count, installmentAmount) {
  const total = Math.abs(Number(principal || 0));
  const installments = Math.max(1, Number(count || 1));
  const desired = Math.abs(Number(installmentAmount || 0));

  if (installments === 1) return [total];

  const base = desired > 0 && desired * installments >= total ? desired : Math.floor(total / installments);
  const amounts = [];
  let accumulated = 0;

  for (let i = 1; i <= installments; i += 1) {
    const amount = i === installments ? total - accumulated : base;
    amounts.push(Math.max(0, amount));
    accumulated += amount;
  }

  return amounts;
}

export async function createLoan({
  direction,
  person,
  principal,
  interest_rate,
  start_date,
  note,
  accountId,
  first_due_date,
  installment_count = 1,
  installment_amount = 0,
  reminder_days_before = 2,
}) {
  const total = Math.abs(Number(principal || 0));
  const count = Math.max(1, Number(installment_count || 1));
  const dueDate = first_due_date || null;
  const installmentAmount = Math.abs(Number(installment_amount || 0));
  const reminderDays = Math.max(0, Number(reminder_days_before || 0));

  const res = await run(
    `INSERT INTO loans(direction, person, principal, interest_rate, start_date, note, status, due_date, installment_count, installment_amount, reminder_days_before)
     VALUES (?,?,?,?,?,?, 'open', ?, ?, ?, ?)`,
    [direction, person, total, interest_rate || 0, start_date, note || null, dueDate, count, installmentAmount, reminderDays]
  );
  const loanId = res.insertId;

  // movimiento inicial:
  // owed_to_me: sale plata de mi cuenta (-principal) y genero "activo" fuera del scope contable;
  // i_owe: entra plata a mi cuenta (+principal)
  const amount = direction === "i_owe" ? Math.abs(total) : -Math.abs(total);
  await run(
    `INSERT INTO transactions(date, type, amount, account_id, note, related_id, created_at)
     VALUES (?, 'loan', ?, ?, ?, ?, ?)`,
    [start_date, amount, accountId, `Préstamo (${direction === "i_owe" ? "me prestaron" : "yo presté"})`, loanId, new Date().toISOString()]
  );

  if (dueDate) {
    const amounts = buildInstallmentAmounts(total, count, installmentAmount);
    const now = new Date().toISOString();

    for (let i = 0; i < amounts.length; i += 1) {
      await run(
        `INSERT INTO loan_installments(loan_id, number, due_date, amount, paid_amount, status, created_at)
         VALUES (?,?,?,?,0,'pending',?)`,
        [loanId, i + 1, addMonthsISO(dueDate, i), amounts[i], now]
      );
    }
  }

  return loanId;
}

export async function listLoans() {
  const r = await run(
    `SELECT l.*,
            (SELECT MIN(li.due_date) FROM loan_installments li WHERE li.loan_id=l.id AND li.status!='paid') as next_due_date,
            (SELECT COUNT(*) FROM loan_installments li WHERE li.loan_id=l.id AND li.status!='paid') as pending_installments
     FROM loans l
     ORDER BY l.status ASC, l.id DESC`
  );
  return r.rows._array;
}

export async function loanPayments(loanId) {
  const r = await run(
    `SELECT p.*, a.name as account_name,
            li.number as installment_number,
            li.due_date as installment_due_date
     FROM loan_payments p
     JOIN accounts a ON a.id=p.account_id
     LEFT JOIN loan_installments li ON li.payment_id=p.id
     WHERE p.loan_id=?
     ORDER BY date DESC, id DESC`,
    [loanId]
  );
  return r.rows._array;
}

export async function listLoanInstallments(loanId) {
  const r = await run(
    `SELECT * FROM loan_installments
     WHERE loan_id=?
     ORDER BY number ASC, due_date ASC`,
    [loanId]
  );
  return r.rows._array;
}

export async function loanBalance(loanId) {
  const loanR = await run(`SELECT principal, direction FROM loans WHERE id=?`, [loanId]);
  const loan = loanR.rows.item(0);
  const payR = await run(`SELECT COALESCE(SUM(amount),0) as paid FROM loan_payments WHERE loan_id=?`, [loanId]);
  const paid = payR.rows.item(0).paid || 0;
  const remaining = Math.max(0, (loan?.principal || 0) - paid);
  return { remaining, direction: loan?.direction, paid };
}

export async function addLoanPayment({ loanId, date, amount, accountId, note, installmentId = null }) {
  const now = new Date().toISOString();
  const cleanAmount = Math.abs(Number(amount || 0));

  const res = await run(
    `INSERT INTO loan_payments(loan_id, date, amount, account_id, note, created_at)
     VALUES (?,?,?,?,?,?)`,
    [loanId, date, cleanAmount, accountId, note || null, now]
  );
  const paymentId = res.insertId;

  if (installmentId) {
    const instR = await run(`SELECT * FROM loan_installments WHERE id=? AND loan_id=?`, [installmentId, loanId]);
    const inst = instR.rows.item(0);
    if (inst) {
      const paidAmount = Math.min((inst.paid_amount || 0) + cleanAmount, inst.amount || 0);
      const status = paidAmount >= (inst.amount || 0) ? "paid" : "pending";
      await run(
        `UPDATE loan_installments
         SET paid_amount=?, status=?, payment_id=?
         WHERE id=?`,
        [paidAmount, status, paymentId, installmentId]
      );
    }
  }

  // movimiento de cuenta:
  // si yo debo, pago => sale plata (-amount)
  // si me deben, cobro => entra plata (+amount)
  const loanR = await run(`SELECT direction FROM loans WHERE id=?`, [loanId]);
  const direction = loanR.rows.item(0).direction;
  const txAmount = direction === "i_owe" ? -Math.abs(cleanAmount) : Math.abs(cleanAmount);

  await run(
    `INSERT INTO transactions(date, type, amount, account_id, note, related_id, created_at)
     VALUES (?, 'loan', ?, ?, ?, ?, ?)`,
    [date, txAmount, accountId, note || `Pago préstamo`, loanId, now]
  );

  const nb = await loanBalance(loanId);
  if (nb.remaining === 0) {
    await run(`UPDATE loans SET status='closed' WHERE id=?`, [loanId]);
    await run(`UPDATE loan_installments SET status='paid', paid_amount=amount WHERE loan_id=?`, [loanId]);
  }

  return paymentId;
}

export async function upcomingAlerts(daysAhead = 7) {
  const today = todayISO();
  const limit = addDaysISO(today, daysAhead);

  const recurringR = await run(
    `SELECT r.id, r.name, r.type, r.amount, r.next_date, r.reminder_days_before,
            a.name as account_name, c.name as category_name
     FROM recurring r
     JOIN accounts a ON a.id=r.account_id
     LEFT JOIN categories c ON c.id=r.category_id
     WHERE r.active=1 AND r.next_date<=?
     ORDER BY r.next_date ASC`,
    [limit]
  );

  const recurring = (recurringR.rows._array || []).map((r) => ({
    kind: "recurring",
    id: r.id,
    title: r.name,
    amount: r.amount,
    dueDate: r.next_date,
    accountName: r.account_name,
    subtitle: `${r.type === "income" ? "Ingreso recurrente" : "Membresía / pago recurrente"}${r.category_name ? " · " + r.category_name : ""}`,
    daysLeft: daysBetween(today, r.next_date),
  }));

  const loanR = await run(
    `SELECT li.id, li.loan_id, li.number, li.due_date, li.amount, li.paid_amount, li.status,
            l.person, l.direction
     FROM loan_installments li
     JOIN loans l ON l.id=li.loan_id
     WHERE l.status='open' AND li.status!='paid' AND li.due_date<=?
     ORDER BY li.due_date ASC, li.number ASC`,
    [limit]
  );

  const loans = (loanR.rows._array || []).map((r) => ({
    kind: "loan_installment",
    id: r.id,
    loanId: r.loan_id,
    title: `${r.direction === "i_owe" ? "Pagar" : "Cobrar"}: ${r.person}`,
    amount: Math.max(0, (r.amount || 0) - (r.paid_amount || 0)),
    dueDate: r.due_date,
    subtitle: `Cuota ${r.number} · ${r.direction === "i_owe" ? "deuda por pagar" : "dinero por cobrar"}`,
    daysLeft: daysBetween(today, r.due_date),
  }));

  return [...recurring, ...loans].sort((a, b) => {
    if (a.dueDate === b.dueDate) return String(a.kind).localeCompare(String(b.kind));
    return String(a.dueDate).localeCompare(String(b.dueDate));
  });
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
  const liquidity = await getLiquiditySummary();
  const totalCash = liquidity.total;

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
