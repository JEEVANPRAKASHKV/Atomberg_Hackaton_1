import { cn } from '@/lib/utils';
import type { WeekSummary } from '@/types/worklog';

interface WeekProgressBarProps {
  summary: WeekSummary;
}

export const WeekProgressBar = ({ summary }: WeekProgressBarProps) => {
  const { totalMinutes, targetMinutes } = summary;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const targetHours = targetMinutes / 60;
  const percentage = Math.min((totalMinutes / targetMinutes) * 100, 100);

  // Color based on progress
  const getProgressColor = () => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Week Summary</span>
        <span className={cn('text-lg font-bold', getTextColor())}>
          {hours}h {mins > 0 ? `${mins}m` : ''} / {targetHours}h ({Math.round(percentage)}%)
        </span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>{summary.daysWithEntries} days logged</span>
        {percentage < 100 && (
          <span>{Math.ceil((targetMinutes - totalMinutes) / 60)}h remaining</span>
        )}
      </div>
    </div>
  );
};
