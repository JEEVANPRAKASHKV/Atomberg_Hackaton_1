import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus, Send, AlertCircle } from 'lucide-react';
import { DayStatusBadge } from './DayStatusBadge';
import { TaskCard } from './TaskCard';
import { AddTaskForm } from './AddTaskForm';
import type { DayTasks, WorkLogTask, TaskCategory } from '@/types/worklog';

interface DaySectionProps {
  day: DayTasks;
  employees: { id: string; full_name: string; role: string }[];
  managerId?: string;
  isEditable: boolean;
  saving: boolean;
  onAddTask: (data: {
    log_date: string;
    task_title: string;
    category: TaskCategory;
    duration_minutes: number;
    assigned_by_type: 'Self' | 'Employee' | 'Manager' | 'Admin';
    assigned_by_id: string | null;
    description: string | null;
  }) => Promise<boolean>;
  onUpdateTask: (taskId: string, updates: Partial<WorkLogTask>) => Promise<boolean>;
  onDeleteTask: (taskId: string) => Promise<boolean>;
  onSubmitDay: (date: string) => Promise<boolean>;
}

const formatDuration = (minutes: number): string => {
  if (minutes === 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const DaySection = ({
  day,
  employees,
  managerId,
  isEditable,
  saving,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onSubmitDay,
}: DaySectionProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkLogTask | null>(null);
  const [duplicatingTask, setDuplicatingTask] = useState<WorkLogTask | null>(null);

  const canEdit = isEditable && (day.status === 'Draft' || day.status === 'Rework' || day.status === 'NoEntry');
  const canSubmit = day.tasks.length > 0 && (day.status === 'Draft' || day.status === 'Rework');

  const handleDuplicate = (task: WorkLogTask) => {
    setDuplicatingTask(task);
    setShowAddForm(true);
  };

  const handleSaveTask = async (data: Parameters<typeof onAddTask>[0]) => {
    const success = await onAddTask(data);
    if (success) {
      setDuplicatingTask(null);
    }
    return success;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Day Header */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold">{day.dayName}, {format(day.date, 'MMM d')}</h3>
            <p className="text-sm text-muted-foreground">{formatDuration(day.totalMinutes)}</p>
          </div>
          <DayStatusBadge status={day.status} />
        </div>

        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onSubmitDay(day.dateStr)}
              disabled={saving}
            >
              <Send className="h-4 w-4 mr-2" />
              Submit {day.dayName}
            </Button>
          )}
        </div>
      </div>

      {/* Rework Alert */}
      {day.status === 'Rework' && day.reworkComment && (
        <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Rework Required</p>
            <p className="text-sm text-orange-600 dark:text-orange-300">{day.reworkComment}</p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="p-4 space-y-3">
        {day.tasks.length === 0 && !showAddForm && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No tasks for {day.dayName} yet.</p>
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first task
              </Button>
            )}
          </div>
        )}

        {day.tasks.map((task) => (
          editingTask?.id === task.id ? (
            <AddTaskForm
              key={task.id}
              dateStr={day.dateStr}
              employees={employees}
              managerId={managerId}
              editingTask={task}
              onSave={handleSaveTask}
              onUpdate={onUpdateTask}
              onCancel={() => setEditingTask(null)}
              saving={saving}
            />
          ) : (
            <TaskCard
              key={task.id}
              task={task}
              isEditable={canEdit}
              onEdit={setEditingTask}
              onDelete={onDeleteTask}
              onDuplicate={handleDuplicate}
            />
          )
        ))}

        {/* Add Task Form */}
        {showAddForm && (
          <AddTaskForm
            dateStr={day.dateStr}
            employees={employees}
            managerId={managerId}
            editingTask={duplicatingTask ? { ...duplicatingTask, id: '', log_date: day.dateStr } as WorkLogTask : null}
            onSave={handleSaveTask}
            onCancel={() => {
              setShowAddForm(false);
              setDuplicatingTask(null);
            }}
            saving={saving}
          />
        )}

        {/* Add Task Button */}
        {canEdit && day.tasks.length > 0 && !showAddForm && (
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>
    </div>
  );
};
