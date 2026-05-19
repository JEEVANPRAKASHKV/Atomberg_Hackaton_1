import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, addDays, parseISO, subWeeks, addWeeks } from 'date-fns';
import type { WorkLogWeek, WorkLogTask, DayTasks, WeekSummary, TaskCategory } from '@/types/worklog';

const getMonday = (date: Date): Date => startOfWeek(date, { weekStartsOn: 1 });
const getFriday = (date: Date): Date => addDays(getMonday(date), 4);

export const useWorkLog = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [weekLog, setWeekLog] = useState<WorkLogWeek | null>(null);
  const [tasks, setTasks] = useState<WorkLogTask[]>([]);
  const [employees, setEmployees] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  const weekEndStr = format(getFriday(currentWeekStart), 'yyyy-MM-dd');

  // Fetch employees for "assigned by" dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('hr_employees')
        .select('id, full_name, role')
        .eq('status', 'Active')
        .order('full_name');
      setEmployees(data || []);
    };
    fetchEmployees();
  }, []);

  // Fetch week log and tasks
  const fetchWeekData = useCallback(async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      // Get or create week log
      let { data: week, error: weekError } = await supabase
        .from('hr_work_log_weeks')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('week_start_date', weekStartStr)
        .single();

      if (weekError && weekError.code === 'PGRST116') {
        // Week doesn't exist, create it
        const { data: newWeek, error: createError } = await supabase
          .from('hr_work_log_weeks')
          .insert({
            employee_id: employee.id,
            week_start_date: weekStartStr,
            week_end_date: weekEndStr,
            status: 'Draft',
            total_minutes: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        week = newWeek;
      } else if (weekError) {
        throw weekError;
      }

      setWeekLog(week as WorkLogWeek);

      // Fetch tasks for this week
      if (week) {
        const { data: taskData, error: taskError } = await supabase
          .from('hr_work_log_tasks')
          .select(`
            *,
            assigned_by:hr_employees!assigned_by_id(full_name)
          `)
          .eq('week_log_id', week.id)
          .order('log_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (taskError) throw taskError;
        setTasks((taskData || []) as WorkLogTask[]);
      }
    } catch (error: any) {
      console.error('Error fetching week data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch work log data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [employee?.id, weekStartStr, weekEndStr, toast]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  // Navigate weeks
  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(getMonday(new Date()));
  const goToWeek = (date: Date) => setCurrentWeekStart(getMonday(date));

  // Get day-by-day breakdown
  const getDayTasks = useCallback((): DayTasks[] => {
    const days: DayTasks[] = [];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (let i = 0; i < 5; i++) {
      const date = addDays(currentWeekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.log_date === dateStr);
      const totalMinutes = dayTasks.reduce((sum, t) => sum + t.duration_minutes, 0);
      
      // Determine day status
      let status: DayTasks['status'] = 'NoEntry';
      if (dayTasks.length > 0) {
        if (dayTasks.some(t => t.day_status === 'Rework')) status = 'Rework';
        else if (dayTasks.every(t => t.day_status === 'Approved')) status = 'Approved';
        else if (dayTasks.every(t => t.day_status === 'Submitted')) status = 'Submitted';
        else status = 'Draft';
      }

      const reworkComment = dayTasks.find(t => t.rework_comment)?.rework_comment;

      days.push({
        date,
        dateStr,
        dayName: dayNames[i],
        tasks: dayTasks,
        totalMinutes,
        status,
        reworkComment,
      });
    }
    
    return days;
  }, [currentWeekStart, tasks]);

  // Get week summary
  const getWeekSummary = useCallback((): WeekSummary => {
    const totalMinutes = tasks.reduce((sum, t) => sum + t.duration_minutes, 0);
    const categoryBreakdown: Record<TaskCategory, number> = {} as Record<TaskCategory, number>;
    
    tasks.forEach(t => {
      categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.duration_minutes;
    });

    const daysWithEntries = new Set(tasks.map(t => t.log_date)).size;

    return {
      totalMinutes,
      targetMinutes: 2400, // 40 hours
      categoryBreakdown,
      daysWithEntries,
    };
  }, [tasks]);

  // Add task
  const addTask = async (taskData: {
    log_date: string;
    task_title: string;
    category: TaskCategory;
    duration_minutes: number;
    assigned_by_type: 'Self' | 'Employee' | 'Manager' | 'Admin';
    assigned_by_id: string | null;
    description: string | null;
  }) => {
    if (!weekLog || !employee?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('hr_work_log_tasks')
        .insert({
          week_log_id: weekLog.id,
          employee_id: employee.id,
          ...taskData,
          day_status: 'Draft',
        });

      if (error) throw error;
      
      await fetchWeekData();
      toast({ title: 'Task added successfully' });
      return true;
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast({
        title: 'Error',
        description: 'Failed to add task',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Update task
  const updateTask = async (taskId: string, updates: Partial<WorkLogTask>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('hr_work_log_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchWeekData();
      toast({ title: 'Task updated successfully' });
      return true;
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Delete task
  const deleteTask = async (taskId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('hr_work_log_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      await fetchWeekData();
      toast({ title: 'Task deleted successfully' });
      return true;
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Submit day
  const submitDay = async (date: string) => {
    if (!weekLog) return false;

    setSaving(true);
    try {
      // Update all tasks for this day
      const { error } = await supabase
        .from('hr_work_log_tasks')
        .update({ day_status: 'Submitted' })
        .eq('week_log_id', weekLog.id)
        .eq('log_date', date)
        .in('day_status', ['Draft', 'Rework']);

      if (error) throw error;

      // Check if all days are submitted
      await updateWeekStatusIfNeeded();
      await fetchWeekData();
      toast({ title: `${format(parseISO(date), 'EEEE')} submitted successfully` });
      return true;
    } catch (error: any) {
      console.error('Error submitting day:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit day',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Submit entire week
  const submitWeek = async () => {
    if (!weekLog) return false;

    setSaving(true);
    try {
      // Update all tasks
      const { error: taskError } = await supabase
        .from('hr_work_log_tasks')
        .update({ day_status: 'Submitted' })
        .eq('week_log_id', weekLog.id)
        .in('day_status', ['Draft', 'Rework']);

      if (taskError) throw taskError;

      // Update week status
      const { error: weekError } = await supabase
        .from('hr_work_log_weeks')
        .update({
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', weekLog.id);

      if (weekError) throw weekError;

      await fetchWeekData();
      toast({ title: 'Week submitted for review!' });
      return true;
    } catch (error: any) {
      console.error('Error submitting week:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit week',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Helper to update week status based on day statuses
  const updateWeekStatusIfNeeded = async () => {
    if (!weekLog) return;

    const dayTasks = getDayTasks();
    const allSubmittedOrApproved = dayTasks
      .filter(d => d.tasks.length > 0)
      .every(d => d.status === 'Submitted' || d.status === 'Approved');

    if (allSubmittedOrApproved && tasks.length > 0) {
      await supabase
        .from('hr_work_log_weeks')
        .update({
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', weekLog.id);
    }
  };

  // Check if week is editable
  const isWeekEditable = weekLog?.status === 'Draft' || weekLog?.status === 'Rework';
  const isDayEditable = (dayStatus: DayTasks['status']) => 
    dayStatus === 'Draft' || dayStatus === 'Rework' || dayStatus === 'NoEntry';

  return {
    loading,
    saving,
    weekLog,
    tasks,
    employees,
    currentWeekStart,
    weekStartStr,
    weekEndStr,
    autoSaveStatus,
    isWeekEditable,
    isDayEditable,
    getDayTasks,
    getWeekSummary,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToWeek,
    addTask,
    updateTask,
    deleteTask,
    submitDay,
    submitWeek,
    refetch: fetchWeekData,
  };
};
