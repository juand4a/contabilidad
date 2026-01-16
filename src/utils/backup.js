import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

// En Expo managed, no es trivial copiar el archivo sqlite interno sin plugins nativos.
// Solución práctica offline: "backup lógico" (exportar tablas a JSON).
import { run } from "../db/db";

export async function exportBackupJSON() {
  const tables = ["accounts","categories","tags","transactions","transaction_splits","transaction_tags","loans","loan_payments","budgets","goals","recurring","settings"];
  const data = {};
  for (const t of tables) {
    const r = await run(`SELECT * FROM ${t}`);
    data[t] = r.rows._array;
  }
  return { version: 1, exported_at: new Date().toISOString(), data };
}

export async function shareBackup() {
  const backup = await exportBackupJSON();
  const uri = FileSystem.documentDirectory + `backup_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup), { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri);
}

export async function restoreBackupFromUri(uri) {
  const s = await FileSystem.readAsStringAsync(uri);
  const parsed = JSON.parse(s);
  const data = parsed.data;

  // limpia e inserta (orden importa por FKs)
  await run(`PRAGMA foreign_keys = OFF;`);
  const del = ["transaction_tags","transaction_splits","loan_payments","transactions","loans","budgets","goals","recurring","tags","categories","accounts","settings"];
  for (const t of del) await run(`DELETE FROM ${t}`);

  const ins = async (t, rows) => {
    if (!rows?.length) return;
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => "?").join(",");
    for (const row of rows) {
      await run(
        `INSERT INTO ${t}(${cols.join(",")}) VALUES (${placeholders})`,
        cols.map((c) => row[c])
      );
    }
  };

  await ins("accounts", data.accounts);
  await ins("categories", data.categories);
  await ins("tags", data.tags);
  await ins("transactions", data.transactions);
  await ins("transaction_splits", data.transaction_splits);
  await ins("transaction_tags", data.transaction_tags);
  await ins("loans", data.loans);
  await ins("loan_payments", data.loan_payments);
  await ins("budgets", data.budgets);
  await ins("goals", data.goals);
  await ins("recurring", data.recurring);
  await ins("settings", data.settings);

  await run(`PRAGMA foreign_keys = ON;`);
}
