import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  User, 
  GraduationCap, 
  Monitor, 
  Key, 
  MoreHorizontal,
  Calendar,
  AlertTriangle,
  PartyPopper,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Default onboarding tasks that are assigned to all employees
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
  'Training': GraduationCap,
  'Profile Setup': User,
  'Equipment': Monitor,
  'Access Setup': Key,
  'Other': MoreHorizontal,
};

const categoryColors: Record<string, string> = {
  'Documents': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Training': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Profile Setup': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Equipment': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Access Setup': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const MyOnboardingPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  
  // Collapsible state
  const [pendingOpen, setPendingOpen] = useState(true);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchTasks();
    }
  }, [employee?.id]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_onboarding_tasks')
        .select('*')
        .eq('employee_id', employee?.id)
        .order('task_order', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setSavingTaskId(taskId);
    
    // Optimistic update
    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: 'Completed', completed_at: new Date().toISOString() }
        : t
    ));

    try {
      const { error } = await supabase
        .from('hr_onboarding_tasks')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Task completed!' });
      
      // Check if all tasks are completed
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, status: 'Completed' } : t
      );
      if (updatedTasks.every(t => t.status === 'Completed')) {
        toast({
          title: '🎉 Congratulations!',
          description: "You've completed all your onboarding tasks!",
        });
      }
    } catch (error: any) {
      // Revert optimistic update
      fetchTasks();
      toast({
        title: 'Error completing task',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingTaskId(null);
    }
  };

  // Group tasks by status
  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  // Calculate progress
  const totalTasks = tasks.length;
  const completedCount = completedTasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const allCompleted = totalTasks > 0 && completedCount === totalTasks;

  const renderTask = (task: OnboardingTask) => {
    const Icon = categoryIcons[task.category] || MoreHorizontal;
    const isCompleted = task.status === 'Completed';
    const isSaving = savingTaskId === task.id;

    return (
      <div
        key={task.id}
        className={cn(
          "flex items-start gap-4 p-4 rounded-lg border bg-card",
          isCompleted && "opacity-70"
        )}
      >
        <Checkbox
          checked={isCompleted}
          disabled={isCompleted || isSaving}
          onCheckedChange={() => handleCompleteTask(task.id)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={cn("font-medium", isCompleted && "line-through text-muted-foreground")}>
              {task.task_title}
            </span>
            <Badge className={categoryColors[task.category] || categoryColors['Other']}>
              <Icon className="h-3 w-3 mr-1" />
              {task.category}
            </Badge>
            {task.is_mandatory && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          
          {task.task_description && (
            <p className="text-sm text-muted-foreground mt-1">{task.task_description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            {task.completed_at && (
              <span className="text-muted-foreground">
                Completed: {format(new Date(task.completed_at), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTaskGroup = (
    title: string,
    tasks: OnboardingTask[],
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    badgeColor: string
  ) => (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <span className="font-semibold">{title}</span>
          <Badge className={badgeColor}>{tasks.length}</Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No tasks</p>
        ) : (
          tasks.map(renderTask)
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Onboarding Tasks</h2>
            <p className="text-muted-foreground text-center">
              No onboarding tasks assigned yet. Please contact HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Welcome to AtombergHR, {employee?.full_name?.split(' ')[0]}! 👋
          </CardTitle>
          <CardDescription>
            Complete these tasks to finish your onboarding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedCount} of {totalTasks} tasks completed ({progressPercentage}%)
              </span>
              <Badge variant={allCompleted ? "default" : "secondary"}>
                {allCompleted ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* All Completed Celebration */}
      {allCompleted && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="flex items-center gap-4 py-6">
            <PartyPopper className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                🎉 Congratulations!
              </h3>
              <p className="text-green-700 dark:text-green-300">
                You've completed all your onboarding tasks!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Groups */}
      <div className="space-y-4">
        {pendingTasks.length > 0 && renderTaskGroup(
          'Pending',
          pendingTasks,
          pendingOpen,
          setPendingOpen,
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        )}
        
        {inProgressTasks.length > 0 && renderTaskGroup(
          'In Progress',
          inProgressTasks,
          inProgressOpen,
          setInProgressOpen,
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        )}
        
        {completedTasks.length > 0 && renderTaskGroup(
          'Completed',
          completedTasks,
          completedOpen,
          setCompletedOpen,
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        )}
      </div>
    </div>
  );
};

export default MyOnboardingPage;
