import { cn } from '@/lib/utils';
import type { Goal, GoalCheckin } from '@/types/goals';
import { computeGoalScore } from '@/types/goals';

interface UoMScoreDisplayProps {
  goal: Goal;
  checkin?: GoalCheckin;
  showLabel?: boolean;
  className?: string;
}

const UOM_LABELS: Record<string, { label: string; hint: string }> = {
  min:      { label: 'Higher is Better',  hint: 'Score = Actual ÷ Target × 100' },
  max:      { label: 'Lower is Better',   hint: 'Score = Target ÷ Actual × 100' },
  timeline: { label: 'Date-Based',        hint: 'On or before deadline = 100%' },
  zero:     { label: 'Zero = Success',    hint: 'Actual must be 0 for 100% score' },
};

export function UoMScoreDisplay({ goal, checkin, showLabel = true, className }: UoMScoreDisplayProps) {
  const score = checkin ? computeGoalScore(goal, checkin) : null;
  const uomInfo = UOM_LABELS[goal.uom_type];

  const scoreColor = score === null
    ? 'text-muted-foreground'
    : score >= 100 ? 'text-green-600'
    : score >= 70  ? 'text-amber-600'
    : 'text-red-600';

  const barColor = score === null
    ? 'bg-muted'
    : score >= 100 ? 'bg-green-500'
    : score >= 70  ? 'bg-amber-400'
    : 'bg-red-500';

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            title={uomInfo?.hint}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border text-xs cursor-help"
          >
            📏 {uomInfo?.label ?? goal.uom_type}
          </span>
        </div>
      )}

      {score !== null ? (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn('font-semibold', scoreColor)}>{Math.round(score)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${Math.min(score, 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No check-in data yet</p>
      )}
    </div>
  );
}
