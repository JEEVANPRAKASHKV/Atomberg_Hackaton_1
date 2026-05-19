import { getCategoryConfig, type TaskCategory } from '@/types/worklog';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  category: TaskCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const CategoryIcon = ({ category, size = 'md', showLabel = false, className }: CategoryIconProps) => {
  const config = getCategoryConfig(category);
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className={cn(sizeMap[size], config.color)} />
      {showLabel && <span className="text-sm">{config.label}</span>}
    </span>
  );
};
