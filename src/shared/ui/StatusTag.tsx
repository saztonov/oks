import { Tag } from 'antd';
import type { StatusCode } from '@/shared/schemas';
import { STATUS_COLOR, STATUS_LABEL } from '@/shared/schemas';

interface Props {
  status: StatusCode;
  small?: boolean;
  multiline?: boolean;
}

export function StatusTag({ status, small, multiline = false }: Props) {
  const c = STATUS_COLOR[status];
  const label = STATUS_LABEL[status];
  return (
    <Tag
      style={{
        backgroundColor: c.bg,
        color: c.text,
        borderColor: c.border,
        fontSize: small ? 11 : 12,
        padding: small ? '2px 6px' : '4px 10px',
        borderRadius: 6,
        fontWeight: 500,
        margin: 0,
        lineHeight: 1.2,
        whiteSpace: multiline ? 'normal' : 'nowrap',
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {multiline
        ? label.split(' ').map((w, i) => (
            <span key={i} style={{ display: 'block' }}>
              {w}
            </span>
          ))
        : label}
    </Tag>
  );
}
