import Sheet from './Sheet';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = '확인', danger, onConfirm, onClose }: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="whitespace-pre-line text-sm leading-6 text-ink-soft">{message}</p>
    </Sheet>
  );
}
