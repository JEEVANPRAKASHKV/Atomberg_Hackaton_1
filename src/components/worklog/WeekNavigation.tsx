import { format, isSameWeek, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekNavigationProps {
  currentWeekStart: Date;
  onPrevious: () => void;
  onNext: () => void;
  onGoToWeek: (date: Date) => void;
  onGoToCurrent: () => void;
}

export const WeekNavigation = ({
  currentWeekStart,
  onPrevious,
  onNext,
  onGoToWeek,
  onGoToCurrent,
}: WeekNavigationProps) => {
  const today = new Date();
  const isCurrentWeek = isSameWeek(currentWeekStart, today, { weekStartsOn: 1 });
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  const quickNavOptions = [
    { label: 'This Week', onClick: onGoToCurrent, active: isCurrentWeek },
    { label: 'Last Week', onClick: () => onGoToWeek(subWeeks(today, 1)), active: isSameWeek(currentWeekStart, subWeeks(today, 1), { weekStartsOn: 1 }) },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-center min-w-[200px]">
          <h2 className="text-lg font-semibold">
            {format(currentWeekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
        </div>
        
        <Button variant="outline" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {quickNavOptions.map((option) => (
          <Button
            key={option.label}
            variant={option.active ? 'default' : 'outline'}
            size="sm"
            onClick={option.onClick}
          >
            {option.label}
          </Button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Pick Week
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
            <Calendar
              mode="single"
              selected={currentWeekStart}
              onSelect={(date) => date && onGoToWeek(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
