import * as SQLite from "expo-sqlite";

let _db = null;

export async function getDb() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("personal_accounting.db");
  return _db;
}

function makeRows(array) {
  const arr = Array.isArray(array) ? array : [];
  return {
    _array: arr,
    length: arr.length,
    item: (i) => arr[i],
  };
}

export async function run(sql, params = []) {
  const db = await getDb();
  const t = String(sql).trim().toUpperCase();

  const isSelectLike =
    t.startsWith("SELECT") || t.startsWith("PRAGMA") || t.startsWith("WITH") || t.startsWith("EXPLAIN");

  try {
    if (isSelectLike) {
      const rows = await db.getAllAsync(sql, params);
      return { rows: makeRows(rows), insertId: undefined, rowsAffected: 0 };
    }

    const res = await db.runAsync(sql, params);
    return {
      rows: makeRows([]),
      insertId: res?.lastInsertRowId,
      rowsAffected: res?.changes ?? 0,
    };
  } catch (e) {
    console.log("SQL ERROR:", e, "\nSQL:", sql, "\nPARAMS:", params);
    throw e;
  }
}
