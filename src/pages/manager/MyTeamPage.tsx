import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, ChevronRight, Mail, Phone, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  employee_code: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  joining_date: string | null;
}

interface AttendanceRecord {
  employee_id: string;
  attendance_date: string;
  status: string | null;
  punch_in_time: string;
  punch_out_time: string | null;
  total_hours: number | null;
}

const MyTeamPage = () => {
  const { employee: currentEmployee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceRecord[]>>(new Map());
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!currentEmployee?.id) return;

      setLoading(true);

      try {
        // Fetch direct reports
        const { data: directReports, error: reportsError } = await supabase
          .from('hr_employees')
          .select('id, full_name, email, role, status, employee_code, joining_date')
          .eq('manager_id', currentEmployee.id)
          .order('full_name');

        if (reportsError) {
          console.error('Error fetching team:', reportsError);
          setLoading(false);
          return;
        }

        // Fetch employee details for department/designation/phone
        const employeeIds = (directReports || []).map(e => e.id);
        const { data: detailsData } = await supabase
          .from('hr_employee_details')
          .select('employee_id, department, designation, phone')
          .in('employee_id', employeeIds);

        const detailsMap = new Map(
          (detailsData || []).map(d => [d.employee_id, d])
        );

        // Combine data
        const combined: TeamMember[] = (directReports || []).map(emp => {
          const details = detailsMap.get(emp.id);
          return {
            ...emp,
            department: details?.department || null,
            designation: details?.designation || null,
            phone: details?.phone || null,
          };
        });

        setTeamMembers(combined);

        // Fetch attendance for last 7 days for all team members
        if (employeeIds.length > 0) {
          const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
          const today = format(new Date(), 'yyyy-MM-dd');

          const { data: attendanceRecords } = await supabase
            .from('hr_attendance')
            .select('employee_id, attendance_date, status, punch_in_time, punch_out_time, total_hours')
            .in('employee_id', employeeIds)
            .gte('attendance_date', sevenDaysAgo)
            .lte('attendance_date', today)
            .order('attendance_date', { ascending: false });

          // Group attendance by employee
          const attendanceMap = new Map<string, AttendanceRecord[]>();
          (attendanceRecords || []).forEach(record => {
            const existing = attendanceMap.get(record.employee_id) || [];
            existing.push(record);
            attendanceMap.set(record.employee_id, existing);
          });

          setAttendanceData(attendanceMap);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [currentEmployee?.id]);

  const filteredMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const selectedMember = selectedEmployee ? teamMembers.find(e => e.id === selectedEmployee) : null;
  const selectedAttendance = selectedEmployee ? (attendanceData.get(selectedEmployee) || []) : [];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAttendanceStats = (records: AttendanceRecord[]) => {
    const present = records.filter(r => r.status === 'present' || r.status === 'Present').length;
    const partial = records.filter(r => r.status === 'partial' || r.status === 'Partial' || r.status === 'Half Day').length;
    const absent = records.filter(r => r.status === 'absent' || r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'On Leave').length;
    return { present, partial, absent, leave };
  };

  // Generate last 7 days dates
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
    }
    return days;
  };

  const getAttendanceForDate = (employeeId: string, date: string) => {
    const records = attendanceData.get(employeeId) || [];
    const record = records.find(r => r.attendance_date === date);
    return record?.status || null;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="lg:col-span-2 h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Team</h1>
        <p className="text-muted-foreground">View and manage your direct reports</p>
      </div>

      {teamMembers.length === 0 ? (
        <Card className="p-12 text-center glass-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
          <p className="text-muted-foreground">You don't have any direct reports yet.</p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Employee List */}
          <Card className="lg:col-span-1 glass-card overflow-hidden">
            <div className="p-4 border-b border-border space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredMembers.length} team member{filteredMembers.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {filteredMembers.map((member) => {
                const stats = getAttendanceStats(attendanceData.get(member.id) || []);
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedEmployee(member.id)}
                    className={cn(
                      'w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left',
                      selectedEmployee === member.id && 'bg-secondary'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary-foreground">{getInitials(member.full_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{member.designation || member.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                        {member.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Employee Details */}
          <Card className="lg:col-span-2 glass-card">
            {selectedMember ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">{getInitials(selectedMember.full_name)}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-display font-bold text-foreground">{selectedMember.full_name}</h2>
                    <p className="text-muted-foreground">{selectedMember.designation || selectedMember.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedMember.status === 'Active' ? 'default' : 'secondary'}>
                        {selectedMember.status}
                      </Badge>
                      {selectedMember.department && (
                        <Badge variant="outline">{selectedMember.department}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{selectedMember.email}</p>
                    </div>
                  </div>
                  {selectedMember.phone && (
                    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm font-medium">{selectedMember.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedMember.joining_date && (
                    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Joining Date</p>
                        <p className="text-sm font-medium">{format(new Date(selectedMember.joining_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Employee Code</p>
                      <p className="text-sm font-medium">{selectedMember.employee_code || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary (Last 7 Days) */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Attendance (Last 7 Days)</h3>
                  
                  {/* Visual 7-day grid */}
                  <div className="mb-4">
                    <div className="flex gap-2 mb-2">
                      {getLast7Days().map((date) => {
                        const status = getAttendanceForDate(selectedEmployee!, date);
                        const isToday = date === format(new Date(), 'yyyy-MM-dd');
                        return (
                          <div
                            key={date}
                            className={cn(
                              "flex-1 aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all",
                              isToday && "ring-2 ring-primary",
                              status === 'present' || status === 'Present' ? 'bg-green-500 text-white' :
                              status === 'partial' || status === 'Partial' || status === 'Half Day' ? 'bg-yellow-500 text-white' :
                              status === 'absent' || status === 'Absent' ? 'bg-red-500 text-white' :
                              status === 'On Leave' ? 'bg-purple-500 text-white' :
                              status === 'Holiday' ? 'bg-blue-500 text-white' :
                              'bg-muted text-muted-foreground'
                            )}
                            title={`${format(new Date(date), 'EEE, MMM d')}: ${status || 'No record'}`}
                          >
                            <span>{format(new Date(date), 'EEE').slice(0, 2)}</span>
                            <span className="text-[10px] opacity-80">{format(new Date(date), 'd')}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500"></div>
                        <span>Present</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500"></div>
                        <span>Absent</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500"></div>
                        <span>Half Day</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                        <span>Leave</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats summary */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {getAttendanceStats(selectedAttendance).present}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">Present</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                        {getAttendanceStats(selectedAttendance).partial}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">Partial</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {getAttendanceStats(selectedAttendance).absent}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">Absent</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                        {getAttendanceStats(selectedAttendance).leave}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400">Leave</p>
                    </div>
                  </div>

                  {/* Recent Attendance Records */}
                  {selectedAttendance.length > 0 && (
                    <div className="space-y-2">
                      {selectedAttendance.slice(0, 5).map((record) => (
                        <div 
                          key={record.attendance_date}
                          className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{format(new Date(record.attendance_date), 'EEE, MMM d')}</p>
                            <p className="text-xs text-muted-foreground">
                              {record.punch_in_time ? format(new Date(record.punch_in_time), 'h:mm a') : '-'} 
                              {' - '}
                              {record.punch_out_time ? format(new Date(record.punch_out_time), 'h:mm a') : 'In Progress'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {record.total_hours && (
                              <span className="text-sm text-muted-foreground">{record.total_hours.toFixed(1)}h</span>
                            )}
                            <Badge 
                              variant={
                                record.status === 'present' || record.status === 'Present' ? 'default' : 
                                record.status === 'partial' || record.status === 'Partial' ? 'secondary' : 
                                'destructive'
                              }
                            >
                              {record.status || 'present'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a team member to view details</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyTeamPage;
