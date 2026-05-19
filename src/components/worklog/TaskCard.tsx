import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Copy, ChevronDown, ChevronUp, User, Briefcase, Shield, Users } from 'lucide-react';
import { type WorkLogTask, getAssignmentBadgeConfig } from '@/types/worklog';
import { CategoryIcon } from './CategoryIcon';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: WorkLogTask;
  isEditable: boolean;
  currentManagerId?: string;
  onEdit: (task: WorkLogTask) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: WorkLogTask) => void;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const AssignmentIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'Self':
      return <User className="h-3 w-3" />;
    case 'Manager':
      return <Briefcase className="h-3 w-3" />;
    case 'Admin':
      return <Shield className="h-3 w-3" />;
    case 'Employee':
      return <Users className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
};

export const TaskCard = ({ task, isEditable, currentManagerId, onEdit, onDelete, onDuplicate }: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = task.description && task.description.length > 0;
  const hasReworkComment = task.rework_comment && task.rework_comment.length > 0;

  const isCurrentManager = currentManagerId === task.assigned_by_id;
  const assignmentConfig = getAssignmentBadgeConfig(task.assigned_by_type, isCurrentManager);

  return (
    <div 
      className={cn(
        "group border rounded-lg p-3 transition-all hover:shadow-sm",
        hasReworkComment && "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-1.5 rounded-md bg-muted flex-shrink-0">
            <CategoryIcon category={task.category} size="md" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">{task.task_title}</span>
              <Badge variant="secondary" className="text-xs font-mono">
                {formatDuration(task.duration_minutes)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground capitalize">{task.category}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <Badge variant="outline" className={cn("text-xs px-1.5 py-0 h-5 gap-1", assignmentConfig.className)}>
                <AssignmentIcon type={task.assigned_by_type} />
                {task.assigned_by_type === 'Self' 
                  ? 'Self-assigned' 
                  : isCurrentManager 
                    ? 'Assigned by you' 
                    : task.assigned_by?.full_name 
                      ? `${assignmentConfig.label}: ${task.assigned_by.full_name}`
                      : assignmentConfig.label
                }
              </Badge>
            </div>

            {hasDescription && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Hide details' : 'Show details'}
              </button>
            )}

            {expanded && hasDescription && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            {hasReworkComment && (
              <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-sm">
                <span className="font-medium text-orange-700 dark:text-orange-400">
                  Manager feedback: 
                </span>
                <span className="text-orange-600 dark:text-orange-300">
                  {task.rework_comment}
                </span>
              </div>
            )}
          </div>
        </div>

        {isEditable && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onEdit(task)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onDuplicate(task)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
