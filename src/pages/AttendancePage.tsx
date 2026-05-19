import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Clock, LogIn, LogOut, Calendar as CalendarIcon, Loader2, List, CalendarDays, Palmtree } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSaturday, isSunday, isWeekend } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  punch_in_time: string;
  punch_out_time: string | null;
  total_hours: number | null;
  status: string | null;
  notes: string | null;
  is_consolidated: boolean | null;
}

interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
}

const AttendancePage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  
  const [todaySessions, setTodaySessions] = useState<AttendanceRecord[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [monthlyHours, setMonthlyHours] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [totalHoursToday, setTotalHoursToday] = useState<number>(0);
  
  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [monthAttendance, setMonthAttendance] = useState<AttendanceRecord[]>([]);
  const [monthHolidays, setMonthHolidays] = useState<Holiday[]>([]);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch attendance data function - extracted for reuse
  const fetchAttendance = async (showLoading = true) => {
    if (!employee?.id) return;
    
    if (showLoading) setLoading(true);
    try {
      // Fetch all today's sessions (non-consolidated only)
      const { data: todayData, error: todayError } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('attendance_date', today)
        .eq('is_consolidated', false)
        .order('punch_in_time', { ascending: true });

      if (todayError) throw todayError;
      setTodaySessions(todayData || []);

      // Calculate total hours from all sessions
      const total = (todayData || []).reduce((sum, session) => sum + (session.total_hours || 0), 0);
      setTotalHoursToday(total);

      // Fetch last 30 days history (consolidated records only for cleaner view)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: historyData, error: historyError } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('is_consolidated', true)
        .gte('attendance_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .order('attendance_date', { ascending: false });

      if (historyError) throw historyError;
      setAttendanceHistory(historyData || []);

      // Calculate monthly hours from consolidated records (excluding weekends)
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      
      const { data: monthData, error: monthError } = await supabase
        .from('hr_attendance')
        .select('total_hours, attendance_date')
        .eq('employee_id', employee.id)
        .eq('is_consolidated', true)
        .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));

      if (monthError) throw monthError;
      
      // Only count weekday hours
      const totalMonthHours = (monthData || [])
        .filter(record => {
          const date = new Date(record.attendance_date);
          return !isWeekend(date);
        })
        .reduce((sum, record) => sum + (record.total_hours || 0), 0);
      setMonthlyHours(totalMonthHours);

    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch today's attendance and history
  useEffect(() => {
    if (!employee?.id) return;

    fetchAttendance();

    // Set up realtime subscription
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_attendance',
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchAttendance(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id, today]);

  // Fetch calendar data when month changes
  useEffect(() => {
    if (!employee?.id) return;

    const fetchCalendarData = async () => {
      const monthStart = startOfMonth(calendarMonth);
      const monthEnd = endOfMonth(calendarMonth);

      try {
        // Fetch consolidated attendance for the month (for calendar display)
        const { data: attendance } = await supabase
          .from('hr_attendance')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('is_consolidated', true)
          .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));

        setMonthAttendance(attendance || []);

        // Fetch holidays for the month
        const { data: holidays } = await supabase
          .from('hr_holidays')
          .select('id, holiday_date, holiday_name')
          .gte('holiday_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('holiday_date', format(monthEnd, 'yyyy-MM-dd'));

        setMonthHolidays(holidays || []);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
      }
    };

    fetchCalendarData();
  }, [employee?.id, calendarMonth]);

  // Consolidate daily attendance helper
  const consolidateDailyAttendance = async (
    employeeId: string, 
    date: string, 
    sessions: AttendanceRecord[], 
    totalHours: number, 
    finalStatus: string
  ) => {
    // Get first punch in and last punch out
    const sortedByPunchIn = [...sessions].sort(
      (a, b) => new Date(a.punch_in_time).getTime() - new Date(b.punch_in_time).getTime()
    );
    const firstPunchIn = sortedByPunchIn[0]?.punch_in_time;
    
    const sessionsWithPunchOut = sessions.filter(s => s.punch_out_time);
    const sortedByPunchOut = [...sessionsWithPunchOut].sort(
      (a, b) => new Date(b.punch_out_time!).getTime() - new Date(a.punch_out_time!).getTime()
    );
    const lastPunchOut = sortedByPunchOut[0]?.punch_out_time || null;

    // Check if consolidated record exists
    const { data: existing } = await supabase
      .from('hr_attendance')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('attendance_date', date)
      .eq('is_consolidated', true)
      .maybeSingle();

    if (existing) {
      // Update existing consolidated record
      await supabase
        .from('hr_attendance')
        .update({
          punch_in_time: firstPunchIn,
          punch_out_time: lastPunchOut,
          total_hours: parseFloat(totalHours.toFixed(2)),
          status: finalStatus,
        })
        .eq('id', existing.id);
    } else {
      // Create new consolidated record
      await supabase
        .from('hr_attendance')
        .insert({
          employee_id: employeeId,
          attendance_date: date,
          punch_in_time: firstPunchIn,
          punch_out_time: lastPunchOut,
          total_hours: parseFloat(totalHours.toFixed(2)),
          status: finalStatus,
          is_consolidated: true,
        });
    }
  };

  const handlePunchIn = async () => {
    if (!employee?.id) return;

    // Check if there's an active session (punched in but not out)
    const activeSession = todaySessions.find(s => !s.punch_out_time);
    if (activeSession) {
      toast({
        title: 'Already Punched In',
        description: 'Please punch out first before punching in again',
        variant: 'destructive',
      });
      return;
    }

    setPunching(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('hr_attendance')
        .insert({
          employee_id: employee.id,
          attendance_date: today,
          punch_in_time: now,
          status: 'present',
          is_consolidated: false,
        });

      if (error) throw error;

      toast({
        title: 'Punched In',
        description: `Successfully punched in at ${format(new Date(), 'HH:mm')}`,
      });

      // Refresh attendance data immediately
      await fetchAttendance(false);

    } catch (error: any) {
      console.error('Error punching in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to punch in',
        variant: 'destructive',
      });
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!employee?.id) return;

    // Find the active session (punched in but not out)
    const activeSession = todaySessions.find(s => !s.punch_out_time);
    if (!activeSession) {
      toast({
        title: 'Not Punched In',
        description: 'Please punch in first',
        variant: 'destructive',
      });
      return;
    }

    setPunching(true);
    try {
      const now = new Date();
      const punchIn = new Date(activeSession.punch_in_time);
      const hoursWorked = (now.getTime() - punchIn.getTime()) / (1000 * 60 * 60);

      // Update this session's punch out
      const { error } = await supabase
        .from('hr_attendance')
        .update({
          punch_out_time: now.toISOString(),
          total_hours: parseFloat(hoursWorked.toFixed(2)),
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      // Get employee type for status calculation
      const { data: employeeDetails } = await supabase
        .from('hr_employee_details')
        .select('employment_type')
        .eq('employee_id', employee.id)
        .maybeSingle();

      const isPartTime = employeeDetails?.employment_type === 'Part-time';

      // Fetch all sessions for today (including the just-updated one)
      const { data: allSessions } = await supabase
        .from('hr_attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('attendance_date', today)
        .eq('is_consolidated', false);

      // Calculate total hours from all sessions
      const totalHours = (allSessions || []).reduce((sum, session) => {
        if (session.id === activeSession.id) {
          return sum + hoursWorked;
        }
        return sum + (session.total_hours || 0);
      }, 0);

      // Determine final status based on total hours
      let finalStatus = 'Absent';
      if (isPartTime) {
        // Part-time logic: <2h = Absent, 4h+ = Present
        if (totalHours >= 4) {
          finalStatus = 'Present';
        } else {
          finalStatus = 'Absent';
        }
      } else {
        // Full-time logic: <4h = Absent, 4-8h = Half Day, 8h+ = Present
        if (totalHours >= 8) {
          finalStatus = 'Present';
        } else if (totalHours >= 4) {
          finalStatus = 'Half Day';
        } else {
          finalStatus = 'Absent';
        }
      }

      // Update all today's sessions with final status
      await supabase
        .from('hr_attendance')
        .update({ status: finalStatus })
        .eq('employee_id', employee.id)
        .eq('attendance_date', today)
        .eq('is_consolidated', false);

      // Create/Update consolidated record (for HR view and calendar)
      const updatedSessions = (allSessions || []).map(s => 
        s.id === activeSession.id 
          ? { ...s, punch_out_time: now.toISOString(), total_hours: hoursWorked }
          : s
      );
      await consolidateDailyAttendance(employee.id, today, updatedSessions, totalHours, finalStatus);

      toast({
        title: 'Punched Out',
        description: `Total: ${totalHours.toFixed(1)}h - Status: ${finalStatus}`,
      });

      // Refresh attendance data immediately
      await fetchAttendance(false);

    } catch (error: any) {
      console.error('Error punching out:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to punch out',
        variant: 'destructive',
      });
    } finally {
      setPunching(false);
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(new Date(isoString), 'HH:mm');
  };

  // Check if currently punched in (has active session)
  const activeSession = todaySessions.find(s => !s.punch_out_time);
  const isPunchedIn = !!activeSession;

  const getStatus = (): 'present' | 'absent' | 'partial' => {
    if (todaySessions.length === 0) return 'absent';
    if (isPunchedIn) return 'present';
    if (totalHoursToday >= 8) return 'present';
    if (totalHoursToday >= 4) return 'partial';
    return 'absent';
  };

  // Stats calculations - exclude weekends from history
  const weekdayHistory = attendanceHistory.filter(r => {
    const date = new Date(r.attendance_date);
    return !isWeekend(date);
  });
  
  const presentDays = weekdayHistory.filter(r => 
    r.status?.toLowerCase() === 'present'
  ).length;
  const partialDays = weekdayHistory.filter(r => 
    r.status?.toLowerCase() === 'half day' || r.status?.toLowerCase() === 'partial'
  ).length;

  // Calendar helper functions
  const getDateStatus = (date: Date): 'present' | 'absent' | 'partial' | 'holiday' | 'leave' | 'weekend' | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const todayDate = new Date();
    
    // Future dates - no status
    if (date > todayDate) return null;
    
    // Check if weekend
    const isWeekendDay = isSaturday(date) || isSunday(date);
    
    // Check if holiday
    const holiday = monthHolidays.find(h => h.holiday_date === dateStr);
    if (holiday) return 'holiday';
    
    // Check attendance (consolidated records)
    const attendance = monthAttendance.find(a => a.attendance_date === dateStr);
    if (attendance && attendance.status) {
      const status = attendance.status.toLowerCase().replace(/\s+/g, '_');
      if (status === 'present') return 'present';
      if (status === 'partial' || status === 'half_day') return 'partial';
      if (status === 'absent') return 'absent';
      if (status === 'leave' || status === 'on_leave') return 'leave';
    }
    
    // If weekend with no attendance record, show as weekend (not absent)
    if (isWeekendDay) return 'weekend';
    
    // Weekday with no record = absent
    return 'absent';
  };

  const getHolidayName = (date: Date): string | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = monthHolidays.find(h => h.holiday_date === dateStr);
    return holiday?.holiday_name || null;
  };

  const getTooltipText = (date: Date): string => {
    const status = getDateStatus(date);
    const holidayName = getHolidayName(date);
    
    if (holidayName) return `Holiday: ${holidayName}`;
    if (status === 'weekend') return 'Non-Working Day (Weekend)';
    if (status === 'present') return 'Present';
    if (status === 'partial') return 'Half Day';
    if (status === 'absent') return 'Absent';
    if (status === 'leave') return 'On Leave';
    return '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground">Track your daily punch in and punch out times</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Present Days (30 Days)" 
          value={presentDays} 
          icon={CalendarIcon}
        />
        <StatCard 
          title="Half Days" 
          value={partialDays} 
          icon={Clock}
        />
        <StatCard 
          title="Monthly Hours" 
          value={`${monthlyHours.toFixed(1)}h`} 
          icon={Clock}
        />
        <StatCard 
          title="Avg Hours/Day" 
          value={weekdayHistory.length > 0 
            ? `${(monthlyHours / Math.max(presentDays + partialDays, 1)).toFixed(1)}h` 
            : '--'} 
          icon={Clock}
        />
      </div>

      {/* Today's Attendance */}
      <Card className="p-8 glass-card">
        <div className="space-y-6">
          {/* Current Date & Time */}
          <div className="text-center">
            <p className="text-4xl font-mono font-bold text-primary mb-2">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-lg font-medium text-foreground">
              {format(currentTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Status */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <StatusBadge status={getStatus()} className="text-base px-4 py-1" />
              {isPunchedIn && (
                <Badge className="bg-green-500 text-white">Currently Active</Badge>
              )}
            </div>
            {isPunchedIn && activeSession && (
              <p className="text-sm text-muted-foreground mt-2">
                Punched in at {formatTime(activeSession.punch_in_time)}
              </p>
            )}
          </div>

          {/* Punch Buttons */}
          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              onClick={handlePunchIn}
              disabled={isPunchedIn || punching}
              className="min-w-40 bg-green-600 hover:bg-green-700 text-white"
            >
              {punching && !isPunchedIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              Punch In
            </Button>
            <Button 
              onClick={handlePunchOut}
              disabled={!isPunchedIn || punching}
              className="min-w-40 bg-red-600 hover:bg-red-700 text-white"
            >
              {punching && isPunchedIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              Punch Out
            </Button>
          </div>
          
          {isPunchedIn && (
            <p className="text-sm text-muted-foreground text-center">
              You can punch out anytime. Work hours will be calculated automatically.
            </p>
          )}

          {/* Today's Sessions */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Today's Sessions</p>
            {todaySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((session, index) => (
                  <div key={session.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {formatTime(session.punch_in_time)} 
                          {session.punch_out_time ? ` → ${formatTime(session.punch_out_time)}` : ''}
                        </p>
                        {!session.punch_out_time && (
                          <p className="text-xs text-green-600 dark:text-green-400">Active</p>
                        )}
                      </div>
                    </div>
                    {session.total_hours && (
                      <Badge variant="outline">{session.total_hours.toFixed(2)}h</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {todaySessions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Hours Today</span>
                  <span className="text-lg font-bold text-primary">{totalHoursToday.toFixed(2)}h</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalHoursToday >= 8 ? '✅ Present' : totalHoursToday >= 4 ? '⚠️ Half Day' : '❌ Absent (Apply regularization if needed)'}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Attendance History - Tabbed View */}
      <Card className="glass-card overflow-hidden">
        <Tabs defaultValue="list" className="w-full">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="font-semibold text-foreground">Attendance History</h2>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar View
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="m-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>First Punch In</TableHead>
                    <TableHead>Last Punch Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.attendance_date), 'EEE, MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatTime(record.punch_in_time)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatTime(record.punch_out_time)}
                        </TableCell>
                        <TableCell className="font-mono font-bold">
                          {record.total_hours ? `${record.total_hours}h` : '--'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={
                            (() => {
                              const status = record.status?.toLowerCase().replace(/\s+/g, '_');
                              if (status === 'present') return 'present';
                              if (status === 'partial' || status === 'half_day') return 'partial';
                              if (status === 'absent') return 'absent';
                              return 'absent';
                            })()
                          } />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="m-0 p-4">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Legend */}
              <Card className="p-4 lg:w-48 flex-shrink-0">
                <h3 className="font-semibold text-sm mb-3">Legend</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40 border border-green-200"></div>
                    <span className="text-sm">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/40 border border-red-200"></div>
                    <span className="text-sm">Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-200"></div>
                    <span className="text-sm">Half Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-200"></div>
                    <span className="text-sm">Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/40 border border-purple-200"></div>
                    <span className="text-sm">On Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700/40 border border-slate-300 flex items-center justify-center">
                      <Palmtree className="h-2.5 w-2.5 text-slate-500" />
                    </div>
                    <span className="text-sm">Weekend</span>
                  </div>
                </div>
              </Card>

              {/* Calendar */}
              <div className="flex-1">
                <TooltipProvider>
                  <Calendar
                    mode="single"
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    className="pointer-events-auto"
                    modifiers={{
                      present: (date) => getDateStatus(date) === 'present',
                      absent: (date) => getDateStatus(date) === 'absent',
                      partial: (date) => getDateStatus(date) === 'partial',
                      holiday: (date) => getDateStatus(date) === 'holiday',
                      leave: (date) => getDateStatus(date) === 'leave',
                      weekend: (date) => getDateStatus(date) === 'weekend',
                    }}
                    modifiersClassNames={{
                      present: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
                      absent: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
                      partial: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200',
                      holiday: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
                      leave: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200',
                      weekend: 'bg-slate-200 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400',
                    }}
                  />
                </TooltipProvider>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default AttendancePage;
