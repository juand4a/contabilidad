const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value = 0) {
  const n = Number(value || 0);
  return currencyFormatter.format(Number.isFinite(n) ? n : 0);
}

export function parseCOP(text) {
  if (text === null || text === undefined || text === "") return 0;

  const clean = String(text).replace(/[^\d-]/g, "");
  const n = Number(clean || 0);

  return Number.isFinite(n) ? n : 0;
}

const moneyUtils = {
  formatCOP,
  parseCOP,
};

export default moneyUtils;