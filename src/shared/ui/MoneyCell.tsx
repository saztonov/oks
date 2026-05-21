import { formatMoney } from '@/entities/calculation/compute';
import type { Decimal } from '@/shared/schemas';

interface Props {
  value: Decimal | string | number;
  compact?: boolean;
  muted?: boolean;
  bold?: boolean;
  align?: 'left' | 'right';
}

export function MoneyCell({ value, compact, muted, bold, align = 'right' }: Props) {
  return (
    <span
      style={{
        fontVariantNumeric: 'tabular-nums',
        color: muted ? '#9CA3AF' : '#111827',
        fontWeight: bold ? 600 : 400,
        textAlign: align,
        display: 'inline-block',
        width: align === 'right' ? '100%' : undefined,
      }}
    >
      {formatMoney(value, { compact })}
    </span>
  );
}
