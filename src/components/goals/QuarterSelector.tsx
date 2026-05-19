import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { GoalCycle, QuarterType } from '@/types/goals';
import { isQuarterOpen } from '@/types/goals';

interface QuarterSelectorProps {
  cycle: GoalCycle;
  value: QuarterType;
  onChange: (q: QuarterType) => void;
  className?: string;
}

const QUARTERS: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const QUARTER_FIELD: Record<QuarterType, keyof GoalCycle> = {
  Q1: 'q1_opens',
  Q2: 'q2_opens',
  Q3: 'q3_opens',
  Q4: 'q4_opens',
};

export function QuarterSelector({ cycle, value, onChange, className }: QuarterSelectorProps) {
  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {QUARTERS.map((q) => {
        const opensDate = new Date(cycle[QUARTER_FIELD[q]] as string);
        const open = isQuarterOpen(cycle, q);
        const isSelected = value === q;
        const notYetOpen = new Date() < opensDate;

        return (
          <button
            key={q}
            type="button"
            disabled={notYetOpen}
            onClick={() => onChange(q)}
            title={
              notYetOpen
                ? `Opens on ${format(opensDate, 'dd MMM yyyy')}`
                : open
                ? `${q} window is currently open`
                : `${q} window has closed`
            }
            className={cn(
              'relative px-5 py-2 rounded-lg text-sm font-semibold border transition-all duration-150',
              isSelected
                ? 'bg-primary text-primary-foreground border-primary shadow'
                : open
                ? 'bg-background border-primary/40 text-primary hover:bg-primary/10'
                : notYetOpen
                ? 'bg-muted border-muted text-muted-foreground cursor-not-allowed opacity-60'
                : 'bg-muted/40 border-muted text-muted-foreground cursor-default'
            )}
          >
            {q}
            {open && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
