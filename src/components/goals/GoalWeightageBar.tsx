import { cn } from '@/lib/utils';

interface GoalWeightageBarProps {
  goals: { weightage: number }[];
  className?: string;
}

export function GoalWeightageBar({ goals, className }: GoalWeightageBarProps) {
  const total = goals.reduce((sum, g) => sum + (g.weightage || 0), 0);
  const rounded = Math.round(total);
  const pct = Math.min(total, 100);

  const isOver = rounded > 100;
  const isExact = rounded === 100;
  const remaining = 100 - rounded;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm font-medium">
        <span className={cn(
          isOver ? 'text-red-600' : isExact ? 'text-green-600' : 'text-amber-600'
        )}>
          Total Weightage: {rounded}%
        </span>
        {!isExact && (
          <span className="text-muted-foreground text-xs">
            {isOver ? `${rounded - 100}% over limit` : `${remaining}% remaining`}
          </span>
        )}
        {isExact && (
          <span className="text-green-600 text-xs font-semibold">✓ Ready to submit</span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isOver ? 'bg-red-500' : isExact ? 'bg-green-500' : 'bg-amber-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Segment markers */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
