import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, UserMinus, Package, FileText, Users, CheckCircle2, Clock, AlertCircle, Trash2, CalendarIcon, ChevronDown, ChevronRight, Key, DollarSign, Settings, LogOut, Calendar as CalendarIconLucide } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface Offboarding {
  id: string;
  employee_id: string;
  resignation_date: string | null;
  last_working_day: string | null;
  exit_reason: string | null;
  exit_type: string | null;
  exit_interview_completed: boolean | null;
  exit_interview_notes: string | null;
  status: string;
  initiated_by: string;
  initiated_at: string | null;
  completed_at: string | null;
}

interface OffboardingTask {
  id: string;
  offboarding_id: string;
  task_name: string;
  task_category: string;
  description: string | null;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
}

const EXIT_TYPES = ['Resignation', 'Termination', 'Retirement', 'Contract End', 'Other'] as const;
const TASK_CATEGORIES = ['Equipment Return', 'Access Revocation', 'Documentation', 'Knowledge Transfer', 'Settlement', 'Other'] as const;

const categoryIcons: Record<string, React.ElementType> = {
  'Equipment Return': Package,
  'Access Revocation': Key,
  'Documentation': FileText,
  'Knowledge Transfer': Users,
  'Settlement': DollarSign,
  'Other': Settings,
};

const categoryColors: Record<string, string> = {
  'Equipment Return': 'bg-orange-100 text-orange-700 border-orange-200',
  'Access Revocation': 'bg-red-100 text-red-700 border-red-200',
  'Documentation': 'bg-blue-100 text-blue-700 border-blue-200',
  'Knowledge Transfer': 'bg-purple-100 text-purple-700 border-purple-200',
  'Settlement': 'bg-green-100 text-green-700 border-green-200',
  'Other': 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusColors: Record<string, string> = {
  'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-green-100 text-green-700 border-green-200',
};

const exitTypeColors: Record<string, string> = {
  'Resignation': 'bg-blue-100 text-blue-700',
  'Termination': 'bg-red-100 text-red-700',
  'Retirement': 'bg-purple-100 text-purple-700',
  'Contract End': 'bg-amber-100 text-amber-700',
  'Other': 'bg-gray-100 text-gray-700',
};

const DEFAULT_TASKS = [
  { task_name: 'Return laptop and accessories', task_category: 'Equipment Return' },
  { task_name: 'Return ID card and access badges', task_category: 'Equipment Return' },
  { task_name: 'Revoke email and system access', task_category: 'Access Revocation' },
  { task_name: 'Revoke VPN and remote access', task_category: 'Access Revocation' },
  { task_name: 'Complete exit interview', task_category: 'Documentation' },
  { task_name: 'Sign clearance form', task_category: 'Documentation' },
  { task_name: 'Complete knowledge transfer document', task_category: 'Knowledge Transfer' },
  { task_name: 'Handover projects and responsibilities', task_category: 'Knowledge Transfer' },
  { task_name: 'Process final salary settlement', task_category: 'Settlement' },
  { task_name: 'Clear pending reimbursements', task_category: 'Settlement' },
];

const OffboardingPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'Admin';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [offboarding, setOffboarding] = useState<Offboarding | null>(null);
  const [tasks, setTasks] = useState<OffboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  const [isInitiateDialogOpen, setIsInitiateDialogOpen] = useState(false);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  
  const [initiateForm, setInitiateForm] = useState({
    resignation_date: undefined as Date | undefined,
    last_working_day: undefined as Date | undefined,
    exit_type: 'Resignation',
    exit_reason: '',
  });

  const [newTask, setNewTask] = useState({
    task_name: '',
    task_category: 'Equipment Return',
    description: '',
  });

  const [exitInterviewCompleted, setExitInterviewCompleted] = useState(false);
  const [exitInterviewNotes, setExitInterviewNotes] = useState('');

  // Category collapse states
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Fetch employees for admin
  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
  }, [isAdmin]);

  // Fetch offboarding when employee is selected
  useEffect(() => {
    if (isAdmin && selectedEmployeeId) {
      fetchOffboarding(selectedEmployeeId);
    } else if (!isAdmin && employee?.id) {
      fetchOffboarding(employee.id);
    } else if (!isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, selectedEmployeeId, employee?.id]);

  const fetchEmployees = async () => {
    try {
      // Fetch employees eligible for offboarding (Active for initiation, or already in offboarding process)
      const { data: activeData, error: activeError } = await supabase
        .from('hr_employees')
        .select('id, full_name, employee_code')
        .eq('status', 'Active')
        .order('full_name');

      const { data: offboardingData, error: offboardingError } = await supabase
        .from('hr_employees')
        .select('id, full_name, employee_code')
        .in('status', ['Resigned', 'Terminated', 'Inactive', 'Abscond'])
        .order('full_name');

      if (activeError) throw activeError;
      if (offboardingError) throw offboardingError;
      
      // Combine both lists - Active employees can have offboarding initiated, others are in process
      setEmployees([...(activeData || []), ...(offboardingData || [])]);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
    }
  };

  const fetchOffboarding = async (employeeId: string) => {
    setLoading(true);
    try {
      // Fetch offboarding record
      const { data: offboardingData, error: offboardingError } = await supabase
        .from('hr_offboarding')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (offboardingError) throw offboardingError;

      setOffboarding(offboardingData);

      if (offboardingData) {
        setExitInterviewCompleted(offboardingData.exit_interview_completed || false);
        setExitInterviewNotes(offboardingData.exit_interview_notes || '');

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('hr_offboarding_tasks')
          .select('*')
          .eq('offboarding_id', offboardingData.id)
          .order('task_category')
          .order('status');

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Error fetching offboarding:', error);
      toast({ title: 'Error', description: 'Failed to load offboarding data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateOffboarding = async () => {
    if (!initiateForm.resignation_date || !initiateForm.last_working_day || !selectedEmployeeId || !employee?.id) return;

    if (initiateForm.last_working_day < initiateForm.resignation_date) {
      toast({ title: 'Invalid dates', description: 'Last working day must be on or after resignation date', variant: 'destructive' });
      return;
    }

    setSaving('initiate');
    try {
      // NOTE: Employee status stays Active until offboarding is complete AND last working day has passed
      // No status change on initiation - employee can still login and complete tasks

      // Step 1: Create offboarding record
      const { data: newOffboarding, error: offError } = await supabase
        .from('hr_offboarding')
        .insert({
          employee_id: selectedEmployeeId,
          resignation_date: format(initiateForm.resignation_date, 'yyyy-MM-dd'),
          last_working_day: format(initiateForm.last_working_day, 'yyyy-MM-dd'),
          exit_type: initiateForm.exit_type,
          exit_reason: initiateForm.exit_reason || null,
          initiated_by: employee.id,
          status: 'In Progress',
        })
        .select()
        .single();

      if (offError) throw offError;

      // Step 2: Create default tasks
      for (const task of DEFAULT_TASKS) {
        await supabase.from('hr_offboarding_tasks').insert({
          offboarding_id: newOffboarding.id,
          task_name: task.task_name,
          task_category: task.task_category,
          status: 'Pending',
        });
      }

      toast({ title: 'Offboarding initiated', description: 'Offboarding tasks have been created. Employee can still login to complete tasks until last working day.' });
      setIsInitiateDialogOpen(false);
      setInitiateForm({ resignation_date: undefined, last_working_day: undefined, exit_type: 'Resignation', exit_reason: '' });
      fetchEmployees(); // Refresh employee list
      fetchOffboarding(selectedEmployeeId);
    } catch (error: any) {
      console.error('Error initiating offboarding:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.task_name || !offboarding?.id) return;

    setSaving('addTask');
    try {
      const { error } = await supabase.from('hr_offboarding_tasks').insert({
        offboarding_id: offboarding.id,
        task_name: newTask.task_name,
        task_category: newTask.task_category,
        description: newTask.description || null,
        status: 'Pending',
      });

      if (error) throw error;

      toast({ title: 'Task added', description: 'Offboarding task created successfully' });
      setNewTask({ task_name: '', task_category: 'Equipment Return', description: '' });
      setIsAddTaskDialogOpen(false);
      fetchOffboarding(isAdmin ? selectedEmployeeId : employee?.id || '');
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const updateTaskStatus = async (taskId: string, completed: boolean) => {
    if (!employee?.id) return;

    setSaving(taskId);
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: completed ? 'Completed' : 'Pending', completed_at: completed ? new Date().toISOString() : null, completed_by: completed ? employee.id : null }
        : t
    ));

    try {
      const updateData: any = { 
        status: completed ? 'Completed' : 'Pending',
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? employee.id : null,
      };

      const { error } = await supabase
        .from('hr_offboarding_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
      fetchOffboarding(isAdmin ? selectedEmployeeId : employee?.id || '');
    } finally {
      setSaving(null);
    }
  };

  const deleteTask = async (taskId: string) => {
    setSaving(taskId);
    try {
      const { error } = await supabase
        .from('hr_offboarding_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast({ title: 'Task deleted' });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({ title: 'Error', description: 'Failed to delete task', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const saveExitInterview = async () => {
    if (!offboarding?.id) return;

    setSaving('exitInterview');
    try {
      const { error } = await supabase
        .from('hr_offboarding')
        .update({
          exit_interview_completed: exitInterviewCompleted,
          exit_interview_notes: exitInterviewNotes || null,
        })
        .eq('id', offboarding.id);

      if (error) throw error;

      toast({ title: 'Saved', description: 'Exit interview information updated' });
    } catch (error: any) {
      console.error('Error saving exit interview:', error);
      toast({ title: 'Error', description: 'Failed to save exit interview', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const completeOffboarding = async () => {
    if (!offboarding?.id || !selectedEmployeeId) return;

    // Check if last working day has passed
    if (offboarding.last_working_day) {
      const lastDay = new Date(offboarding.last_working_day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastDay.setHours(0, 0, 0, 0);
      
      if (lastDay > today) {
        toast({ 
          title: 'Cannot complete yet', 
          description: `Last working day (${format(lastDay, 'MMM d, yyyy')}) has not passed yet. Employee can still login until then.`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setSaving('complete');
    try {
      // Update offboarding status
      const { error: offError } = await supabase
        .from('hr_offboarding')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', offboarding.id);

      if (offError) throw offError;

      // Set employee status to Inactive - NOW they cannot login
      const { error: empError } = await supabase
        .from('hr_employees')
        .update({ status: 'Inactive' })
        .eq('id', selectedEmployeeId);

      if (empError) throw empError;

      toast({ title: 'Offboarding completed', description: 'Employee has been marked as inactive and can no longer login.' });
      fetchOffboarding(selectedEmployeeId);
      fetchEmployees(); // Refresh employee list
    } catch (error: any) {
      console.error('Error completing offboarding:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  // Check if offboarding can be completed (all tasks done + last working day passed)
  const canCompleteOffboarding = () => {
    if (!offboarding?.last_working_day || pendingCount > 0 || totalTasks === 0) return false;
    
    const lastDay = new Date(offboarding.last_working_day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDay.setHours(0, 0, 0, 0);
    
    return lastDay <= today;
  };

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const cat = task.task_category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {} as Record<string, OffboardingTask[]>);

  const totalTasks = tasks.length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const progressPercent = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const canComplete = pendingCount === 0 && totalTasks > 0;

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const daysRemaining = offboarding?.last_working_day 
    ? differenceInDays(new Date(offboarding.last_working_day), new Date())
    : null;

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const renderTaskItem = (task: OffboardingTask) => {
    const Icon = categoryIcons[task.task_category] || Settings;
    const isDisabled = saving === task.id || !isAdmin;

    return (
      <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-secondary/30 transition-colors border-b border-border last:border-0">
        <Checkbox 
          checked={task.status === 'Completed'} 
          onCheckedChange={(checked) => updateTaskStatus(task.id, checked as boolean)}
          disabled={isDisabled}
          className="mt-1"
        />
        <Icon className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium",
            task.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'
          )}>
            {task.task_name}
          </p>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
        </div>
        <Badge className={statusColors[task.status]}>{task.status}</Badge>
        {isAdmin && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => deleteTask(task.id)}
            disabled={saving === task.id}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Offboarding</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage employee exit tasks and transitions' : 'Track your exit process'}
          </p>
        </div>
        {isAdmin && offboarding && (
          <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={offboarding.status === 'Completed'}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Offboarding Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Task Name <span className="text-destructive">*</span></Label>
                  <Input 
                    placeholder="e.g., Return company phone" 
                    value={newTask.task_name}
                    onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select 
                    value={newTask.task_category} 
                    onValueChange={(v) => setNewTask({ ...newTask, task_category: v })}
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
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddTask}
                  disabled={!newTask.task_name || saving === 'addTask'}
                >
                  {saving === 'addTask' ? 'Adding...' : 'Add Task'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Admin: Employee Selector */}
      {isAdmin && (
        <Card className="p-4 glass-card">
          <Label className="text-sm font-medium mb-2 block">Select Employee</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select employee to manage offboarding" />
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

      {/* Loading State */}
      {loading && (
        <Card className="glass-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      )}

      {/* No Employee Selected (Admin) */}
      {isAdmin && !selectedEmployeeId && !loading && (
        <Card className="p-12 glass-card text-center">
          <UserMinus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Select an Employee</h3>
          <p className="text-muted-foreground">Choose an employee from the dropdown above to view or initiate their offboarding process.</p>
        </Card>
      )}

      {/* No Offboarding Record */}
      {!loading && ((isAdmin && selectedEmployeeId) || !isAdmin) && !offboarding && (
        <Card className="p-12 glass-card text-center">
          <LogOut className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isAdmin ? 'No Offboarding Process' : 'No Offboarding Initiated'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isAdmin 
              ? 'This employee does not have an active offboarding process. Initiate one to begin the exit workflow.'
              : 'You don\'t have any offboarding process initiated. Please coordinate with HR for your exit process.'}
          </p>
          {isAdmin && (
            <Dialog open={isInitiateDialogOpen} onOpenChange={setIsInitiateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Initiate Offboarding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Initiate Offboarding</DialogTitle>
                  <DialogDescription>
                    Start the offboarding process for {selectedEmployee?.full_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Resignation Date <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !initiateForm.resignation_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {initiateForm.resignation_date ? format(initiateForm.resignation_date, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={initiateForm.resignation_date}
                          onSelect={(date) => setInitiateForm({ ...initiateForm, resignation_date: date })}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Last Working Day <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !initiateForm.last_working_day && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {initiateForm.last_working_day ? format(initiateForm.last_working_day, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={initiateForm.last_working_day}
                          onSelect={(date) => setInitiateForm({ ...initiateForm, last_working_day: date })}
                          disabled={(date) => initiateForm.resignation_date ? date < initiateForm.resignation_date : false}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Type <span className="text-destructive">*</span></Label>
                    <Select 
                      value={initiateForm.exit_type} 
                      onValueChange={(v) => setInitiateForm({ ...initiateForm, exit_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXIT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Reason</Label>
                    <Textarea 
                      placeholder="Optional reason for exit..."
                      value={initiateForm.exit_reason}
                      onChange={(e) => setInitiateForm({ ...initiateForm, exit_reason: e.target.value })}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleInitiateOffboarding}
                    disabled={!initiateForm.resignation_date || !initiateForm.last_working_day || saving === 'initiate'}
                  >
                    {saving === 'initiate' ? 'Initiating...' : 'Initiate Offboarding'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </Card>
      )}

      {/* Offboarding Exists */}
      {!loading && offboarding && (
        <>
          {/* Offboarding Info Card */}
          <Card className="p-6 glass-card">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <UserMinus className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {isAdmin ? selectedEmployee?.full_name : 'Your Offboarding'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={exitTypeColors[offboarding.exit_type || 'Other']}>
                      {offboarding.exit_type}
                    </Badge>
                    <Badge className={statusColors[offboarding.status]}>
                      {offboarding.status}
                    </Badge>
                  </div>
                </div>
              </div>
              {daysRemaining !== null && offboarding.status !== 'Completed' && (
                <div className={cn(
                  "text-right px-4 py-2 rounded-lg",
                  daysRemaining < 0 ? "bg-destructive/10" : daysRemaining <= 7 ? "bg-amber-500/10" : "bg-primary/10"
                )}>
                  <p className={cn(
                    "text-2xl font-bold",
                    daysRemaining < 0 ? "text-destructive" : daysRemaining <= 7 ? "text-amber-600" : "text-primary"
                  )}>
                    {daysRemaining < 0 ? 'Past due' : `${daysRemaining} days`}
                  </p>
                  <p className="text-sm text-muted-foreground">remaining</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-2">
                <CalendarIconLucide className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Resignation Date</p>
                  <p className="text-sm font-medium text-foreground">
                    {offboarding.resignation_date ? format(new Date(offboarding.resignation_date), 'PPP') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIconLucide className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Last Working Day</p>
                  <p className="text-sm font-medium text-foreground">
                    {offboarding.last_working_day ? format(new Date(offboarding.last_working_day), 'PPP') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Initiated On</p>
                  <p className="text-sm font-medium text-foreground">
                    {offboarding.initiated_at ? format(new Date(offboarding.initiated_at), 'PPP') : '-'}
                  </p>
                </div>
              </div>
            </div>

            {offboarding.exit_reason && (
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Exit Reason</p>
                <p className="text-sm text-foreground">{offboarding.exit_reason}</p>
              </div>
            )}
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
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

          {/* Progress */}
          {totalTasks > 0 && (
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Task Progress</span>
                <span className="text-sm text-muted-foreground">{completedCount} of {totalTasks} completed</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </Card>
          )}

          {/* Exit Interview Section (Admin only) */}
          {isAdmin && offboarding.status !== 'Completed' && (
            <Card className="p-4 glass-card">
              <h3 className="font-semibold text-foreground mb-4">Exit Interview</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="exitInterview"
                    checked={exitInterviewCompleted}
                    onCheckedChange={(checked) => setExitInterviewCompleted(checked as boolean)}
                  />
                  <Label htmlFor="exitInterview">Exit interview completed</Label>
                </div>
                {exitInterviewCompleted && (
                  <div className="space-y-2">
                    <Label>Interview Notes</Label>
                    <Textarea 
                      placeholder="Document key points from the exit interview..."
                      value={exitInterviewNotes}
                      onChange={(e) => setExitInterviewNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}
                <Button 
                  variant="outline" 
                  onClick={saveExitInterview}
                  disabled={saving === 'exitInterview'}
                >
                  {saving === 'exitInterview' ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </Card>
          )}

          {/* Task List by Category */}
          <Card className="glass-card overflow-hidden">
            {tasks.length > 0 ? (
              <div>
                {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                  const Icon = categoryIcons[category] || Settings;
                  const isCollapsed = collapsedCategories[category];
                  const categoryCompleted = categoryTasks.filter(t => t.status === 'Completed').length;

                  return (
                    <Collapsible key={category} open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-secondary/50 rounded-none border-b border-border">
                          <div className="flex items-center gap-3">
                            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <Icon className="w-5 h-5 text-muted-foreground" />
                            <span className="font-semibold">{category}</span>
                            <Badge variant="outline" className={categoryColors[category]}>
                              {categoryCompleted}/{categoryTasks.length}
                            </Badge>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {categoryTasks.map(renderTaskItem)}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks</h3>
                <p className="text-muted-foreground">No offboarding tasks have been created yet.</p>
              </div>
            )}
          </Card>

          {/* Complete Offboarding Button (Admin only) */}
          {isAdmin && offboarding.status === 'In Progress' && (
            <Card className="p-4 glass-card">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">Complete Offboarding</h3>
                  <p className="text-sm text-muted-foreground">
                    {canCompleteOffboarding() 
                      ? 'All tasks are completed and last working day has passed. You can now finalize the offboarding process.'
                      : pendingCount > 0 
                        ? `${pendingCount} task(s) remaining. Complete all tasks before finalizing.`
                        : daysRemaining !== null && daysRemaining > 0
                          ? `Last working day is in ${daysRemaining} day(s). Employee can still login until then.`
                          : 'Set last working day to complete offboarding.'}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant={canCompleteOffboarding() ? 'default' : 'outline'}
                      disabled={!canCompleteOffboarding() || saving === 'complete'}
                    >
                      {saving === 'complete' ? 'Completing...' : 'Complete Offboarding'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Complete Offboarding?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the offboarding process as complete and set the employee's status to Inactive. The employee will no longer be able to login. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={completeOffboarding}>
                        Complete Offboarding
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          )}

          {/* Employee Message */}
          {!isAdmin && (
            <Card className="p-4 glass-card border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Please coordinate with HR to complete your exit process. 
                They will guide you through the remaining tasks and formalities.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default OffboardingPage;
