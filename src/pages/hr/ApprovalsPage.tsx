import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, Calendar, Loader2, Users, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { sendLeaveApprovalEmail } from '@/lib/emailService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface LeaveRequestWithEmployee {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string;
  created_at: string;
  employee: {
    id: string;
    full_name: string;
    employee_code: string | null;
    role: string;
    manager_id: string | null;
  };
}

const ApprovalsPage = () => {
  const { employee, role } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestWithEmployee | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Stats
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedThisMonth, setApprovedThisMonth] = useState(0);
  const [rejectedThisMonth, setRejectedThisMonth] = useState(0);

  const isAdmin = role === 'Admin';

  const fetchLeaveRequests = async () => {
    if (!employee?.id) return;

    try {
      let requests: LeaveRequestWithEmployee[] = [];

      if (isAdmin) {
        // Admin sees leave requests from:
        // 1. Employees who have NO manager assigned
        // 2. Employees whose manager IS this admin
        const { data, error } = await supabase
          .from('hr_leave_requests')
          .select(`
            id,
            leave_type,
            start_date,
            end_date,
            total_days,
            reason,
            status,
            created_at,
            employee:hr_employees!hr_leave_requests_employee_id_fkey(id, full_name, employee_code, role, manager_id)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Filter to show employees without a manager OR employees whose manager is this admin
        requests = (data || [])
          .filter((r: any) => r.employee?.manager_id === null || r.employee?.manager_id === employee.id)
          .map((r: any) => ({
            ...r,
            employee: r.employee,
          }));
      } else {
        // Manager sees only their direct reports' leave requests
        const { data: teamMembers, error: teamError } = await supabase
          .from('hr_employees')
          .select('id')
          .eq('manager_id', employee.id);

        if (teamError) throw teamError;

        const teamIds = teamMembers?.map((m) => m.id) || [];

        if (teamIds.length === 0) {
          setLeaveRequests([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('hr_leave_requests')
          .select(`
            id,
            leave_type,
            start_date,
            end_date,
            total_days,
            reason,
            status,
            created_at,
            employee:hr_employees!hr_leave_requests_employee_id_fkey(id, full_name, employee_code, role, manager_id)
          `)
          .in('employee_id', teamIds)
          .order('created_at', { ascending: false });

        if (error) throw error;

        requests = (data || []).map((r: any) => ({
          ...r,
          employee: r.employee,
        }));
      }

      setLeaveRequests(requests);

      // Calculate stats
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      setPendingCount(requests.filter((r) => r.status === 'Pending').length);
      setApprovedThisMonth(
        requests.filter(
          (r) =>
            r.status === 'Approved' &&
            parseISO(r.created_at) >= monthStart &&
            parseISO(r.created_at) <= monthEnd
        ).length
      );
      setRejectedThisMonth(
        requests.filter(
          (r) =>
            r.status === 'Rejected' &&
            parseISO(r.created_at) >= monthStart &&
            parseISO(r.created_at) <= monthEnd
        ).length
      );
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [employee?.id, role]);

  // Realtime subscription
  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel('approvals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_leave_requests',
        },
        () => {
          fetchLeaveRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id, role]);

  const handleApprove = async (request: LeaveRequestWithEmployee) => {
    if (!employee?.id) return;

    setProcessingId(request.id);
    try {
      // Step 1: Update leave request to Approved
      const { error } = await supabase
        .from('hr_leave_requests')
        .update({
          status: 'Approved',
          approved_by: employee.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      // Step 2: Deduct from employee's leave entitlement
      const currentYear = new Date().getFullYear();
      const { data: entitlement } = await supabase
        .from('hr_leave_entitlements')
        .select('id, used_leaves, remaining_leaves, total_leaves')
        .eq('employee_id', request.employee.id)
        .eq('leave_type', request.leave_type)
        .eq('year', currentYear)
        .maybeSingle();

      if (entitlement) {
        const newUsedLeaves = (entitlement.used_leaves || 0) + request.total_days;
        const newRemainingLeaves = Math.max(0, (entitlement.total_leaves || 0) - newUsedLeaves);
        
        await supabase
          .from('hr_leave_entitlements')
          .update({
            used_leaves: newUsedLeaves,
            remaining_leaves: newRemainingLeaves,
          })
          .eq('id', entitlement.id);
      }

      // Also update hr_employees.leave_balance for system-wide visibility
      const { data: empData } = await supabase
        .from('hr_employees')
        .select('leave_balance')
        .eq('id', request.employee.id)
        .single();

      const currentBalance = empData?.leave_balance || 0;
      const newBalance = Math.max(0, currentBalance - request.total_days);

      await supabase
        .from('hr_employees')
        .update({ 
          leave_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.employee.id);

      // Step 3: Mark leave dates as "On Leave" in attendance
      const startDate = parseISO(request.start_date);
      const endDate = parseISO(request.end_date);
      const leaveRecords = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Skip weekends
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          leaveRecords.push({
            employee_id: request.employee.id,
            attendance_date: format(d, 'yyyy-MM-dd'),
            punch_in_time: new Date().toISOString(),
            status: 'On Leave',
            notes: `${request.leave_type} - Approved`,
          });
        }
      }

      if (leaveRecords.length > 0) {
        // Use upsert to avoid conflicts
        for (const record of leaveRecords) {
          await supabase
            .from('hr_attendance')
            .upsert(record, { onConflict: 'employee_id,attendance_date' });
        }
      }

      // Create notification for employee
      await supabase.from('hr_notifications').insert({
        employee_id: request.employee.id,
        type: 'leave_approved',
        title: 'Leave Approved',
        message: `Your ${request.leave_type} leave from ${format(parseISO(request.start_date), 'MMM d')} to ${format(parseISO(request.end_date), 'MMM d, yyyy')} has been approved by ${employee.full_name}`,
        link: '/app/leaves',
      });

      // Send email notification
      sendLeaveApprovalEmail(
        request.employee.id,
        employee.full_name,
        request.leave_type,
        format(parseISO(request.start_date), 'MMM d, yyyy'),
        format(parseISO(request.end_date), 'MMM d, yyyy'),
        true
      );

      toast({
        title: 'Leave Approved',
        description: `${request.employee.full_name}'s leave approved. Balance deducted by ${request.total_days} days.`,
      });
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve leave request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (request: LeaveRequestWithEmployee) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequest || !employee?.id) return;

    setProcessingId(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('hr_leave_requests')
        .update({
          status: 'Rejected',
          rejection_reason: rejectionReason || null,
          approved_by: employee.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Create notification for employee
      await supabase.from('hr_notifications').insert({
        employee_id: selectedRequest.employee.id,
        type: 'leave_rejected',
        title: 'Leave Rejected',
        message: `Your ${selectedRequest.leave_type} leave from ${format(parseISO(selectedRequest.start_date), 'MMM d')} to ${format(parseISO(selectedRequest.end_date), 'MMM d, yyyy')} has been rejected${rejectionReason ? `: ${rejectionReason}` : ''}`,
        link: '/app/leaves',
      });

      // Send email notification
      sendLeaveApprovalEmail(
        selectedRequest.employee.id,
        employee.full_name,
        selectedRequest.leave_type,
        format(parseISO(selectedRequest.start_date), 'MMM d, yyyy'),
        format(parseISO(selectedRequest.end_date), 'MMM d, yyyy'),
        false,
        rejectionReason
      );

      toast({
        title: 'Leave Rejected',
        description: `${selectedRequest.employee.full_name}'s leave request has been rejected`,
      });
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject leave request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusVariant = (status: string): 'pending' | 'approved' | 'rejected' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  const pendingRequests = leaveRequests.filter((r) => r.status === 'Pending');
  const approvedRequests = leaveRequests.filter((r) => r.status === 'Approved');
  const rejectedRequests = leaveRequests.filter((r) => r.status === 'Rejected');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderRequestsTable = (requests: LeaveRequestWithEmployee[], showActions: boolean) => {
    if (requests.length === 0) {
      return (
        <div className="p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No requests found</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Leave Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Applied On</TableHead>
            {showActions && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{request.employee.full_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{request.employee.employee_code}</span>
                    {request.employee.role && (
                      <Badge variant="outline" className="text-xs">
                        {request.employee.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>{request.leave_type}</TableCell>
              <TableCell>
                {format(parseISO(request.start_date), 'MMM d')} -{' '}
                {format(parseISO(request.end_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>{request.total_days}</TableCell>
              <TableCell className="max-w-[200px] truncate">{request.reason || '-'}</TableCell>
              <TableCell>{format(parseISO(request.created_at), 'MMM d, yyyy')}</TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openRejectDialog(request)}
                      disabled={processingId === request.id}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Leave Approvals</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Review leaves for employees without a manager' : 'Review and approve team leave requests'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-partial/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-status-partial" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-present/10 flex items-center justify-center">
              <ThumbsUp className="w-5 h-5 text-status-present" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{approvedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Approved This Month</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-absent/10 flex items-center justify-center">
              <ThumbsDown className="w-5 h-5 text-status-absent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejectedThisMonth}</p>
              <p className="text-sm text-muted-foreground">Rejected This Month</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="w-4 h-4" />
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card className="glass-card overflow-hidden">
            {renderRequestsTable(pendingRequests, true)}
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card className="glass-card overflow-hidden">
            {renderRequestsTable(approvedRequests, false)}
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card className="glass-card overflow-hidden">
            {renderRequestsTable(rejectedRequests, false)}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <p className="text-sm text-muted-foreground">
                Rejecting {selectedRequest.employee.full_name}'s {selectedRequest.leave_type} request
                for {selectedRequest.total_days} day(s).
              </p>
            )}
            <div className="space-y-2">
              <Label>Rejection Reason (Optional)</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId === selectedRequest?.id}
            >
              {processingId === selectedRequest?.id ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalsPage;