import { get, set, del, keys } from 'idb-keyval';

const PREFIX = 'oks-attach:';

export async function saveAttachmentBlob(id: string, file: File): Promise<void> {
  await set(`${PREFIX}${id}`, file);
}

export async function loadAttachmentBlob(id: string): Promise<Blob | undefined> {
  return get<Blob>(`${PREFIX}${id}`);
}

export async function deleteAttachmentBlob(id: string): Promise<void> {
  await del(`${PREFIX}${id}`);
}

export async function listAttachmentKeys(): Promise<string[]> {
  const all = await keys();
  return all
    .filter((k): k is string => typeof k === 'string' && k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length));
}

export async function getAttachmentUrl(id: string): Promise<string | null> {
  const blob = await loadAttachmentBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
