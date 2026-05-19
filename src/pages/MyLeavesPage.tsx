import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Loader2, X, Info } from 'lucide-react';
import { format, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { sendLeaveAppliedEmail } from '@/lib/emailService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
import { useEmployeeGender } from '@/hooks/useEmployeeGender';
import { 
  LEAVE_TYPES, 
  SPECIAL_LEAVE_REASONS, 
  getLeaveTypesForGender, 
  getTotalLeaveDays, 
  getLeaveSummaryText,
  LeaveTypeConfig 
} from '@/lib/leaveTypes';

interface LeaveEntitlement {
  id: string;
  leave_type: string;
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
}

const MyLeavesPage = () => {
  const { employee } = useAuth();
  const { gender, loading: genderLoading } = useEmployeeGender(employee?.id);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [specialLeaveReason, setSpecialLeaveReason] = useState('');

  const currentYear = new Date().getFullYear();
  
  // Get leave types based on gender
  const availableLeaveTypes = getLeaveTypesForGender(gender);
  const selectedLeaveTypeConfig = LEAVE_TYPES.find(lt => lt.value === leaveType);

  const fetchData = async () => {
    if (!employee?.id) return;

    try {
      // Fetch leave entitlements
      const { data: entData, error: entError } = await supabase
        .from('hr_leave_entitlements')
        .select('id, leave_type, total_leaves, used_leaves, remaining_leaves')
        .eq('employee_id', employee.id)
        .eq('year', currentYear);

      if (entError) throw entError;
      setEntitlements(entData || []);

      // Fetch leave requests
      const { data: reqData, error: reqError } = await supabase
        .from('hr_leave_requests')
        .select('id, leave_type, start_date, end_date, total_days, status, reason, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setLeaveRequests(reqData || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employee?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel('leave-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_leave_requests',
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_leave_entitlements',
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id]);

  const getEntitlement = (type: string) => {
    const ent = entitlements.find((e) => e.leave_type === type);
    const config = LEAVE_TYPES.find(lt => lt.value === type);
    return {
      remaining: ent?.remaining_leaves ?? 0,
      total: ent?.total_leaves ?? config?.totalDays ?? 0,
    };
  };

  const calculateWorkingDays = (start: Date, end: Date): number => {
    const days = eachDayOfInterval({ start, end });
    return days.filter((day) => !isWeekend(day)).length;
  };

  const totalDays = startDate && endDate ? calculateWorkingDays(startDate, endDate) : 0;

  const resetForm = () => {
    setLeaveType('');
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
    setSpecialLeaveReason('');
  };

  const handleSubmit = async () => {
    if (!employee?.id || !leaveType || !startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Validate special leave reason
    if (selectedLeaveTypeConfig?.requiresSpecialReason && !specialLeaveReason) {
      toast({
        title: 'Validation Error',
        description: 'Please select a reason for Special Leave',
        variant: 'destructive',
      });
      return;
    }

    const { remaining } = getEntitlement(leaveType);
    if (totalDays > remaining) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${remaining} ${leaveType} days remaining`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Build reason string
      let finalReason = reason;
      if (selectedLeaveTypeConfig?.requiresSpecialReason && specialLeaveReason) {
        finalReason = specialLeaveReason + (reason ? `: ${reason}` : '');
      }

      const { error } = await supabase.from('hr_leave_requests').insert({
        employee_id: employee.id,
        leave_type: leaveType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        total_days: totalDays,
        reason: finalReason || null,
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
            await sendLeaveAppliedEmail(
              manager.email,
              manager.full_name,
              employee.full_name,
              leaveType,
              format(startDate, 'MMMM d, yyyy'),
              format(endDate, 'MMMM d, yyyy'),
              finalReason || 'Not specified'
            );
          }
        } catch (emailError) {
          console.error('Failed to send leave notification email:', emailError);
        }
      }

      toast({
        title: 'Success',
        description: 'Leave request submitted successfully',
      });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('hr_leave_requests')
        .update({ status: 'Cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave request cancelled',
      });
      fetchData();
    } catch (error) {
      console.error('Error cancelling leave request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel leave request',
        variant: 'destructive',
      });
    }
  };

  const getStatusVariant = (status: string): 'pending' | 'approved' | 'rejected' => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  if (loading || genderLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Leaves</h1>
          <p className="text-muted-foreground">View and request time off</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={leaveType} onValueChange={(value) => { setLeaveType(value); setSpecialLeaveReason(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeaveTypes.map((type) => {
                      const { remaining, total } = getEntitlement(type.value);
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            <span className="text-muted-foreground">({remaining}/{total} days)</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedLeaveTypeConfig && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {selectedLeaveTypeConfig.description}
                  </p>
                )}
              </div>

              {/* Show balance for selected leave type */}
              {leaveType && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Available Balance: <span className="font-semibold text-foreground">{getEntitlement(leaveType).remaining} days</span>
                  </p>
                </div>
              )}

              {/* Special Leave Reason */}
              {selectedLeaveTypeConfig?.requiresSpecialReason && (
                <div className="space-y-2">
                  <Label>Occasion *</Label>
                  <Select value={specialLeaveReason} onValueChange={setSpecialLeaveReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Birthday / Parent's Birthday / Spouse Birthday / Child's Birthday / Other" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIAL_LEAVE_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={4}>
                      <CalendarComponent
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                        fromYear={2020}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start" sideOffset={4}>
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => {
                          const minDate = startDate || new Date();
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < minDate || date < today;
                        }}
                        initialFocus
                        className="pointer-events-auto"
                        fromYear={2020}
                        toYear={2030}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total Working Days: <span className="font-semibold text-foreground">{totalDays}</span>
                    <span className="text-xs ml-2">(excluding weekends)</span>
                  </p>
                  {leaveType && totalDays > getEntitlement(leaveType).remaining && (
                    <p className="text-sm text-destructive mt-1">
                      ⚠️ Insufficient balance! You only have {getEntitlement(leaveType).remaining} days remaining.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{selectedLeaveTypeConfig?.requiresSpecialReason ? 'Additional Notes' : 'Reason'}</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={selectedLeaveTypeConfig?.requiresSpecialReason 
                    ? "Any additional notes (optional)..." 
                    : "Enter reason for leave..."}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || (leaveType && totalDays > getEntitlement(leaveType).remaining)}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Summary */}
      <Card className="p-4 glass-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Leave Entitlement</p>
            <p className="text-lg font-semibold text-foreground">{getLeaveSummaryText(gender)}</p>
          </div>
        </div>
      </Card>

      {/* Leave Balance Cards */}
      <TooltipProvider>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {availableLeaveTypes.map((type) => {
            const ent = entitlements.find((e) => e.leave_type === type.value);
            const remaining = ent?.remaining_leaves ?? 0;
            const total = ent?.total_leaves ?? type.totalDays;
            const usedDays = total - remaining;
            return (
              <Card key={type.value} className="p-4 glass-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-sm text-muted-foreground">{type.label}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{type.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {remaining}{' '}
                      <span className="text-sm font-normal text-muted-foreground">/ {total}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">days remaining</p>
                    {usedDays > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {usedDays} days used
                      </p>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${total > 0 ? (remaining / total) * 100 : 0}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Leave Requests History */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">My Leave Requests</h2>
        </div>
        {leaveRequests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied On</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.leave_type}</TableCell>
                  <TableCell>
                    {format(parseISO(request.start_date), 'MMM d')} -{' '}
                    {format(parseISO(request.end_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{request.total_days}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <StatusBadge status={getStatusVariant(request.status)} />
                      {request.status === 'Approved' && (
                        <p className="text-xs text-green-600">
                          {request.total_days} days deducted
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {request.reason || '-'}
                  </TableCell>
                  <TableCell>{format(parseISO(request.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    {request.status === 'Pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No leave requests yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MyLeavesPage;
