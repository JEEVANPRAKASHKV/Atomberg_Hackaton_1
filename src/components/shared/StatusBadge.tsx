import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'present' | 'absent' | 'partial' | 'pending' | 'approved' | 'rejected';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const statusStyles = {
    present: 'status-present',
    approved: 'status-present',
    absent: 'status-absent',
    rejected: 'status-absent',
    partial: 'status-partial',
    pending: 'status-pending',
  };

  const statusLabels = {
    present: 'Present',
    absent: 'Absent',
    partial: 'Partial',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span className={cn('status-badge', statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
};
