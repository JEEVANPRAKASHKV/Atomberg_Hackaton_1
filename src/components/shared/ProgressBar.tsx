import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  expected?: number;
  showLabels?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  expected = 80, 
  showLabels = true,
  className 
}) => {
  const getColor = (val: number, exp: number) => {
    if (val >= exp) return 'bg-efficiency-high';
    if (val >= exp - 15) return 'bg-efficiency-medium';
    return 'bg-efficiency-low';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {showLabels && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Actual: {value}%</span>
          <span className="text-muted-foreground">Expected: {expected}%</span>
        </div>
      )}
      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
        {/* Expected marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
          style={{ left: `${expected}%` }}
        />
        {/* Progress */}
        <div 
          className={cn('h-full rounded-full transition-all duration-500', getColor(value, expected))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
};
