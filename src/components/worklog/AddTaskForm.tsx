import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';
import { TASK_CATEGORIES, type TaskCategory, type WorkLogTask } from '@/types/worklog';
import { CategoryIcon } from './CategoryIcon';

interface AddTaskFormProps {
  dateStr: string;
  employees: { id: string; full_name: string; role: string }[];
  managerId?: string;
  editingTask?: WorkLogTask | null;
  onSave: (data: {
    log_date: string;
    task_title: string;
    category: TaskCategory;
    duration_minutes: number;
    assigned_by_type: 'Self' | 'Employee' | 'Manager' | 'Admin';
    assigned_by_id: string | null;
    description: string | null;
  }) => Promise<boolean>;
  onUpdate?: (taskId: string, updates: Partial<WorkLogTask>) => Promise<boolean>;
  onCancel: () => void;
  saving: boolean;
}

export const AddTaskForm = ({
  dateStr,
  employees,
  managerId,
  editingTask,
  onSave,
  onUpdate,
  onCancel,
  saving,
}: AddTaskFormProps) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Development');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [assignedByType, setAssignedByType] = useState<'Self' | 'Employee' | 'Manager' | 'Admin'>('Self');
  const [assignedById, setAssignedById] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingTask) {
      setTaskTitle(editingTask.task_title);
      setCategory(editingTask.category);
      setDurationMinutes(editingTask.duration_minutes);
      setAssignedByType(editingTask.assigned_by_type);
      setAssignedById(editingTask.assigned_by_id);
      setDescription(editingTask.description || '');
    }
  }, [editingTask]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!taskTitle.trim()) {
      newErrors.taskTitle = 'Task title is required';
    }
    
    if (durationMinutes <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    if (assignedByType !== 'Self' && !assignedById) {
      newErrors.assignedBy = 'Please select who assigned this task';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      log_date: dateStr,
      task_title: taskTitle.trim(),
      category,
      duration_minutes: durationMinutes,
      assigned_by_type: assignedByType,
      assigned_by_id: assignedByType === 'Self' ? null : assignedById,
      description: description.trim() || null,
    };

    let success = false;
    if (editingTask && onUpdate) {
      success = await onUpdate(editingTask.id, data);
    } else {
      success = await onSave(data);
    }

    if (success) {
      onCancel();
    }
  };

  const managers = employees.filter(e => e.role === 'Manager');
  const admins = employees.filter(e => e.role === 'Admin');

  const formatDurationDisplay = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${mins}m`;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{editingTask ? 'Edit Task' : 'Add New Task'}</h4>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="taskTitle">Task Title *</Label>
          <Input
            id="taskTitle"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Enter task title"
            className={errors.taskTitle ? 'border-destructive' : ''}
          />
          {errors.taskTitle && <p className="text-xs text-destructive mt-1">{errors.taskTitle}</p>}
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {TASK_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <span className="flex items-center gap-2">
                    <CategoryIcon category={cat.value} size="sm" />
                    <span>{cat.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration">Duration (minutes) *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="duration"
              type="number"
              min={1}
              max={960}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              className={errors.duration ? 'border-destructive' : ''}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              = {formatDurationDisplay(durationMinutes)}
            </span>
          </div>
          {errors.duration && <p className="text-xs text-destructive mt-1">{errors.duration}</p>}
        </div>

        <div>
          <Label htmlFor="assignedByType">Assigned By</Label>
          <Select value={assignedByType} onValueChange={(v) => {
            setAssignedByType(v as typeof assignedByType);
            if (v === 'Self') setAssignedById(null);
            else if (v === 'Manager' && managerId) setAssignedById(managerId);
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Self">Self</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Employee">Other Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {assignedByType !== 'Self' && (
          <div>
            <Label htmlFor="assignedById">Select {assignedByType}</Label>
            <Select value={assignedById || ''} onValueChange={setAssignedById}>
              <SelectTrigger>
                <SelectValue placeholder={`Select ${assignedByType.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {(assignedByType === 'Manager' ? managers :
                  assignedByType === 'Admin' ? admins : employees
                ).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assignedBy && <p className="text-xs text-destructive mt-1">{errors.assignedBy}</p>}
          </div>
        )}

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details about this task..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : (editingTask ? 'Update Task' : 'Save Task')}
        </Button>
      </div>
    </form>
  );
};
