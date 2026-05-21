import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ru');

export function formatDate(iso: string | null | undefined, fmt = 'DD.MM.YYYY'): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  if (!d.isValid()) return '—';
  return d.format(fmt);
}

export function formatDateTime(iso: string | null | undefined): string {
  return formatDate(iso, 'DD.MM.YYYY, HH:mm');
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  if (!d.isValid()) return '—';
  return d.fromNow();
}

export function daysBetween(from: string, to: string = new Date().toISOString()): number {
  const a = dayjs(from);
  const b = dayjs(to);
  if (!a.isValid() || !b.isValid()) return 0;
  return Math.abs(b.diff(a, 'day'));
}
