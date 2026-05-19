import { Badge } from '@/components/ui/badge';
import { Check, RefreshCw, Clock, FileEdit } from 'lucide-react';
import type { DayTasks } from '@/types/worklog';

interface DayStatusBadgeProps {
  status: DayTasks['status'];
  className?: string;
}

export const DayStatusBadge = ({ status, className }: DayStatusBadgeProps) => {
  const config = {
    Draft: {
      label: 'Draft',
      className: 'bg-muted text-muted-foreground border-muted',
      icon: FileEdit,
    },
    Submitted: {
      label: 'Submitted',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      icon: Clock,
    },
    Approved: {
      label: 'Approved',
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
      icon: Check,
    },
    Rework: {
      label: 'Rework',
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      icon: RefreshCw,
    },
    NoEntry: {
      label: 'No Entry',
      className: 'bg-muted/50 text-muted-foreground border-muted',
      icon: null,
    },
  };

  const { label, className: badgeClass, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={`${badgeClass} ${className} gap-1`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </Badge>
  );
};
