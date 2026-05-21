import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  extra?: ReactNode;
  description?: ReactNode;
}

export function PageHeader({ title, subtitle, extra, description }: Props) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              color: '#111827',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>{subtitle}</div>
          )}
        </div>
        {extra && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{extra}</div>}
      </div>
      {description && (
        <div style={{ marginTop: 8, color: '#6B7280', fontSize: 13 }}>{description}</div>
      )}
    </div>
  );
}
