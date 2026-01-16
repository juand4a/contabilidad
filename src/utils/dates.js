export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function monthKey(dateISO) {
  return dateISO.slice(0, 7); // YYYY-MM
}
