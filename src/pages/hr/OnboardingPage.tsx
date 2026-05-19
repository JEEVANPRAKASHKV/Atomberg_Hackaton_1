import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, UserPlus, FileText, BookOpen, CheckCircle2, Clock, AlertCircle, Trash2, ChevronDown, ChevronRight, Settings, Key, Package, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface OnboardingTask {
  id: string;
  employee_id: string;
  task_title: string;
  task_description: string | null;
  category: string;
  task_order: number;
  is_mandatory: boolean | null;
  status: string | null;
  completed_at: string | null;
  document_url: string | null;
  created_at: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
  joining_date: string | null;
}

const TASK_CATEGORIES = ['Documents', 'Training', 'Profile Setup', 'Equipment', 'Access Setup', 'Other'] as const;

const DEFAULT_ONBOARDING_TASKS = [
  { title: 'Onboarding Letter and NDA - Signed', description: 'Upload signed onboarding letter and Non-Disclosure Agreement', category: 'Documents', order: 1, mandatory: true },
  { title: 'ID Proof', description: 'Submit government-issued ID proof (Aadhaar/Passport/Driving License)', category: 'Documents', order: 2, mandatory: true },
  { title: 'PAN Card', description: 'Upload PAN card copy', category: 'Documents', order: 3, mandatory: true },
  { title: 'Bank Details & Cancelled Cheque', description: 'Submit bank account details with cancelled cheque', category: 'Documents', order: 4, mandatory: true },
  { title: 'Photograph', description: 'Upload passport-size photograph', category: 'Documents', order: 5, mandatory: true },
  { title: 'Education Certificates', description: 'Upload all educational qualification certificates', category: 'Documents', order: 6, mandatory: true },
  { title: 'Experience Letters', description: 'Upload previous employment experience letters (if applicable)', category: 'Documents', order: 7, mandatory: false },
  { title: 'Other Documents', description: 'Upload any other relevant documents', category: 'Documents', order: 8, mandatory: false },
  { title: 'POSH Training Attendance', description: 'Attend mandatory POSH (Prevention of Sexual Harassment) training session', category: 'Training', order: 9, mandatory: true },
  { title: 'POSH Policy Acknowledgment', description: 'Read and acknowledge the POSH policy document', category: 'Training', order: 10, mandatory: true },
];

const categoryIcons: Record<string, React.ElementType> = {
  'Documents': FileText,
  'Training': BookOpen,
  'Profile Setup': UserPlus,
  'Equipment': Package,
  'Access Setup': Key,
  'Other': Settings,
};

const categoryColors: Record<string, string> = {
  'Documents': 'bg-blue-100 text-blue-700 border-blue-200',
  'Training': 'bg-green-100 text-green-700 border-green-200',
  'Profile Setup': 'bg-purple-100 text-purple-700 border-purple-200',
  'Equipment': 'bg-orange-100 text-orange-700 border-orange-200',
  'Access Setup': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Other': 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusColors: Record<string, string> = {
  'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-green-100 text-green-700 border-green-200',
};

const OnboardingPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'Admin';

  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  
  const [pendingOpen, setPendingOpen] = useState(true);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    task_title: '',
    category: 'Documents',
    task_description: '',
    is_mandatory: true,
  });

  // Fetch employees for admin dropdown
  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  // Fetch tasks when employee is selected or for non-admin users
  useEffect(() => {
    if (isAdmin && selectedEmployeeId) {
      fetchTasks(selectedEmployeeId);
    } else if (!isAdmin && employee?.id) {
      fetchTasks(employee.id);
    } else if (!isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, selectedEmployeeId, employee?.id]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, full_name, employee_code, joining_date')
        .eq('status', 'Active')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
    }
  };

  const fetchTasks = async (employeeId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_onboarding_tasks')
        .select('*')
        .eq('employee_id', employeeId)
        .order('task_order', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.task_title || !selectedEmployeeId || !employee?.id) return;

    setSaving('create');
    try {
      const maxOrder = tasks.reduce((max, t) => Math.max(max, t.task_order), 0);
      
      const { error } = await supabase.from('hr_onboarding_tasks').insert({
        employee_id: selectedEmployeeId,
        task_title: newTask.task_title,
        category: newTask.category,
        task_description: newTask.task_description || null,
        is_mandatory: newTask.is_mandatory,
        task_order: maxOrder + 1,
        status: 'Pending',
      });

      if (error) throw error;

      toast({ title: 'Task created', description: 'Onboarding task added successfully' });
      setNewTask({ task_title: '', category: 'Documents', task_description: '', is_mandatory: true });
      setIsDialogOpen(false);
      fetchTasks(selectedEmployeeId);
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleBulkAssignTasks = async () => {
    if (selectedEmployeeIds.length === 0) return;

    setSaving('bulk');
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const empId of selectedEmployeeIds) {
        // Get max task_order for this employee
        const { data: existingTasks } = await supabase
          .from('hr_onboarding_tasks')
          .select('task_order')
          .eq('employee_id', empId)
          .order('task_order', { ascending: false })
          .limit(1);

        const maxOrder = existingTasks?.[0]?.task_order || 0;

        const tasksToInsert = DEFAULT_ONBOARDING_TASKS.map((task, index) => ({
          employee_id: empId,
          task_title: task.title,
          task_description: task.description,
          category: task.category,
          task_order: maxOrder + task.order,
          is_mandatory: task.mandatory,
          status: 'Pending',
        }));

        const { error } = await supabase
          .from('hr_onboarding_tasks')
          .insert(tasksToInsert);

        if (error) {
          console.error(`Error assigning tasks to ${empId}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      toast({ 
        title: 'Tasks assigned', 
        description: `Successfully assigned to ${successCount} employee(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}` 
      });
      
      setSelectedEmployeeIds([]);
      setIsBulkDialogOpen(false);
      
      if (selectedEmployeeId) {
        fetchTasks(selectedEmployeeId);
      }
    } catch (error: any) {
      console.error('Error bulk assigning tasks:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map(e => e.id));
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setSaving(taskId);
    
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: newStatus, completed_at: newStatus === 'Completed' ? new Date().toISOString() : null }
        : t
    ));

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'Completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('hr_onboarding_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
      fetchTasks(isAdmin ? selectedEmployeeId : employee?.id || '');
    } finally {
      setSaving(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    setSaving(taskId);
    try {
      const { error } = await supabase
        .from('hr_onboarding_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: 'Task deleted', description: 'Onboarding task removed' });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleCheckboxChange = (task: OnboardingTask) => {
    if (task.status === 'Completed') {
      updateTaskStatus(task.id, 'Pending');
    } else {
      updateTaskStatus(task.id, 'Completed');
    }
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const renderTaskItem = (task: OnboardingTask) => {
    const Icon = categoryIcons[task.category] || Settings;
    const isDisabled = saving === task.id;

    return (
      <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-secondary/30 transition-colors border-b border-border last:border-0">
        <Checkbox 
          checked={task.status === 'Completed'} 
          onCheckedChange={() => handleCheckboxChange(task)}
          disabled={isDisabled}
          className="mt-1"
        />
        <Icon className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.task_title}
          </p>
          {task.task_description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.task_description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.is_mandatory && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={categoryColors[task.category]}>
            {task.category}
          </Badge>
          {isAdmin ? (
            <Select 
              value={task.status || 'Pending'} 
              onValueChange={(value) => updateTaskStatus(task.id, value)}
              disabled={isDisabled}
            >
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge className={statusColors[task.status || 'Pending']}>{task.status}</Badge>
          )}
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => deleteTask(task.id)}
              disabled={isDisabled}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderTaskGroup = (
    title: string, 
    taskList: OnboardingTask[], 
    isOpen: boolean, 
    setIsOpen: (open: boolean) => void,
    statusColor: string
  ) => {
    if (taskList.length === 0) return null;
    
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-secondary/50">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold">{title}</span>
              <Badge className={statusColor}>{taskList.length}</Badge>
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border">
            {taskList.map(renderTaskItem)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Onboarding</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage new employee onboarding tasks' : 'Complete these tasks to finish your onboarding'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Assign to Multiple
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b bg-muted/30">
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Assign Default Onboarding Tasks
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select employees to assign the standard 10 onboarding tasks
                  </p>
                </DialogHeader>
                
                <div className="flex flex-col md:flex-row h-[60vh] min-h-[400px]">
                  {/* Left: Employee Selection */}
                  <div className="flex-1 flex flex-col border-r">
                    <div className="flex items-center justify-between p-4 border-b bg-background">
                      <div className="flex items-center gap-2">
                        <Label className="font-semibold">Employees</Label>
                        <Badge variant="secondary">{employees.length}</Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={selectAllEmployees}
                        className="text-xs"
                      >
                        {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-background">
                      {employees.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          <p>No employees found</p>
                        </div>
                      ) : (
                        employees.map(emp => {
                          const isSelected = selectedEmployeeIds.includes(emp.id);
                          return (
                            <div 
                              key={emp.id} 
                              className={`flex items-center gap-3 p-3 border-b last:border-0 cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => toggleEmployeeSelection(emp.id)}
                            >
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => toggleEmployeeSelection(emp.id)}
                                className="pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{emp.full_name}</p>
                                <p className="text-xs text-muted-foreground">{emp.employee_code || 'No code'}</p>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Tasks Preview */}
                  <div className="w-full md:w-72 flex flex-col bg-muted/20">
                    <div className="p-4 border-b">
                      <Label className="font-semibold">Tasks to Assign</Label>
                      <p className="text-xs text-muted-foreground mt-1">10 standard onboarding tasks</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {DEFAULT_ONBOARDING_TASKS.map((task, i) => {
                        const Icon = categoryIcons[task.category] || FileText;
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-background text-xs">
                            <Icon className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{task.title}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                  {task.category}
                                </Badge>
                                {task.mandatory && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedEmployeeIds.length > 0 ? 'default' : 'secondary'}>
                      {selectedEmployeeIds.length} selected
                    </Badge>
                    {selectedEmployeeIds.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        × 10 tasks = {selectedEmployeeIds.length * 10} total tasks
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkAssignTasks}
                      disabled={selectedEmployeeIds.length === 0 || saving === 'bulk'}
                    >
                      {saving === 'bulk' ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Assign Tasks
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedEmployeeId}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Onboarding Task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Task Name <span className="text-destructive">*</span></Label>
                    <Input 
                      placeholder="e.g., Complete ID verification" 
                      value={newTask.task_title}
                      onChange={(e) => setNewTask({ ...newTask, task_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category <span className="text-destructive">*</span></Label>
                    <Select 
                      value={newTask.category} 
                      onValueChange={(v) => setNewTask({ ...newTask, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      placeholder="Optional task description..."
                      value={newTask.task_description}
                      onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_mandatory"
                      checked={newTask.is_mandatory}
                      onCheckedChange={(checked) => setNewTask({ ...newTask, is_mandatory: !!checked })}
                    />
                    <Label htmlFor="is_mandatory">Required task</Label>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleCreateTask}
                    disabled={!newTask.task_title || saving === 'create'}
                  >
                    {saving === 'create' ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Admin: Employee Selector */}
      {isAdmin && (
        <Card className="p-4 glass-card">
          <Label className="text-sm font-medium mb-2 block">Select Employee to View/Manage Tasks</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select employee to manage onboarding" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name} {emp.employee_code && `(${emp.employee_code})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>
      )}

      {/* Stats */}
      {(isAdmin ? selectedEmployeeId : true) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingTasks.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <AlertCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inProgressTasks.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Progress */}
      {(isAdmin ? selectedEmployeeId : true) && totalTasks > 0 && (
        <Card className="p-4 glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Onboarding Progress</span>
            <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* No Selection State for Admin */}
      {isAdmin && !selectedEmployeeId && !loading && (
        <Card className="p-8 text-center glass-card">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Select an Employee</h3>
          <p className="text-muted-foreground">Choose an employee from the dropdown to view and manage their onboarding tasks</p>
        </Card>
      )}

      {/* Task Groups */}
      {!loading && (isAdmin ? selectedEmployeeId : true) && (
        <Card className="glass-card overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Onboarding Tasks</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin ? 'This employee has no onboarding tasks yet.' : 'No onboarding tasks assigned yet.'}
              </p>
              {isAdmin && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Task
                </Button>
              )}
            </div>
          ) : (
            <>
              {renderTaskGroup('Pending', pendingTasks, pendingOpen, setPendingOpen, 'bg-amber-100 text-amber-700')}
              {renderTaskGroup('In Progress', inProgressTasks, inProgressOpen, setInProgressOpen, 'bg-blue-100 text-blue-700')}
              {renderTaskGroup('Completed', completedTasks, completedOpen, setCompletedOpen, 'bg-green-100 text-green-700')}
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default OnboardingPage;
