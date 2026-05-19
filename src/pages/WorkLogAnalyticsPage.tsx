import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  Legend,
} from 'recharts';
import {
  Clock,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Calendar,
  Target,
  Lightbulb,
  User,
  Briefcase,
  Shield,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { TASK_CATEGORIES, getCategoryConfig, type TaskCategory, type WorkLogTask } from '@/types/worklog';
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

const WorkLogAnalyticsPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<WorkLogTask[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'lastMonth'>('month');
  
  useEffect(() => {
    if (employee?.id) {
      fetchAnalyticsData();
    }
  }, [employee?.id, period]);

  const fetchAnalyticsData = async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date = new Date();

      switch (period) {
        case 'week':
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          break;
        case 'lastMonth':
          startDate = startOfMonth(subMonths(new Date(), 1));
          endDate = endOfMonth(subMonths(new Date(), 1));
          break;
        default:
          startDate = startOfMonth(new Date());
      }

      const { data, error } = await supabase
        .from('hr_work_log_tasks')
        .select(`
          *,
          assigned_by:hr_employees!assigned_by_id(full_name)
        `)
        .eq('employee_id', employee.id)
        .gte('log_date', format(startDate, 'yyyy-MM-dd'))
        .lte('log_date', format(endDate, 'yyyy-MM-dd'))
        .order('log_date');

      if (error) throw error;
      setTasks((data || []) as WorkLogTask[]);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalMinutes = tasks.reduce((sum, t) => sum + t.duration_minutes, 0);
    const totalTasks = tasks.length;
    const uniqueDays = new Set(tasks.map(t => t.log_date)).size;

    // Category breakdown
    const categoryBreakdown: Record<TaskCategory, number> = {} as Record<TaskCategory, number>;
    tasks.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.duration_minutes;
    });

    const categoryData = Object.entries(categoryBreakdown)
      .filter(([_, mins]) => mins > 0)
      .map(([category, minutes]) => ({
        name: category,
        value: minutes,
        hours: (minutes / 60).toFixed(1),
        percentage: ((minutes / totalMinutes) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);

    // Assignment breakdown
    const assignmentBreakdown = {
      Self: 0,
      Manager: 0,
      Admin: 0,
      Employee: 0,
    };
    tasks.forEach(t => {
      assignmentBreakdown[t.assigned_by_type] = (assignmentBreakdown[t.assigned_by_type] || 0) + t.duration_minutes;
    });

    const assignmentData = Object.entries(assignmentBreakdown)
      .filter(([_, mins]) => mins > 0)
      .map(([type, minutes]) => ({
        name: type === 'Employee' ? 'Team' : type,
        value: minutes,
        hours: (minutes / 60).toFixed(1),
        percentage: totalMinutes > 0 ? ((minutes / totalMinutes) * 100).toFixed(1) : '0',
      }));

    // Weekly trend (for month view)
    const weeklyData: { week: string; minutes: number }[] = [];
    if (period === 'month' || period === 'lastMonth') {
      const baseDate = period === 'lastMonth' ? subMonths(new Date(), 1) : new Date();
      for (let weekNum = 1; weekNum <= 5; weekNum++) {
        const weekStart = addDays(startOfMonth(baseDate), (weekNum - 1) * 7);
        const weekEnd = addDays(weekStart, 6);
        
        const weekMinutes = tasks
          .filter(t => {
            const taskDate = parseISO(t.log_date);
            return taskDate >= weekStart && taskDate <= weekEnd;
          })
          .reduce((sum, t) => sum + t.duration_minutes, 0);
        
        if (weekMinutes > 0 || weekNum <= 4) {
          weeklyData.push({
            week: `Week ${weekNum}`,
            minutes: weekMinutes,
          });
        }
      }
    }

    // Top tasks
    const taskFrequency: Record<string, { count: number; minutes: number }> = {};
    tasks.forEach(t => {
      const key = t.task_title.toLowerCase().trim();
      if (!taskFrequency[key]) {
        taskFrequency[key] = { count: 0, minutes: 0 };
      }
      taskFrequency[key].count++;
      taskFrequency[key].minutes += t.duration_minutes;
    });

    const topTasks = Object.entries(taskFrequency)
      .map(([title, data]) => ({ title, ...data }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // Insights
    const insights: string[] = [];
    
    if (categoryData.length > 0) {
      const topCategory = categoryData[0];
      insights.push(`Your top activity is ${topCategory.name} at ${topCategory.percentage}% of your time`);
    }

    const avgHoursPerDay = uniqueDays > 0 ? totalMinutes / 60 / uniqueDays : 0;
    if (avgHoursPerDay >= 8) {
      insights.push(`Great work! You're averaging ${avgHoursPerDay.toFixed(1)} hours per day`);
    } else if (avgHoursPerDay > 0) {
      insights.push(`You're logging ${avgHoursPerDay.toFixed(1)} hours per day on average`);
    }

    const selfPercent = totalMinutes > 0 ? (assignmentBreakdown.Self / totalMinutes) * 100 : 0;
    if (selfPercent > 60) {
      insights.push(`${selfPercent.toFixed(0)}% of your work is self-directed`);
    }

    const learningPercent = totalMinutes > 0 ? ((categoryBreakdown.Learning || 0) / totalMinutes) * 100 : 0;
    if (learningPercent < 5 && totalMinutes > 0) {
      insights.push('Consider allocating more time for learning and development');
    }

    return {
      totalMinutes,
      totalTasks,
      uniqueDays,
      avgHoursPerDay,
      categoryData,
      assignmentData,
      weeklyData,
      topTasks,
      insights,
    };
  }, [tasks, period]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Task', 'Category', 'Duration (mins)', 'Assigned By'];
    const rows = tasks.map(t => [
      t.log_date,
      t.task_title,
      t.category,
      t.duration_minutes.toString(),
      t.assigned_by_type === 'Self' ? 'Self' : t.assigned_by?.full_name || t.assigned_by_type,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-log-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Export complete', description: 'CSV file downloaded' });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Work Log Summary'],
      [`Period: ${period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Last Month'}`],
      [`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`],
      [],
      ['Metric', 'Value'],
      ['Total Hours', (analytics.totalMinutes / 60).toFixed(1)],
      ['Total Tasks', analytics.totalTasks],
      ['Days Logged', analytics.uniqueDays],
      ['Avg Hours/Day', analytics.avgHoursPerDay.toFixed(1)],
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
      ['Date', 'Task', 'Category', 'Duration (mins)', 'Duration (hours)', 'Assigned By', 'Description'],
      ...tasks.map(t => [
        t.log_date,
        t.task_title,
        t.category,
        t.duration_minutes,
        (t.duration_minutes / 60).toFixed(2),
        t.assigned_by_type === 'Self' ? 'Self' : t.assigned_by?.full_name || t.assigned_by_type,
        t.description || '',
      ]),
    ];
    const tasksSheet = XLSX.utils.aoa_to_sheet(tasksSheetData);
    XLSX.utils.book_append_sheet(wb, tasksSheet, 'All Tasks');

    // Download
    XLSX.writeFile(wb, `work-log-${period}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Export complete', description: 'Excel file downloaded' });
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Work Log Analytics
          </h1>
          <p className="text-muted-foreground">Insights into your work patterns and time allocation</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(analytics.totalMinutes)}</p>
              <p className="text-sm text-muted-foreground">Total Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.totalTasks}</p>
              <p className="text-sm text-muted-foreground">Tasks Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.uniqueDays}</p>
              <p className="text-sm text-muted-foreground">Days Logged</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.avgHoursPerDay.toFixed(1)}h</p>
              <p className="text-sm text-muted-foreground">Avg/Day</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Time by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
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
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data for this period
              </div>
            )}
            
            {/* Category Legend */}
            <div className="mt-4 space-y-2">
              {analytics.categoryData.slice(0, 5).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={cat.name as TaskCategory} size="sm" />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{cat.hours}h ({cat.percentage}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `${Math.floor(value / 60)}h`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatMinutes(value)}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Weekly data available for month view
              </div>
            )}

            {/* Target Line Info */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Weekly Target</span>
                <span className="font-mono font-medium">40h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment & Insights Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Assignment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Work Assignment Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.assignmentData.map((item) => {
              const percentage = parseFloat(item.percentage);
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {item.name === 'Self' && <User className="h-4 w-4 text-muted-foreground" />}
                      {item.name === 'Manager' && <Briefcase className="h-4 w-4 text-blue-500" />}
                      {item.name === 'Admin' && <Shield className="h-4 w-4 text-purple-500" />}
                      {item.name === 'Team' && <User className="h-4 w-4 text-orange-500" />}
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">{item.hours}h ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        item.name === 'Self' ? 'bg-muted-foreground' :
                        item.name === 'Manager' ? 'bg-blue-500' :
                        item.name === 'Admin' ? 'bg-purple-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {analytics.assignmentData.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.insights.length > 0 ? (
              analytics.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="p-1 bg-primary/10 rounded">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-sm">{insight}</p>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Log more tasks to see insights
              </div>
            )}

            {/* Top Tasks */}
            {analytics.topTasks.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Top Tasks</h4>
                <div className="space-y-2">
                  {analytics.topTasks.map((task, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{task.title}</span>
                      <span className="font-mono text-muted-foreground ml-2">{formatMinutes(task.minutes)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkLogAnalyticsPage;
