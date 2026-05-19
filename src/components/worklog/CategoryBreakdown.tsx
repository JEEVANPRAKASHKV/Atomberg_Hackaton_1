import { getCategoryConfig, type TaskCategory } from '@/types/worklog';
import { CategoryIcon } from './CategoryIcon';

interface CategoryBreakdownProps {
  breakdown: Record<TaskCategory, number>;
}

const formatDuration = (minutes: number): string => {
  if (minutes === 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const CategoryBreakdown = ({ breakdown }: CategoryBreakdownProps) => {
  const entries = Object.entries(breakdown)
    .filter(([_, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1]) as [TaskCategory, number][];

  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [_, mins]) => sum + mins, 0);

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Time by Category</h3>
      <div className="space-y-2">
        {entries.map(([category, minutes]) => {
          const percentage = (minutes / total) * 100;
          const config = getCategoryConfig(category);
          return (
            <div key={category} className="flex items-center gap-3">
              <div className="p-1 rounded bg-muted">
                <CategoryIcon category={category} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="truncate">{category}</span>
                  <span className="text-muted-foreground font-mono">{formatDuration(minutes)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${config.color.replace('text-', 'bg-')}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
