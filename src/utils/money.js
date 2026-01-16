export function formatCOP(value) {
  const n = Number(value || 0);
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export function parseCOP(text) {
  // "1.234.567" -> 1234567
  if (!text) return 0;
  const clean = String(text).replace(/[^\d-]/g, "");
  return Number(clean || 0);
}
