import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EfficiencyDotProps {
  value: number;
  expected?: number;
  date?: string;
  showTooltip?: boolean;
}

export const EfficiencyDot: React.FC<EfficiencyDotProps> = ({ 
  value, 
  expected = 80, 
  date,
  showTooltip = true 
}) => {
  const getEfficiencyLevel = (val: number, exp: number) => {
    if (val >= exp) return 'high';
    if (val >= exp - 15) return 'medium';
    return 'low';
  };

  const level = getEfficiencyLevel(value, expected);
  
  const dot = (
    <div 
      className={cn(
        'efficiency-dot',
        level === 'high' && 'efficiency-high',
        level === 'medium' && 'efficiency-medium',
        level === 'low' && 'efficiency-low'
      )}
    />
  );

  if (!showTooltip) return dot;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {dot}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          {date && <span className="font-medium">{date}: </span>}
          {value}% (Expected: {expected}%)
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
