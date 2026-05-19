import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { GoalCycle } from '@/types/goals';
import { getActiveQuarter } from '@/types/goals';

interface CheckInWindowBannerProps {
  cycle: GoalCycle;
  className?: string;
}

const QUARTER_FIELDS = {
  Q1: 'q1_opens',
  Q2: 'q2_opens',
  Q3: 'q3_opens',
  Q4: 'q4_opens',
} as const;

const NEXT_QUARTER = { Q1: 'Q2', Q2: 'Q3', Q3: 'Q4', Q4: null } as const;

export function CheckInWindowBanner({ cycle, className }: CheckInWindowBannerProps) {
  const now = new Date();
  const activeQ = getActiveQuarter(cycle);

  if (cycle.status === 'closed') {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-3', className)}>
        <span className="text-lg">🔒</span>
        <div>
          <p className="text-sm font-semibold text-foreground">Cycle Closed</p>
          <p className="text-xs text-muted-foreground">The {cycle.cycle_name} cycle has been closed by HR.</p>
        </div>
      </div>
    );
  }

  // Before Q1 opens
  const q1Opens = new Date(cycle.q1_opens);
  if (now < q1Opens) {
    const daysUntil = differenceInDays(q1Opens, now);
    return (
      <div className={cn('flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3', className)}>
        <span className="text-lg">📅</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">Goal Setting Window Open</p>
          <p className="text-xs text-amber-700">
            Q1 check-in opens in <strong>{daysUntil} day{daysUntil !== 1 ? 's' : ''}</strong> — on {format(q1Opens, 'dd MMM yyyy')}.
          </p>
        </div>
      </div>
    );
  }

  // Active quarter banner
  if (activeQ) {
    const nextQ = NEXT_QUARTER[activeQ];
    const closingDate = nextQ
      ? new Date(cycle[QUARTER_FIELDS[nextQ]])
      : null;
    const daysLeft = closingDate ? differenceInDays(closingDate, now) : null;
    const isUrgent = daysLeft !== null && daysLeft <= 7;

    return (
      <div className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        isUrgent
          ? 'border-red-200 bg-red-50'
          : 'border-green-200 bg-green-50',
        className
      )}>
        <span className="text-lg">{isUrgent ? '⚠️' : '✅'}</span>
        <div className="flex-1">
          <p className={cn('text-sm font-semibold', isUrgent ? 'text-red-800' : 'text-green-800')}>
            {activeQ} Check-In Window is Open
          </p>
          <p className={cn('text-xs', isUrgent ? 'text-red-700' : 'text-green-700')}>
            {closingDate
              ? `Window closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — ${format(closingDate, 'dd MMM yyyy')}`
              : 'This is the final quarter — window remains open until cycle is closed by HR.'}
          </p>
        </div>
        <div className="flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </div>
      </div>
    );
  }

  return null;
}
