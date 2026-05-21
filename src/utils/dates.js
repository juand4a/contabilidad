export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(dateISO) {
  return String(dateISO || todayISO()).slice(0, 7); // YYYY-MM
}

export function parseISODate(dateISO, hour = 12, minute = 0) {
  const [y, m, d] = String(dateISO || todayISO()).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hour, minute, 0, 0);
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateISO, days) {
  const date = parseISODate(dateISO);
  date.setDate(date.getDate() + Number(days || 0));
  return toISODate(date);
}

export function addMonthsISO(dateISO, months) {
  const [y, m, d] = String(dateISO || todayISO()).split("-").map(Number);
  const targetMonth = (m || 1) - 1 + Number(months || 0);
  const first = new Date(y, targetMonth, 1, 12, 0, 0, 0);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(d || 1, lastDay));
  return toISODate(first);
}

export function daysBetween(fromISO, toISO) {
  const start = parseISODate(fromISO, 0, 0);
  const end = parseISODate(toISO, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export function buildReminderDate(dueDateISO, daysBefore = 1, hour = 9, minute = 0) {
  const reminderISO = addDaysISO(dueDateISO, -Math.max(0, Number(daysBefore || 0)));
  return parseISODate(reminderISO, hour, minute);
}
