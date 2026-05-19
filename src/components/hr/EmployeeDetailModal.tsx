import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Mail, Phone, Calendar, Building, MapPin, Briefcase, Hash, UserCog, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeWithDetails {
  id: string;
  employee_code: string | null;
  full_name: string;
  email: string;
  role: string;
  status: string;
  org_id: string;
  manager_id: string | null;
  joining_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  date_of_birth: string | null;
  employment_type: string | null;
  location: string | null;
  address: string | null;
  manager_name: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
}

interface LeaveBalance {
  leave_type: string;
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
}

interface EmployeeDetailModalProps {
  employee: EmployeeWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onUpdate: () => void;
}

export const EmployeeDetailModal = ({
  employee,
  open,
  onOpenChange,
  isAdmin,
  onUpdate,
}: EmployeeDetailModalProps) => {
  // Removed navigate - editing now happens via modal in parent component
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);

  useEffect(() => {
    if (employee && open) {
      fetchLeaveBalances();
    }
  }, [employee, open]);

  const fetchLeaveBalances = async () => {
    if (!employee) return;
    
    const currentYear = new Date().getFullYear();
    const { data } = await supabase
      .from('hr_leave_entitlements')
      .select('leave_type, total_leaves, used_leaves, remaining_leaves')
      .eq('employee_id', employee.id)
      .eq('year', currentYear);
    
    setLeaveBalances(data || []);
  };

  if (!employee) return null;

  const handleToggleStatus = async () => {
    setLoading(true);
    const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
    
    const { error } = await supabase
      .from('hr_employees')
      .update({ status: newStatus })
      .eq('id', employee.id);

    if (error) {
      toast.error('Failed to update status: ' + error.message);
    } else {
      toast.success(`Employee ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
      onUpdate();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    
    // Check if employee has team members
    const { data: teamMembers } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('manager_id', employee.id)
      .limit(1);

    if (teamMembers && teamMembers.length > 0) {
      toast.error('Cannot delete: This employee has team members reporting to them. Please reassign them first.');
      setLoading(false);
      setShowDeleteDialog(false);
      return;
    }

    // Delete auth user via edge function if user_id exists
    if (employee.user_id) {
      const { error: authError } = await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete', user_id: employee.user_id },
      });

      if (authError) {
        console.error('Error deleting auth user:', authError);
        // Continue with HR record deletion even if auth deletion fails
      }
    }
    
    // Delete HR record (cascades to details)
    const { error } = await supabase
      .from('hr_employees')
      .delete()
      .eq('id', employee.id);

    if (error) {
      toast.error('Failed to delete employee: ' + error.message);
    } else {
      toast.success('Employee deleted successfully');
      onUpdate();
      onOpenChange(false);
    }
    setLoading(false);
    setShowDeleteDialog(false);
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-500 hover:bg-purple-600';
      case 'Manager': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-green-500 hover:bg-green-600 text-white';
    }
  };

  const getLeaveColor = (type: string) => {
    if (type.includes('Earned')) return 'bg-blue-100 text-blue-800';
    if (type.includes('Casual')) return 'bg-green-100 text-green-800';
    if (type.includes('Sick')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {employee.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <DialogTitle className="text-xl">{employee.full_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getRoleBadgeClass(employee.role)}>{employee.role}</Badge>
                  <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Leave Balance Summary */}
            {leaveBalances.length > 0 && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Leave Balance ({new Date().getFullYear()})</h4>
                  <div className="flex flex-wrap gap-2">
                    {leaveBalances.map((leave) => (
                      <Badge key={leave.leave_type} className={getLeaveColor(leave.leave_type)}>
                        {leave.leave_type.replace(' Leave', '')}: {leave.remaining_leaves ?? (leave.total_leaves - leave.used_leaves)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Personal Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={User} label="Full Name" value={employee.full_name} />
                <InfoRow icon={Mail} label="Email" value={employee.email} />
                <InfoRow icon={Phone} label="Phone" value={employee.phone} />
                <InfoRow icon={Calendar} label="Date of Birth" value={employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd MMM yyyy') : null} />
              </div>
            </div>

            <Separator />

            {/* Employment Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Employment Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={Hash} label="Employee Code" value={employee.employee_code} />
                <InfoRow icon={UserCog} label="Role" value={employee.role} />
                <InfoRow icon={Building} label="Department" value={employee.department} />
                <InfoRow icon={Briefcase} label="Designation" value={employee.designation} />
                <InfoRow icon={User} label="Manager" value={employee.manager_name} />
                <InfoRow icon={Calendar} label="Joining Date" value={employee.joining_date ? format(new Date(employee.joining_date), 'dd MMM yyyy') : null} />
              </div>
            </div>

            <Separator />

            {/* Work Info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Work Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={Briefcase} label="Employment Type" value={employee.employment_type} />
                <InfoRow icon={MapPin} label="Location" value={employee.location} />
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Address</h4>
              <InfoRow icon={MapPin} label="Full Address" value={employee.address} />
            </div>

            {/* Emergency Contact */}
            {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Emergency Contact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow icon={User} label="Contact Name" value={employee.emergency_contact_name || null} />
                    <InfoRow icon={Phone} label="Contact Phone" value={employee.emergency_contact_phone || null} />
                    <InfoRow icon={User} label="Relationship" value={employee.emergency_contact_relationship || null} />
                  </div>
                </div>
              </>
            )}
          </div>

          {isAdmin && (
            <DialogFooter className="gap-2">
              <Button
                variant={employee.status === 'Active' ? 'secondary' : 'default'}
                onClick={handleToggleStatus}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (employee.status === 'Active' ? 'Deactivate' : 'Activate')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
              >
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{employee.full_name}</strong>? This will permanently remove their account, attendance records, leave data, and all associated information. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
