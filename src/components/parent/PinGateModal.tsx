import Sheet from '../ui/Sheet';
import PinGate from './PinGate';

interface PinGateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PinGateModal({ open, onClose, onSuccess }: PinGateModalProps) {
  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="학부모 모드 잠금 해제">
      <PinGate isModal onSuccess={handleSuccess} />
    </Sheet>
  );
}
