import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Loader2, FileEdit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendRegularizationAppliedEmail } from '@/lib/emailService';

interface RegularizationRequest {
  id: string;
  employee_id: string;
  attendance_date: string;
  current_status: string;
  requested_status: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  requested_at: string;
  reviewed_at: string | null;
}

// Use snake_case values for database, display as Title Case
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'on_leave', label: 'On Leave' },
];

// Format snake_case to Title Case for display
const formatStatusDisplay = (status: string): string => {
  const displayMap: Record<string, string> = {
    'present': 'Present',
    'half_day': 'Half Day',
    'on_leave': 'On Leave',
    'absent': 'Absent',
    'no_record': 'No Record',
    'holiday': 'Holiday',
    'week_off': 'Week Off',
  };
  return displayMap[status] || status;
};

const statusColors: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const attendanceStatusColors: Record<string, string> = {
  'present': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Present': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'absent': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Absent': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'partial': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'half_day': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Half Day': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'on_leave': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'On Leave': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'no_record': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  'No Record': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  'holiday': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Holiday': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'week_off': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  'Week Off': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
};

const AttendanceRegularizationPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewRequest, setViewRequest] = useState<RegularizationRequest | null>(null);

  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [requestedStatus, setRequestedStatus] = useState<string>('');
  const [reason, setReason] = useState('');
  const [fetchingStatus, setFetchingStatus] = useState(false);

  const minDate = subDays(new Date(), 30);
  const maxDate = new Date();

  useEffect(() => {
    fetchRequests();
  }, [employee?.id]);

  const fetchRequests = async () => {
    if (!employee?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_attendance_regularization_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load regularization requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentStatus = async (date: Date) => {
    if (!employee?.id) return;

    setFetchingStatus(true);
    try {
      // Check consolidated record first for accurate status
      const { data, error } = await supabase
        .from('hr_attendance')
        .select('status, total_hours')
        .eq('employee_id', employee.id)
        .eq('attendance_date', format(date, 'yyyy-MM-dd'))
        .eq('is_consolidated', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const statusMap: Record<string, string> = {
          present: 'Present',
          Present: 'Present',
          absent: 'Absent',
          Absent: 'Absent',
          partial: 'Half Day',
          'Half Day': 'Half Day',
          leave: 'On Leave',
          'On Leave': 'On Leave',
          Holiday: 'Holiday',
          holiday: 'Holiday',
          'Week Off': 'Week Off',
          'week off': 'Week Off',
        };
        setCurrentStatus(statusMap[data.status] || data.status || 'No Record');
      } else {
        // If no consolidated record, check for any attendance record
        const { data: anyRecord } = await supabase
          .from('hr_attendance')
          .select('status')
          .eq('employee_id', employee.id)
          .eq('attendance_date', format(date, 'yyyy-MM-dd'))
          .limit(1)
          .maybeSingle();
        
        if (anyRecord) {
          setCurrentStatus(anyRecord.status || 'No Record');
        } else {
          setCurrentStatus('No Record');
        }
      }
    } catch (error) {
      console.error('Error fetching current status:', error);
      setCurrentStatus('No Record');
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setRequestedStatus('');
    if (date) {
      fetchCurrentStatus(date);
    } else {
      setCurrentStatus('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee?.id || !selectedDate || !requestedStatus || !reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (reason.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    if (requestedStatus === currentStatus) {
      toast({
        title: 'Validation Error',
        description: 'Requested status cannot be same as current status',
        variant: 'destructive',
      });
      return;
    }

    // Check if pending request exists for this date
    const existingPending = requests.find(
      r => r.attendance_date === format(selectedDate, 'yyyy-MM-dd') && r.status === 'Pending'
    );
    if (existingPending) {
      toast({
        title: 'Duplicate Request',
        description: 'You already have a pending request for this date',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // requestedStatus is already in snake_case (present, half_day, on_leave)
      // currentStatus needs to be converted
      const formattedCurrentStatus = currentStatus.toLowerCase().replace(/\s+/g, '_');

      console.log('Submitting regularization:', { requestedStatus, formattedCurrentStatus });

      if (!requestedStatus) {
        throw new Error('Requested status is required');
      }

      const { error } = await supabase
        .from('hr_attendance_regularization_requests')
        .insert({
          employee_id: employee.id,
          attendance_date: format(selectedDate, 'yyyy-MM-dd'),
          current_status: formattedCurrentStatus,
          requested_status: requestedStatus,
          reason,
          status: 'Pending',
        });

      if (error) throw error;

      // Send email notification to manager if employee has a manager
      if (employee.manager_id) {
        try {
          const { data: manager } = await supabase
            .from('hr_employees')
            .select('email, full_name')
            .eq('id', employee.manager_id)
            .single();

          if (manager) {
            await sendRegularizationAppliedEmail(
              manager.email,
              manager.full_name,
              employee.full_name,
              format(selectedDate, 'MMMM d, yyyy'),
              reason
            );
          }
        } catch (emailError) {
          console.error('Failed to send regularization notification email:', emailError);
        }
      }

      toast({ title: 'Request submitted successfully!' });
      
      // Reset form
      setSelectedDate(undefined);
      setCurrentStatus('');
      setRequestedStatus('');
      setReason('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => 
    statusFilter === 'all' || r.status === statusFilter
  );

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Request Regularization</h1>
        <p className="text-muted-foreground">Request corrections to your attendance records</p>
      </div>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Request Regularization
          </CardTitle>
          <CardDescription>Submit a request to correct your attendance for a specific date</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => 
                        isAfter(startOfDay(date), startOfDay(new Date())) || 
                        isBefore(date, minDate)
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Cannot select future dates or dates older than 30 days</p>
              </div>

              <div className="space-y-2">
                <Label>Current Status</Label>
                <div className="flex items-center gap-2">
                  {fetchingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentStatus ? (
                    <Badge className={attendanceStatusColors[currentStatus] || 'bg-gray-100'}>
                      {currentStatus}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Select a date first</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Requested Status *</Label>
                <Select 
                  value={requestedStatus} 
                  onValueChange={setRequestedStatus}
                  disabled={!selectedDate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS
                      .filter(opt => opt.value !== currentStatus.toLowerCase().replace(/\s+/g, '_'))
                      .map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason * (min 10 characters)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need this correction (e.g., forgot to punch in, system issue)"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{reason.length}/500 characters</p>
            </div>

            <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Requests History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>Your regularization request history</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileEdit className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No regularization requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {format(new Date(request.attendance_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={attendanceStatusColors[request.current_status] || 'bg-gray-100'}>
                          {formatStatusDisplay(request.current_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={attendanceStatusColors[request.requested_status] || 'bg-gray-100'}>
                          {formatStatusDisplay(request.requested_status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.reason}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[request.status]}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.requested_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewRequest(request)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={!!viewRequest} onOpenChange={() => setViewRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Regularization request for {viewRequest && format(new Date(viewRequest.attendance_date), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {viewRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Current Status</Label>
                  <div className="mt-1">
                    <Badge className={attendanceStatusColors[viewRequest.current_status]}>
                      {formatStatusDisplay(viewRequest.current_status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested Status</Label>
                  <div className="mt-1">
                    <Badge className={attendanceStatusColors[viewRequest.requested_status]}>
                      {formatStatusDisplay(viewRequest.requested_status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="mt-1 text-sm">{viewRequest.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[viewRequest.status]}>
                      {viewRequest.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested On</Label>
                  <p className="mt-1 text-sm">
                    {format(new Date(viewRequest.requested_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              {viewRequest.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 text-sm">{viewRequest.admin_notes}</p>
                </div>
              )}
              {viewRequest.reviewed_at && (
                <div>
                  <Label className="text-muted-foreground">Reviewed On</Label>
                  <p className="mt-1 text-sm">
                    {format(new Date(viewRequest.reviewed_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceRegularizationPage;