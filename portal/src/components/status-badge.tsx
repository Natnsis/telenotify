import type { MessageStatus } from '@/lib/types';
import { Badge } from './ui';

const tones: Record<MessageStatus, 'gray' | 'green' | 'amber' | 'red' | 'blue'> = {
  QUEUED: 'gray',
  SENT: 'green',
  UNDELIVERABLE: 'amber',
  FAILED: 'red',
  RECEIVED: 'blue',
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return (
    <Badge tone={tones[status]} dot>
      {status.toLowerCase()}
    </Badge>
  );
}
