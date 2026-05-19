import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CategoryIcon } from '@/components/worklog/CategoryIcon';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  Clock,
  TrendingUp,
  Download,
  AlertTriangle,
  Award,
  Briefcase,
  User,
  Shield,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { TASK_CATEGORIES, type TaskCategory, type WorkLogTask } from '@/types/worklog';
import * as XLSX from 'xlsx';

const COLORS = {
  Meeting: '#3b82f6',
  Development: '#10b981',
  Support: '#ef4444',
  Learning: '#8b5cf6',
  Documentation: '#f59e0b',
  Design: '#ec4899',
  Review: '#06b6d4',
  Planning: '#6366f1',
  Admin: '#64748b',
  Other: '#9ca3af',
};

const formatMinutes = (minutes: number): string => {
  if (minutes === 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
}

interface MemberStats {
  id: string;
  name: string;
  totalMinutes: number;
  taskCount: number;
  categoryBreakdown: Record<TaskCategory, number>;
  assignmentBreakdown: Record<string, number>;
}

const TeamAnalyticsPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allTasks, setAllTasks] = useState<WorkLogTask[]>([]);
  const [period, setPeriod] = useState<'month' | 'lastMonth'>('month');
  
  useEffect(() => {
    if (employee?.id) {
      fetchTeamData();
    }
  }, [employee?.id, period, role]);

  const fetchTeamData = async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (period === 'month') {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      } else {
        startDate = startOfMonth(subMonths(new Date(), 1));
        endDate = endOfMonth(subMonths(new Date(), 1));
      }

      // Fetch team members based on role
      let membersQuery = supabase
        .from('hr_employees')
        .select('id, full_name, role')
        .eq('status', 'Active');

      if (role === 'Manager') {
        // Manager sees their direct reports
        membersQuery = membersQuery.eq('manager_id', employee.id);
      }

      const { data: members, error: membersError } = await membersQuery;
      if (membersError) throw membersError;

      setTeamMembers(members || []);

      // Fetch tasks for all team members
      const memberIds = (members || []).map(m => m.id);
      if (memberIds.length === 0) {
        setAllTasks([]);
        setLoading(false);
        return;
      }

      const { data: tasks, error: tasksError } = await supabase
        .from('hr_work_log_tasks')
        .select(`
          *,
          assigned_by:hr_employees!assigned_by_id(full_name)
        `)
        .in('employee_id', memberIds)
        .gte('log_date', format(startDate, 'yyyy-MM-dd'))
        .lte('log_date', format(endDate, 'yyyy-MM-dd'))
        .order('log_date');

      if (tasksError) throw tasksError;
      setAllTasks((tasks || []) as WorkLogTask[]);
    } catch (error: any) {
      console.error('Error fetching team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate team analytics
  const analytics = useMemo(() => {
    const totalMinutes = allTasks.reduce((sum, t) => sum + t.duration_minutes, 0);
    const totalTasks = allTasks.length;

    // Member stats
    const memberStats: MemberStats[] = teamMembers.map(member => {
      const memberTasks = allTasks.filter(t => t.employee_id === member.id);
      const memberMinutes = memberTasks.reduce((sum, t) => sum + t.duration_minutes, 0);
      
      const categoryBreakdown: Record<TaskCategory, number> = {} as Record<TaskCategory, number>;
      const assignmentBreakdown: Record<string, number> = { Self: 0, Manager: 0, Admin: 0, Employee: 0 };
      
      memberTasks.forEach(t => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.duration_minutes;
        assignmentBreakdown[t.assigned_by_type] = (assignmentBreakdown[t.assigned_by_type] || 0) + t.duration_minutes;
      });

      return {
        id: member.id,
        name: member.full_name,
        totalMinutes: memberMinutes,
        taskCount: memberTasks.length,
        categoryBreakdown,
        assignmentBreakdown,
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Team category breakdown
    const teamCategoryBreakdown: Record<TaskCategory, number> = {} as Record<TaskCategory, number>;
    allTasks.forEach(t => {
      teamCategoryBreakdown[t.category] = (teamCategoryBreakdown[t.category] || 0) + t.duration_minutes;
    });

    const categoryData = Object.entries(teamCategoryBreakdown)
      .filter(([_, mins]) => mins > 0)
      .map(([category, minutes]) => ({
        name: category,
        value: minutes,
        hours: (minutes / 60).toFixed(1),
        percentage: totalMinutes > 0 ? ((minutes / totalMinutes) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.value - a.value);

    // Assignment by manager
    let managerAssigned = 0;
    let selfAssigned = 0;
    let adminAssigned = 0;
    
    allTasks.forEach(t => {
      if (t.assigned_by_type === 'Manager') managerAssigned += t.duration_minutes;
      else if (t.assigned_by_type === 'Self') selfAssigned += t.duration_minutes;
      else if (t.assigned_by_type === 'Admin') adminAssigned += t.duration_minutes;
    });

    // Alerts
    const alerts: { type: 'warning' | 'info'; message: string }[] = [];
    memberStats.forEach(m => {
      // Weekly target is 40h = 2400 mins, monthly ~160h = 9600 mins
      const monthlyTarget = 9600;
      if (m.totalMinutes < monthlyTarget * 0.7) {
        alerts.push({ type: 'warning', message: `${m.name} is below target (${formatMinutes(m.totalMinutes)} logged)` });
      }
    });

    return {
      totalMinutes,
      totalTasks,
      memberStats,
      categoryData,
      managerAssigned,
      selfAssigned,
      adminAssigned,
      avgPerMember: memberStats.length > 0 ? totalMinutes / memberStats.length : 0,
      alerts,
    };
  }, [allTasks, teamMembers]);

  const handleExportExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Team Summary
    const summaryData = [
      ['Team Work Log Summary'],
      [`Period: ${period === 'month' ? 'This Month' : 'Last Month'}`],
      [`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
      [],
      ['Member', 'Total Hours', 'Tasks', 'Avg/Task'],
      ...analytics.memberStats.map(m => [
        m.name,
        (m.totalMinutes / 60).toFixed(1),
        m.taskCount,
        m.taskCount > 0 ? (m.totalMinutes / 60 / m.taskCount).toFixed(1) : 0,
      ]),
      [],
      ['Total', (analytics.totalMinutes / 60).toFixed(1), analytics.totalTasks],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Sheet 2: Category Breakdown
    const categorySheetData = [
      ['Category Breakdown'],
      [],
      ['Category', 'Hours', 'Percentage'],
      ...analytics.categoryData.map(c => [c.name, c.hours, `${c.percentage}%`]),
    ];
    const categorySheet = XLSX.utils.aoa_to_sheet(categorySheetData);
    XLSX.utils.book_append_sheet(wb, categorySheet, 'By Category');

    // Sheet 3: All Tasks
    const tasksSheetData = [
      ['Date', 'Employee', 'Task', 'Category', 'Duration (mins)', 'Assigned By'],
      ...allTasks.map(t => {
        const member = teamMembers.find(m => m.id === t.employee_id);
        return [
          t.log_date,
          member?.full_name || 'Unknown',
          t.task_title,
          t.category,
          t.duration_minutes,
          t.assigned_by_type === 'Self' ? 'Self' : t.assigned_by?.full_name || t.assigned_by_type,
        ];
      }),
    ];
    const tasksSheet = XLSX.utils.aoa_to_sheet(tasksSheetData);
    XLSX.utils.book_append_sheet(wb, tasksSheet, 'All Tasks');

    // Download
    XLSX.writeFile(wb, `team-analytics-${period}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Export complete', description: 'Excel file downloaded' });
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Work Analytics
          </h1>
          <p className="text-muted-foreground">
            {role === 'Admin' ? 'Organization-wide' : 'Your team\'s'} work patterns and insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{teamMembers.length}</p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(analytics.totalMinutes)}</p>
              <p className="text-sm text-muted-foreground">Total Hours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(Math.round(analytics.avgPerMember))}</p>
              <p className="text-sm text-muted-foreground">Avg per Member</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Member Hours</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.memberStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, analytics.memberStats.length * 40)}>
              <BarChart data={analytics.memberStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => formatMinutes(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar 
                  dataKey="totalMinutes" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No team data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category & Assignment Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Team Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Time by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                    >
                      {analytics.categoryData.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name as TaskCategory] || '#9ca3af'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatMinutes(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.categoryData.slice(0, 5).map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <CategoryIcon category={cat.name as TaskCategory} size="sm" />
                        <span>{cat.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{cat.hours}h</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Assignment Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Work Assignment Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Self-Assigned</span>
                </div>
                <span className="font-mono font-medium">{formatMinutes(analytics.selfAssigned)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  <span>Manager-Assigned</span>
                </div>
                <span className="font-mono font-medium">{formatMinutes(analytics.managerAssigned)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <span>Admin-Assigned</span>
                </div>
                <span className="font-mono font-medium">{formatMinutes(analytics.adminAssigned)}</span>
              </div>
            </div>

            {analytics.totalMinutes > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Team autonomy: {((analytics.selfAssigned / analytics.totalMinutes) * 100).toFixed(0)}% self-directed work
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.memberStats.slice(0, 5).map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono">{formatMinutes(member.totalMinutes)}</span>
                    <span className="text-xs text-muted-foreground ml-2">({member.taskCount} tasks)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.alerts.length > 0 ? (
              <div className="space-y-2">
                {analytics.alerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg text-sm ${
                      alert.type === 'warning' ? 'bg-orange-50 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                      'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    }`}
                  >
                    {alert.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                <Award className="h-8 w-8 mb-2 text-green-500" />
                <p>All team members are on track!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamAnalyticsPage;
