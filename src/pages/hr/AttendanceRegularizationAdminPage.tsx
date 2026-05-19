import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, CheckCircle, XCircle, Loader2, Eye, Search } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { sendRegularizationApprovedEmail, sendRegularizationRejectedEmail } from '@/lib/emailService';

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
  reviewed_by: string | null;
  employee?: {
    full_name: string;
    employee_code: string | null;
  };
}

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

const AttendanceRegularizationAdminPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  // Action state
  const [selectedRequest, setSelectedRequest] = useState<RegularizationRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Stats
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedToday = requests.filter(r => 
    r.status === 'Approved' && 
    r.reviewed_at && 
    new Date(r.reviewed_at).toDateString() === new Date().toDateString()
  ).length;
  const rejectedToday = requests.filter(r => 
    r.status === 'Rejected' && 
    r.reviewed_at && 
    new Date(r.reviewed_at).toDateString() === new Date().toDateString()
  ).length;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_attendance_regularization_requests')
        .select(`
          *,
          employee:hr_employees!employee_id(full_name, employee_code)
        `)
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

  const handleApprove = async () => {
    if (!selectedRequest || !employee?.id) return;

    setProcessing(true);
    try {
      // Map lowercase snake_case status to Title Case for hr_attendance table
      const STATUS_MAP: Record<string, string> = {
        'present': 'Present',
        'absent': 'Absent',
        'half_day': 'Half Day',
        'on_leave': 'On Leave',
        'holiday': 'Holiday',
        'week_off': 'Week Off',
      };

      const requestedStatus = selectedRequest.requested_status.toLowerCase().replace(/\s+/g, '_');
      const dbStatus = STATUS_MAP[requestedStatus];

      if (!dbStatus) {
        throw new Error(
          `Invalid attendance status: "${selectedRequest.requested_status}". Allowed: present, half_day, on_leave`
        );
      }

      // Validate: Cannot regularize future dates
      const attendanceDate = new Date(selectedRequest.attendance_date);
      if (attendanceDate > new Date()) {
        throw new Error('Cannot regularize future dates');
      }

      // Check if attendance record exists
      const { data: existingAttendance } = await supabase
        .from('hr_attendance')
        .select('id')
        .eq('employee_id', selectedRequest.employee_id)
        .eq('attendance_date', selectedRequest.attendance_date)
        .maybeSingle();

      if (existingAttendance) {
        // Update existing attendance record
        const { error: attendanceError } = await supabase
          .from('hr_attendance')
          .update({ 
            status: dbStatus, 
            updated_at: new Date().toISOString(),
            notes: `Regularized: ${selectedRequest.reason}`
          })
          .eq('id', existingAttendance.id);

        if (attendanceError) throw attendanceError;
      } else {
        // Create new attendance record with sensible defaults
        const dateStr = selectedRequest.attendance_date;
        const isHalfDay = dbStatus === 'Half Day';
        const punchIn = new Date(`${dateStr}T09:00:00`).toISOString();
        const punchOut = isHalfDay 
          ? new Date(`${dateStr}T13:00:00`).toISOString()
          : new Date(`${dateStr}T18:00:00`).toISOString();
        const totalHours = isHalfDay ? 4.0 : 9.0;

        const { error: insertError } = await supabase
          .from('hr_attendance')
          .insert({
            employee_id: selectedRequest.employee_id,
            attendance_date: selectedRequest.attendance_date,
            punch_in_time: punchIn,
            punch_out_time: punchOut,
            total_hours: totalHours,
            status: dbStatus,
            notes: `Regularized: ${selectedRequest.reason}`
          });

        if (insertError) throw insertError;
      }

      // Update request status
      const { error: requestError } = await supabase
        .from('hr_attendance_regularization_requests')
        .update({
          status: 'Approved',
          admin_notes: adminNotes || null,
          reviewed_by: employee.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (requestError) throw requestError;

      // Send approval email
      try {
        await sendRegularizationApprovedEmail(
          selectedRequest.employee_id,
          format(new Date(selectedRequest.attendance_date), 'MMMM d, yyyy'),
          employee.full_name,
          formatStatusDisplay(selectedRequest.current_status),
          formatStatusDisplay(selectedRequest.requested_status),
          adminNotes || undefined
        );
      } catch (emailError) {
        console.error('Failed to send regularization approval email:', emailError);
      }

      toast({ title: 'Request approved and attendance updated!' });
      closeAction();
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !employee?.id) return;

    if (!adminNotes.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('hr_attendance_regularization_requests')
        .update({
          status: 'Rejected',
          admin_notes: adminNotes,
          reviewed_by: employee.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send rejection email
      try {
        await sendRegularizationRejectedEmail(
          selectedRequest.employee_id,
          format(new Date(selectedRequest.attendance_date), 'MMMM d, yyyy'),
          employee.full_name,
          adminNotes
        );
      } catch (emailError) {
        console.error('Failed to send regularization rejection email:', emailError);
      }

      toast({ title: 'Request rejected' });
      closeAction();
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const closeAction = () => {
    setSelectedRequest(null);
    setActionType(null);
    setAdminNotes('');
  };

  const filteredRequests = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        r.employee?.full_name?.toLowerCase().includes(search) ||
        r.employee?.employee_code?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Regularization</h1>
        <p className="text-muted-foreground">Review and process employee attendance regularization requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Pending Requests" value={pendingCount} icon={Clock} />
        <StatCard title="Approved Today" value={approvedToday} icon={CheckCircle} />
        <StatCard title="Rejected Today" value={rejectedToday} icon={XCircle} />
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>Review and process regularization requests</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
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
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No regularization requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.employee?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{request.employee?.employee_code}</p>
                        </div>
                      </TableCell>
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
                        {format(new Date(request.requested_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {request.status === 'Pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('approve');
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setActionType('reject');
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('view');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={actionType === 'approve'} onOpenChange={() => closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Approve regularization for {selectedRequest?.employee?.full_name} on{' '}
              {selectedRequest && format(new Date(selectedRequest.attendance_date), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-muted-foreground text-xs">Current Status</Label>
                  <Badge className={attendanceStatusColors[selectedRequest.current_status]}>
                    {formatStatusDisplay(selectedRequest.current_status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Will Change To</Label>
                  <Badge className={attendanceStatusColors[selectedRequest.requested_status]}>
                    {formatStatusDisplay(selectedRequest.requested_status)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Employee's Reason</Label>
                <p className="text-sm mt-1">{selectedRequest.reason}</p>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={() => closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Reject regularization for {selectedRequest?.employee?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm"><strong>Date:</strong> {format(new Date(selectedRequest.attendance_date), 'MMMM d, yyyy')}</p>
                <p className="text-sm mt-1"><strong>Requested Change:</strong> {formatStatusDisplay(selectedRequest.current_status)} → {formatStatusDisplay(selectedRequest.requested_status)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Employee's Reason</Label>
                <p className="text-sm mt-1">{selectedRequest.reason}</p>
              </div>
              <div className="space-y-2">
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Provide reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>Cancel</Button>
            <Button onClick={handleReject} disabled={processing} variant="destructive">
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={actionType === 'view'} onOpenChange={() => closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">{selectedRequest.employee?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedRequest.employee?.employee_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{format(new Date(selectedRequest.attendance_date), 'MMMM d, yyyy')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Current Status</Label>
                  <div className="mt-1">
                    <Badge className={attendanceStatusColors[selectedRequest.current_status]}>
                      {formatStatusDisplay(selectedRequest.current_status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested Status</Label>
                  <div className="mt-1">
                    <Badge className={attendanceStatusColors[selectedRequest.requested_status]}>
                      {formatStatusDisplay(selectedRequest.requested_status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="mt-1 text-sm">{selectedRequest.reason}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={statusColors[selectedRequest.status]}>
                      {selectedRequest.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested On</Label>
                  <p className="mt-1 text-sm">
                    {format(new Date(selectedRequest.requested_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              {selectedRequest.admin_notes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="mt-1 text-sm">{selectedRequest.admin_notes}</p>
                </div>
              )}
              {selectedRequest.reviewed_at && (
                <div>
                  <Label className="text-muted-foreground">Reviewed On</Label>
                  <p className="mt-1 text-sm">
                    {format(new Date(selectedRequest.reviewed_at), 'MMM d, yyyy HH:mm')}
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

export default AttendanceRegularizationAdminPage;