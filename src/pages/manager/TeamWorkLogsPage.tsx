import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { sendWorkLogEmail } from '@/lib/emailService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Timer,
  Send,
  Users,
} from 'lucide-react';
import { format, startOfWeek, addDays, parseISO, subWeeks } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getCategoryConfig, getAssignmentBadgeConfig, type TaskCategory, type WorkLogTask, type WorkLogWeek } from '@/types/worklog';
import { CategoryIcon } from '@/components/worklog/CategoryIcon';

interface TeamMember {
  id: string;
  full_name: string;
  employee_code: string;
}

interface WeekSubmission {
  weekLog: WorkLogWeek;
  employee: TeamMember;
  tasks: WorkLogTask[];
  dayBreakdown: { date: string; dayName: string; tasks: WorkLogTask[]; totalMinutes: number; status: string }[];
}

const getMonday = (date: Date): Date => startOfWeek(date, { weekStartsOn: 1 });

const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Draft':
      return 'bg-muted text-muted-foreground';
    case 'Submitted':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Approved':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'Rework':
      return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const TeamWorkLogsPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [weekLogs, setWeekLogs] = useState<WorkLogWeek[]>([]);
  const [tasks, setTasks] = useState<WorkLogTask[]>([]);
  const [expandedSubmissions, setExpandedSubmissions] = useState<string[]>([]);
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('Submitted');
  const [selectedWeek, setSelectedWeek] = useState<string>('current');
  
  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<WeekSubmission | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [reworkComment, setReworkComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (employee?.id) {
      fetchTeamMembers();
    }
  }, [employee?.id]);

  useEffect(() => {
    if (teamMembers.length > 0) {
      fetchWorkLogs();
    }
  }, [teamMembers, selectedWeek]);

  const fetchTeamMembers = async () => {
    if (!employee?.id) return;
    
    try {
      let query = supabase
        .from('hr_employees')
        .select('id, full_name, employee_code')
        .eq('status', 'Active');
      
      if (role !== 'Admin') {
        query = query.eq('manager_id', employee.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch team members',
        variant: 'destructive',
      });
    }
  };

  const fetchWorkLogs = async () => {
    if (teamMembers.length === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const teamMemberIds = teamMembers.map(m => m.id);
      
      // Calculate date range
      let startDate: Date;
      let endDate: Date = addDays(getMonday(new Date()), 4);
      
      switch (selectedWeek) {
        case 'current':
          startDate = getMonday(new Date());
          break;
        case 'last':
          startDate = getMonday(subWeeks(new Date(), 1));
          endDate = addDays(startDate, 4);
          break;
        case 'last2':
          startDate = getMonday(subWeeks(new Date(), 2));
          break;
        case 'month':
          startDate = getMonday(subWeeks(new Date(), 4));
          break;
        default:
          startDate = getMonday(new Date());
      }
      
      // Fetch week logs
      const { data: logs, error: logsError } = await supabase
        .from('hr_work_log_weeks')
        .select('*')
        .in('employee_id', teamMemberIds)
        .gte('week_start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('week_start_date', format(endDate, 'yyyy-MM-dd'))
        .order('submitted_at', { ascending: false, nullsFirst: false });
      
      if (logsError) throw logsError;
      setWeekLogs((logs || []) as WorkLogWeek[]);
      
      // Fetch tasks for these week logs
      if (logs && logs.length > 0) {
        const weekLogIds = logs.map(l => l.id);
        const { data: taskData, error: taskError } = await supabase
          .from('hr_work_log_tasks')
          .select(`
            *,
            assigned_by:hr_employees!assigned_by_id(full_name)
          `)
          .in('week_log_id', weekLogIds)
          .order('log_date')
          .order('created_at');
        
        if (taskError) throw taskError;
        setTasks((taskData || []) as WorkLogTask[]);
      } else {
        setTasks([]);
      }
    } catch (error: any) {
      console.error('Error fetching work logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch work logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Build submissions with day breakdown
  const submissions = useMemo((): WeekSubmission[] => {
    const result: WeekSubmission[] = [];
    
    weekLogs.forEach(weekLog => {
      const emp = teamMembers.find(m => m.id === weekLog.employee_id);
      if (!emp) return;

      const weekTasks = tasks.filter(t => t.week_log_id === weekLog.id);
      
      // Build day breakdown (Mon-Fri)
      const dayBreakdown: WeekSubmission['dayBreakdown'] = [];
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const weekStart = parseISO(weekLog.week_start_date);
      
      for (let i = 0; i < 5; i++) {
        const date = addDays(weekStart, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayTasks = weekTasks.filter(t => t.log_date === dateStr);
        const totalMinutes = dayTasks.reduce((sum, t) => sum + t.duration_minutes, 0);
        
        let status = 'NoEntry';
        if (dayTasks.length > 0) {
          if (dayTasks.some(t => t.day_status === 'Rework')) status = 'Rework';
          else if (dayTasks.every(t => t.day_status === 'Approved')) status = 'Approved';
          else if (dayTasks.every(t => t.day_status === 'Submitted')) status = 'Submitted';
          else status = 'Draft';
        }
        
        dayBreakdown.push({
          date: dateStr,
          dayName: dayNames[i],
          tasks: dayTasks,
          totalMinutes,
          status,
        });
      }

      result.push({
        weekLog,
        employee: emp,
        tasks: weekTasks,
        dayBreakdown,
      });
    });

    // Apply filters
    let filtered = result;
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(s => s.employee.id === selectedEmployee);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.weekLog.status === selectedStatus);
    }

    return filtered;
  }, [weekLogs, tasks, teamMembers, selectedEmployee, selectedStatus]);

  // Stats
  const stats = useMemo(() => {
    const pending = submissions.filter(s => s.weekLog.status === 'Submitted').length;
    const approved = submissions.filter(s => s.weekLog.status === 'Approved').length;
    const rework = submissions.filter(s => s.weekLog.status === 'Rework').length;
    return { pending, approved, rework };
  }, [submissions]);

  const toggleSubmissionExpanded = (id: string) => {
    setExpandedSubmissions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Approve day
  const handleApproveDay = async (submission: WeekSubmission, dateStr: string) => {
    if (!employee?.id) return;
    
    setProcessing(true);
    try {
      // Update tasks for this day
      const { error } = await supabase
        .from('hr_work_log_tasks')
        .update({ day_status: 'Approved' })
        .eq('week_log_id', submission.weekLog.id)
        .eq('log_date', dateStr)
        .eq('day_status', 'Submitted');
      
      if (error) throw error;

      // Check if all days are now approved
      const { data: remainingTasks } = await supabase
        .from('hr_work_log_tasks')
        .select('day_status')
        .eq('week_log_id', submission.weekLog.id)
        .neq('day_status', 'Approved');

      if (!remainingTasks || remainingTasks.length === 0) {
        // All approved, update week
        await supabase
          .from('hr_work_log_weeks')
          .update({
            status: 'Approved',
            approved_by: employee.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', submission.weekLog.id);
      }

      toast({ title: `${format(parseISO(dateStr), 'EEEE')} approved` });
      fetchWorkLogs();
    } catch (error: any) {
      console.error('Error approving day:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve day',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Approve entire week
  const handleApproveWeek = async () => {
    if (!selectedSubmission || !employee?.id) return;
    
    setProcessing(true);
    try {
      // Update all tasks
      await supabase
        .from('hr_work_log_tasks')
        .update({ day_status: 'Approved' })
        .eq('week_log_id', selectedSubmission.weekLog.id)
        .eq('day_status', 'Submitted');

      // Update week
      await supabase
        .from('hr_work_log_weeks')
        .update({
          status: 'Approved',
          approved_by: employee.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.weekLog.id);

      // Create notification
      await supabase.from('hr_notifications').insert({
        employee_id: selectedSubmission.employee.id,
        type: 'work_log_approved',
        title: 'Work Log Approved',
        message: `Your work log for week ${format(parseISO(selectedSubmission.weekLog.week_start_date), 'MMM d')} - ${format(parseISO(selectedSubmission.weekLog.week_end_date), 'MMM d')} has been approved`,
        link: '/app/work-log',
      });

      // Send email
      sendWorkLogEmail(
        selectedSubmission.employee.id,
        employee.full_name,
        `${format(parseISO(selectedSubmission.weekLog.week_start_date), 'MMM d')} - ${format(parseISO(selectedSubmission.weekLog.week_end_date), 'MMM d')}`,
        true,
        approveComment || undefined
      );

      toast({ title: 'Week approved successfully' });
      setShowApproveModal(false);
      setApproveComment('');
      setSelectedSubmission(null);
      fetchWorkLogs();
    } catch (error: any) {
      console.error('Error approving week:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve week',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  // Send day for rework
  const handleReworkDay = async () => {
    if (!selectedSubmission || !selectedDay || !employee?.id || reworkComment.trim().length < 10) return;
    
    setProcessing(true);
    try {
      // Update tasks for this day
      await supabase
        .from('hr_work_log_tasks')
        .update({ 
          day_status: 'Rework',
          rework_comment: reworkComment.trim(),
        })
        .eq('week_log_id', selectedSubmission.weekLog.id)
        .eq('log_date', selectedDay);

      // Update week status
      await supabase
        .from('hr_work_log_weeks')
        .update({
          status: 'Rework',
          rework_comment: reworkComment.trim(),
        })
        .eq('id', selectedSubmission.weekLog.id);

      // Create notification
      await supabase.from('hr_notifications').insert({
        employee_id: selectedSubmission.employee.id,
        type: 'work_log_rework',
        title: 'Work Log Rework Required',
        message: `Your work log for ${format(parseISO(selectedDay), 'EEEE, MMM d')} needs rework: ${reworkComment.trim().substring(0, 50)}...`,
        link: '/app/work-log',
      });

      // Send email
      sendWorkLogEmail(
        selectedSubmission.employee.id,
        employee.full_name,
        format(parseISO(selectedDay), 'EEEE, MMM d'),
        false,
        reworkComment.trim()
      );

      toast({ title: 'Rework request sent' });
      setShowReworkModal(false);
      setReworkComment('');
      setSelectedSubmission(null);
      setSelectedDay(null);
      fetchWorkLogs();
    } catch (error: any) {
      console.error('Error sending rework:', error);
      toast({
        title: 'Error',
        description: 'Failed to send rework request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Team Work Logs
        </h1>
        <p className="text-muted-foreground">Review and approve your team's work logs</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <RefreshCw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rework}</p>
              <p className="text-sm text-muted-foreground">Sent for Rework</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Employees</SelectItem>
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rework">Rework</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Label>Week</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="current">This Week</SelectItem>
                  <SelectItem value="last">Last Week</SelectItem>
                  <SelectItem value="last2">Last 2 Weeks</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No work logs found</p>
              <p className="text-sm">Adjust your filters or wait for team submissions</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => (
            <Card key={submission.weekLog.id}>
              <Collapsible
                open={expandedSubmissions.includes(submission.weekLog.id)}
                onOpenChange={() => toggleSubmissionExpanded(submission.weekLog.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-full">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{submission.employee.full_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(submission.weekLog.week_start_date), 'MMM d')} - {format(parseISO(submission.weekLog.week_end_date), 'MMM d, yyyy')}
                            {' • '}{formatMinutes(submission.weekLog.total_minutes)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getStatusColor(submission.weekLog.status)}>
                          {submission.weekLog.status}
                        </Badge>
                        {expandedSubmissions.includes(submission.weekLog.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {/* Day-wise breakdown */}
                    <div className="space-y-3 mb-4">
                      {submission.dayBreakdown.map(day => (
                        <div key={day.date} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{day.dayName}</span>
                              <span className="text-sm text-muted-foreground">
                                ({formatMinutes(day.totalMinutes)})
                              </span>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(day.status)}`}>
                                {day.status}
                              </Badge>
                            </div>
                            {day.status === 'Submitted' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveDay(submission, day.date)}
                                  disabled={processing}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600"
                                  onClick={() => {
                                    setSelectedSubmission(submission);
                                    setSelectedDay(day.date);
                                    setShowReworkModal(true);
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Rework
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {day.tasks.length > 0 ? (
                            <div className="space-y-2">
                              {day.tasks.map(task => {
                                const isCurrentManager = employee?.id === task.assigned_by_id;
                                const assignmentConfig = getAssignmentBadgeConfig(task.assigned_by_type, isCurrentManager);
                                return (
                                  <div key={task.id} className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded">
                                    <div className="p-1 rounded bg-muted">
                                      <CategoryIcon category={task.category} size="sm" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{task.task_title}</span>
                                        <span className="text-muted-foreground font-mono text-xs">
                                          {formatMinutes(task.duration_minutes)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded ${assignmentConfig.className}`}>
                                          {task.assigned_by_type === 'Self' 
                                            ? 'Self-assigned' 
                                            : isCurrentManager 
                                              ? 'Assigned by you' 
                                              : task.assigned_by?.full_name 
                                                ? `${assignmentConfig.label}: ${task.assigned_by.full_name}`
                                                : assignmentConfig.label
                                          }
                                        </span>
                                      </div>
                                      {task.description && (
                                        <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No entries</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Week Actions */}
                    {submission.weekLog.status === 'Submitted' && (
                      <div className="flex gap-2 pt-3 border-t">
                        <Button
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setShowApproveModal(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Entire Week
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Approve Week Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Entire Week</DialogTitle>
            <DialogDescription>
              Approve all days for {selectedSubmission?.employee.full_name}'s work log for the week of {selectedSubmission && format(parseISO(selectedSubmission.weekLog.week_start_date), 'MMM d')} - {selectedSubmission && format(parseISO(selectedSubmission.weekLog.week_end_date), 'MMM d')}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Comment (optional)</Label>
            <Textarea
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveWeek} disabled={processing}>
              {processing ? 'Approving...' : 'Approve Week'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rework Modal */}
      <Dialog open={showReworkModal} onOpenChange={setShowReworkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Rework</DialogTitle>
            <DialogDescription>
              Send {selectedSubmission?.employee.full_name}'s {selectedDay && format(parseISO(selectedDay), 'EEEE')} work log back for rework.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Feedback for Employee *</Label>
            <Textarea
              value={reworkComment}
              onChange={(e) => setReworkComment(e.target.value)}
              placeholder="Explain what needs to be corrected or added..."
              rows={4}
            />
            {reworkComment.trim().length < 10 && reworkComment.length > 0 && (
              <p className="text-xs text-destructive mt-1">Please provide at least 10 characters of feedback</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowReworkModal(false);
              setReworkComment('');
              setSelectedDay(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleReworkDay} 
              disabled={processing || reworkComment.trim().length < 10}
              variant="destructive"
            >
              {processing ? 'Sending...' : 'Send for Rework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamWorkLogsPage;
