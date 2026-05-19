// Work Log Types
import { LucideIcon, Calendar, Code, Bug, BookOpen, FileText, Palette, Search, BarChart3, Mail, Target } from 'lucide-react';

export interface WorkLogWeek {
  id: string;
  employee_id: string;
  week_start_date: string;
  week_end_date: string;
  total_minutes: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rework';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rework_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkLogTask {
  id: string;
  week_log_id: string;
  employee_id: string;
  log_date: string;
  day_status: 'Draft' | 'Submitted' | 'Approved' | 'Rework';
  task_title: string;
  category: TaskCategory;
  duration_minutes: number;
  assigned_by_type: 'Self' | 'Employee' | 'Manager' | 'Admin';
  assigned_by_id: string | null;
  description: string | null;
  rework_comment: string | null;
  created_at: string;
  updated_at: string;
  assigned_by?: {
    full_name: string;
  };
}

export type TaskCategory = 
  | 'Meeting' 
  | 'Development' 
  | 'Support' 
  | 'Learning' 
  | 'Documentation' 
  | 'Design' 
  | 'Review' 
  | 'Planning' 
  | 'Admin' 
  | 'Other';

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'Meeting', label: 'Meeting', icon: Calendar, color: 'text-blue-500' },
  { value: 'Development', label: 'Development', icon: Code, color: 'text-emerald-500' },
  { value: 'Support', label: 'Support', icon: Bug, color: 'text-red-500' },
  { value: 'Learning', label: 'Learning', icon: BookOpen, color: 'text-purple-500' },
  { value: 'Documentation', label: 'Documentation', icon: FileText, color: 'text-amber-500' },
  { value: 'Design', label: 'Design', icon: Palette, color: 'text-pink-500' },
  { value: 'Review', label: 'Review', icon: Search, color: 'text-cyan-500' },
  { value: 'Planning', label: 'Planning', icon: BarChart3, color: 'text-indigo-500' },
  { value: 'Admin', label: 'Admin', icon: Mail, color: 'text-slate-500' },
  { value: 'Other', label: 'Other', icon: Target, color: 'text-gray-500' },
];

export const getCategoryConfig = (category: TaskCategory) => {
  return TASK_CATEGORIES.find(c => c.value === category) || TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
};

export interface DayTasks {
  date: Date;
  dateStr: string;
  dayName: string;
  tasks: WorkLogTask[];
  totalMinutes: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rework' | 'NoEntry';
  reworkComment?: string | null;
}

export interface WeekSummary {
  totalMinutes: number;
  targetMinutes: number;
  categoryBreakdown: Record<TaskCategory, number>;
  daysWithEntries: number;
}

// Assignment type helpers
export type AssignmentType = 'Self' | 'Employee' | 'Manager' | 'Admin';

export const getAssignmentBadgeConfig = (type: AssignmentType, isCurrentManager: boolean = false) => {
  switch (type) {
    case 'Self':
      return { label: 'Self', className: 'bg-muted text-muted-foreground' };
    case 'Manager':
      return { 
        label: isCurrentManager ? 'You' : 'Manager', 
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
      };
    case 'Admin':
      return { label: 'Admin', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'Employee':
      return { label: 'Team', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    default:
      return { label: type, className: 'bg-muted text-muted-foreground' };
  }
};
