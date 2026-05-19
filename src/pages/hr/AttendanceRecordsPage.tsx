import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarCheck, 
  Download, 
  Filter, 
  X, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  total_hours: number | null;
  notes: string | null;
  employee: {
    id: string;
    full_name: string;
    employee_code: string;
    hr_employee_details: {
      department: string | null;
    }[] | null;
  };
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
}

const DEPARTMENTS = ['All', 'NestOps', 'NestHQ', 'NestTech', 'NestLabs', 'Nest People'];
const STATUSES = ['All', 'Present', 'Absent', 'Half Day', 'On Leave', 'Holiday'];
const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];
const ITEMS_PER_PAGE = 50;

const AttendanceRecordsPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Fetch employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, full_name, employee_code')
        .eq('status', 'Active')
        .order('full_name');

      if (!error && data) {
        setEmployees(data);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      // Calculate date range for selected month/year
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

      let query = supabase
        .from('hr_attendance')
        .select(`
          id,
          attendance_date,
          status,
          punch_in_time,
          punch_out_time,
          total_hours,
          notes,
          is_consolidated,
          employee:hr_employees!employee_id(
            id,
            full_name,
            employee_code,
            hr_employee_details(department)
          )
        `)
        .eq('is_consolidated', true)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false });

      // Apply employee filter
      if (selectedEmployee && selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      // Apply status filter
      if (selectedStatus && selectedStatus !== 'All') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        toast({
          title: "Error",
          description: "Failed to fetch attendance records",
          variant: "destructive",
        });
        return;
      }

      // Filter by department client-side (Supabase doesn't support nested filters well)
      let filteredData = (data || []) as AttendanceRecord[];
      if (selectedDepartment && selectedDepartment !== 'All') {
        filteredData = filteredData.filter(record => {
          const dept = record.employee?.hr_employee_details?.[0]?.department;
          return dept === selectedDepartment;
        });
      }

      setAttendanceRecords(filteredData);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchAttendanceRecords();
  };

  const handleClearFilters = () => {
    setSelectedEmployee('all');
    setSelectedDepartment('All');
    setSelectedMonth((new Date().getMonth() + 1).toString());
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedStatus('All');
    setCurrentPage(1);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status?.toLowerCase() === 'present').length;
    const absent = attendanceRecords.filter(r => r.status?.toLowerCase() === 'absent').length;
    const halfDay = attendanceRecords.filter(r => 
      r.status?.toLowerCase() === 'half day' || r.status?.toLowerCase() === 'partial'
    ).length;
    const leave = attendanceRecords.filter(r => r.status?.toLowerCase() === 'on leave').length;
    const percentage = total > 0 ? ((present + halfDay * 0.5) / total * 100).toFixed(1) : '0.0';

    return { total, present, absent, halfDay, leave, percentage };
  }, [attendanceRecords]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return attendanceRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [attendanceRecords, currentPage]);

  const totalPages = Math.ceil(attendanceRecords.length / ITEMS_PER_PAGE);

  // Export to CSV
  const exportToCSV = () => {
    const csv = [
      ['Date', 'Employee Code', 'Employee Name', 'Department', 'Status', 'Punch In', 'Punch Out', 'Hours'],
      ...attendanceRecords.map(record => [
        format(new Date(record.attendance_date), 'dd MMM yyyy'),
        record.employee?.employee_code || '-',
        record.employee?.full_name || '-',
        record.employee?.hr_employee_details?.[0]?.department || '-',
        record.status || '-',
        record.punch_in_time ? format(new Date(record.punch_in_time), 'hh:mm a') : '-',
        record.punch_out_time ? format(new Date(record.punch_out_time), 'hh:mm a') : '-',
        record.total_hours ? `${record.total_hours}h` : '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-records-${selectedYear}-${selectedMonth.padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Normalize status for StatusBadge
  const normalizeStatus = (status: string | null): 'present' | 'absent' | 'partial' | 'pending' => {
    if (!status) return 'absent';
    const s = status.toLowerCase().replace(/\s+/g, '_');
    if (s === 'present') return 'present';
    if (s === 'partial' || s === 'half_day') return 'partial';
    if (s === 'on_leave') return 'pending';
    return 'absent';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-7 w-7 text-primary" />
            Attendance Records
          </h1>
          <p className="text-muted-foreground mt-1">View attendance history for all employees</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2020"
                max="2030"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                Apply
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Half Day</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.halfDay}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Attendance %</p>
                <p className="text-2xl font-bold text-primary">{stats.percentage}%</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Showing {paginatedRecords.length} of {attendanceRecords.length} records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No attendance records found for selected filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>First Punch In</TableHead>
                      <TableHead>Last Punch Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.attendance_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{record.employee?.employee_code || '-'}</TableCell>
                        <TableCell>{record.employee?.full_name || '-'}</TableCell>
                        <TableCell>
                          {record.employee?.hr_employee_details?.[0]?.department || '-'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={normalizeStatus(record.status)} />
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.punch_in_time 
                            ? format(new Date(record.punch_in_time), 'hh:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell className="font-mono">
                          {record.punch_out_time 
                            ? format(new Date(record.punch_out_time), 'hh:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {record.total_hours ? `${record.total_hours}h` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceRecordsPage;
