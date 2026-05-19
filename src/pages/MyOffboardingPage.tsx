import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Monitor,
  Key,
  BookOpen,
  DollarSign,
  MoreHorizontal,
  DoorOpen,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  hr_offboarding_tasks: OffboardingTask[];
}

const categoryIcons: Record<string, React.ElementType> = {
  'Equipment Return': Monitor,
  'Access Revocation': Key,
  'Documentation': FileText,
  'Knowledge Transfer': BookOpen,
  'Settlement': DollarSign,
  'Other': MoreHorizontal,
};

const categoryColors: Record<string, string> = {
  'Equipment Return': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Access Revocation': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Documentation': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Knowledge Transfer': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Settlement': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const exitTypeColors: Record<string, string> = {
  'Resignation': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Termination': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Retirement': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Contract End': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const MyOffboardingPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [offboarding, setOffboarding] = useState<Offboarding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employee?.id) {
      fetchOffboarding();
    }
  }, [employee?.id]);

  const fetchOffboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_offboarding')
        .select(`
          *,
          hr_offboarding_tasks (*)
        `)
        .eq('employee_id', employee?.id)
        .maybeSingle();

      if (error) throw error;
      setOffboarding(data);
    } catch (error: any) {
      toast({
        title: 'Error fetching offboarding data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Group tasks by category
  const groupedTasks = offboarding?.hr_offboarding_tasks?.reduce((acc, task) => {
    const category = task.task_category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, OffboardingTask[]>) || {};

  // Calculate progress
  const tasks = offboarding?.hr_offboarding_tasks || [];
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!offboarding?.last_working_day) return null;
    const lastDay = new Date(offboarding.last_working_day);
    const today = new Date();
    const days = differenceInDays(lastDay, today);
    
    if (isToday(lastDay)) return 'Last day today';
    if (isPast(lastDay)) return 'Process completed';
    return `${days} days remaining`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Check if employee has offboarding record - this is the primary check now
  // NOT based on status anymore
  if (!offboarding) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DoorOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Offboarding Assigned</h2>
            <p className="text-muted-foreground text-center mb-4">
              You don't have any offboarding process initiated yet.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Offboarding will be visible here once HR initiates the process for you.
            </p>
            <Button variant="outline" onClick={() => navigate('/app')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Offboarding</h1>
        <p className="text-muted-foreground">View your exit process details</p>
      </div>

      {/* Exit Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Exit Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Employee Name</p>
              <p className="font-medium">{employee?.full_name}</p>
            </div>
            
            {offboarding.resignation_date && (
              <div>
                <p className="text-sm text-muted-foreground">Resignation Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(offboarding.resignation_date), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            
            {offboarding.last_working_day && (
              <div>
                <p className="text-sm text-muted-foreground">Last Working Day</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(offboarding.last_working_day), 'MMMM d, yyyy')}
                </p>
              </div>
            )}
            
            {daysRemaining && (
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className="mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {daysRemaining}
                </Badge>
              </div>
            )}
            
            {offboarding.exit_type && (
              <div>
                <p className="text-sm text-muted-foreground">Exit Type</p>
                <Badge className={exitTypeColors[offboarding.exit_type] || exitTypeColors['Other']}>
                  {offboarding.exit_type}
                </Badge>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground">Overall Status</p>
              <Badge variant={offboarding.status === 'Completed' ? 'default' : 'secondary'}>
                {offboarding.status === 'Completed' ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <Clock className="h-3 w-3 mr-1" />
                )}
                {offboarding.status}
              </Badge>
            </div>
          </div>
          
          {offboarding.exit_reason && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Exit Reason</p>
              <p className="text-sm bg-muted p-3 rounded-lg">{offboarding.exit_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exit Interview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Exit Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offboarding.exit_interview_completed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Exit Interview Completed</span>
              </div>
              {offboarding.exit_interview_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{offboarding.exit_interview_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>Exit interview pending</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {totalTasks > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Offboarding Progress</CardTitle>
            <CardDescription>
              {completedCount} of {totalTasks} tasks completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Task Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Offboarding Checklist</CardTitle>
          <CardDescription>Tasks managed by HR team</CardDescription>
        </CardHeader>
        <CardContent>
          {totalTasks === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No offboarding tasks assigned yet.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
                const Icon = categoryIcons[category] || MoreHorizontal;
                
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold">{category}</h3>
                      <Badge variant="outline">{categoryTasks.length}</Badge>
                    </div>
                    
                    <div className="space-y-2 ml-7">
                      {categoryTasks.map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border bg-card",
                            task.status === 'Completed' && "opacity-70"
                          )}
                        >
                          <Checkbox
                            checked={task.status === 'Completed'}
                            disabled
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium",
                                task.status === 'Completed' && "line-through text-muted-foreground"
                              )}>
                                {task.task_name}
                              </span>
                              <Badge 
                                variant={task.status === 'Completed' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {task.status}
                              </Badge>
                            </div>
                            
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.description}
                              </p>
                            )}
                            
                            {task.completed_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Completed: {format(new Date(task.completed_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="mt-4" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Message */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Please coordinate with HR for any queries regarding your exit process. 
            All tasks will be completed by the admin team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyOffboardingPage;
