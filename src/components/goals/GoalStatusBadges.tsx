import { Badge } from '@/components/ui/badge';
import type { GoalStatus, SheetStatus } from '@/types/goals';
import { cn } from '@/lib/utils';

// ── Goal-level status badge ──────────────────────────────────
interface GoalStatusBadgeProps {
  status: GoalStatus;
  className?: string;
}

export function GoalStatusBadge({ status, className }: GoalStatusBadgeProps) {
  const config: Record<GoalStatus, { label: string; variant: string }> = {
    not_started: { label: 'Not Started', variant: 'bg-gray-100 text-gray-600 border-gray-200' },
    on_track:    { label: 'On Track',    variant: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed:   { label: 'Completed',   variant: 'bg-green-100 text-green-700 border-green-200' },
  };

  const { label, variant } = config[status] ?? config.not_started;

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      variant, className
    )}>
      {label}
    </span>
  );
}

// ── Goal Sheet status badge ──────────────────────────────────
interface GoalSheetStatusBadgeProps {
  status: SheetStatus;
  className?: string;
}

export function GoalSheetStatusBadge({ status, className }: GoalSheetStatusBadgeProps) {
  const config: Record<SheetStatus, { label: string; variant: string; emoji: string }> = {
    draft:     { label: 'Draft',     emoji: '📝', variant: 'bg-gray-100 text-gray-600 border-gray-200' },
    submitted: { label: 'Submitted', emoji: '⏳', variant: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved:  { label: 'Approved',  emoji: '✅', variant: 'bg-green-100 text-green-700 border-green-200' },
    rework:    { label: 'Rework',    emoji: '🔄', variant: 'bg-red-100 text-red-700 border-red-200' },
  };

  const { label, emoji, variant } = config[status] ?? config.draft;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
      variant, className
    )}>
      <span>{emoji}</span>
      {label}
    </span>
  );
}

// ── Shared Goal badge ────────────────────────────────────────
interface SharedGoalBadgeProps {
  pushedByName?: string;
  className?: string;
}

export function SharedGoalBadge({ pushedByName, className }: SharedGoalBadgeProps) {
  return (
    <span
      title={pushedByName ? `Shared by ${pushedByName} — Title and Target are read-only` : 'Shared goal — read-only'}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        'bg-purple-100 text-purple-700 border-purple-200 cursor-default',
        className
      )}
    >
      🔗 Shared
    </span>
  );
}
