import { Upload, Button, List, App, Tooltip, Empty } from 'antd';
import type { UploadProps } from 'antd';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import { v4 as uuid } from '@/shared/lib/uuid';
import { saveAttachmentBlob, getAttachmentUrl, deleteAttachmentBlob } from '@/services/attachments';
import { useAddAttachment, useRemoveAttachment } from '@/services/hooks';
import { useCurrentUser } from '@/app/stores/uiStore';
import type { Attachment, CalcVersionId, UserId } from '@/shared/schemas';
import { formatDateTime } from '@/shared/lib/format';

interface Props {
  versionId: CalcVersionId;
  attachments: Attachment[];
  editable: boolean;
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

export function AttachmentsList({ versionId, attachments, editable }: Props) {
  const user = useCurrentUser();
  const add = useAddAttachment();
  const remove = useRemoveAttachment();
  const { message, modal } = App.useApp();

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const f = file as File;
        const id = uuid();
        await saveAttachmentBlob(id, f);
        add.mutate(
          {
            versionId,
            attachment: {
              fileName: f.name,
              mimeType: f.type || 'application/octet-stream',
              size: f.size,
              kind: 'file',
              storageKey: `idb://${id}`,
            },
            uploadedBy: (user?.id ?? '') as UserId,
          },
          {
            onSuccess: () => {
              message.success(`Файл «${f.name}» прикреплён`);
              onSuccess?.('ok');
            },
            onError: (e: unknown) => {
              message.error('Не удалось добавить файл');
              onError?.(e as Error);
            },
          },
        );
      } catch (e) {
        message.error('Ошибка загрузки');
        onError?.(e as Error);
      }
    },
  };

  async function handleDownload(a: Attachment) {
    if (a.kind === 'url') {
      window.open(a.storageKey, '_blank');
      return;
    }
    const id = a.storageKey.replace(/^idb:\/\//, '');
    const url = await getAttachmentUrl(id);
    if (!url) {
      message.error('Файл не найден');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = a.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleDelete(a: Attachment) {
    modal.confirm({
      title: `Удалить файл «${a.fileName}»?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (a.kind === 'file') {
          await deleteAttachmentBlob(a.storageKey.replace(/^idb:\/\//, ''));
        }
        remove.mutate(
          { versionId, attachmentId: a.id },
          { onSuccess: () => message.success('Удалено') },
        );
      },
    });
  }

  return (
    <div>
      {editable && (
        <Upload.Dragger
          {...uploadProps}
          style={{ marginBottom: 16, background: '#FAFBFC' }}
        >
          <p style={{ margin: 0, color: '#6B7280' }}>
            <Paperclip size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            Нажмите или перетащите файлы сюда
          </p>
          <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: 12 }}>
            Excel, PDF, изображения. Хранятся локально (IndexedDB).
          </p>
        </Upload.Dragger>
      )}
      {attachments.length === 0 ? (
        <Empty description="Файлов пока нет" />
      ) : (
        <List
          dataSource={attachments}
          renderItem={(a) => (
            <List.Item
              actions={[
                <Tooltip title="Скачать" key="dl">
                  <Button
                    type="text"
                    icon={<Download size={16} />}
                    onClick={() => handleDownload(a)}
                  />
                </Tooltip>,
                editable ? (
                  <Tooltip title="Удалить" key="rm">
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 size={16} />}
                      onClick={() => handleDelete(a)}
                    />
                  </Tooltip>
                ) : null,
              ].filter(Boolean) as React.ReactNode[]}
            >
              <List.Item.Meta
                avatar={<Paperclip size={20} style={{ color: '#6B7280', marginTop: 6 }} />}
                title={a.fileName}
                description={
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {fileSize(a.size)} · {formatDateTime(a.uploadedAt)}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
