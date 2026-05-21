interface Props {
  name: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function ObjectBadge({ name, color = '#6B7280', size = 'md' }: Props) {
  const pad = size === 'sm' ? '1px 8px' : '2px 10px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: pad,
        borderRadius: 6,
        backgroundColor: `${color}14`,
        color,
        fontSize: fs,
        fontWeight: 600,
        lineHeight: 1.4,
        border: `1px solid ${color}33`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {name}
    </span>
  );
}
