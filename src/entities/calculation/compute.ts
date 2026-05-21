import type { Decimal } from '@/shared/schemas';

const DECIMAL_PLACES = 2;

function parseDecimal(value: Decimal | string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function toDecimal(n: number): Decimal {
  if (!Number.isFinite(n)) return '0' as Decimal;
  return n.toFixed(DECIMAL_PLACES) as Decimal;
}

export function computeTotal(directCost: Decimal, coeff: Decimal): Decimal {
  const dc = parseDecimal(directCost);
  const c = parseDecimal(coeff);
  return toDecimal(dc * c);
}

export function formatMoney(value: Decimal | string | number, opts?: { compact?: boolean }): string {
  const n = typeof value === 'number' ? value : parseDecimal(value as Decimal);
  if (opts?.compact) {
    if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} млрд ₽`;
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} млн ₽`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)} тыс ₽`;
  }
  return n.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function parseMoney(input: string): Decimal {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return '0' as Decimal;
  return toDecimal(n);
}
