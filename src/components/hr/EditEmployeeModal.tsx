import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
  user_id: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  date_of_birth: string | null;
  birthday_celebrated_on?: string | null;
  gender?: string | null;
  employment_type: string | null;
  location: string | null;
  address: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
}

interface Manager {
  id: string;
  full_name: string;
}

interface EditEmployeeModalProps {
  employee: EmployeeWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DEPARTMENTS = ['NestOps', 'NestHQ', 'NestTech', 'NestLabs', 'Nest People'];
const ROLES = ['Admin', 'Manager', 'Employee'];
const STATUSES = ['Active', 'Inactive', 'Pending', 'Resigned', 'Abscond', 'Terminated'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const EditEmployeeModal = ({
  employee,
  open,
  onOpenChange,
  onSuccess,
}: EditEmployeeModalProps) => {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    designation: '',
    employment_type: '',
    location: '',
    status: '',
    manager_id: '',
    joining_date: '',
    date_of_birth: '',
    birthday_celebrated_on: '',
    gender: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });

  useEffect(() => {
    if (employee && open) {
      setFormData({
        full_name: employee.full_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        role: employee.role || '',
        department: employee.department || '',
        designation: employee.designation || '',
        employment_type: employee.employment_type || '',
        location: employee.location || '',
        status: employee.status || '',
        manager_id: employee.manager_id || '',
        joining_date: employee.joining_date || '',
        date_of_birth: employee.date_of_birth || '',
        birthday_celebrated_on: employee.birthday_celebrated_on || '',
        gender: employee.gender || '',
        address: employee.address || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        emergency_contact_relationship: employee.emergency_contact_relationship || '',
      });
      fetchManagers();
    }
  }, [employee, open]);

  const fetchManagers = async () => {
    if (!employee) return;
    const { data } = await supabase
      .from('hr_employees')
      .select('id, full_name')
      .in('role', ['Admin', 'Manager'])
      .neq('id', employee.id)
      .eq('status', 'Active')
      .order('full_name');
    setManagers(data || []);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!employee) return;

    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!formData.role) {
      toast.error('Role is required');
      return;
    }
    if (!formData.department) {
      toast.error('Department is required');
      return;
    }
    if (!formData.status) {
      toast.error('Status is required');
      return;
    }

    setLoading(true);

    try {
      // Update hr_employees
      const { error: empError } = await supabase
        .from('hr_employees')
        .update({
          full_name: formData.full_name.trim(),
          role: formData.role,
          manager_id: formData.manager_id || null,
          status: formData.status,
          joining_date: formData.joining_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee.id);

      if (empError) throw empError;

      // Check if hr_employee_details exists
      const { data: existingDetails } = await supabase
        .from('hr_employee_details')
        .select('id')
        .eq('employee_id', employee.id)
        .maybeSingle();

      const detailsPayload = {
        phone: formData.phone || null,
        department: formData.department,
        designation: formData.designation || null,
        location: formData.location || null,
        employment_type: formData.employment_type || null,
        date_of_birth: formData.date_of_birth || null,
        birthday_celebrated_on: formData.birthday_celebrated_on || null,
        gender: formData.gender || null,
        address: formData.address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_relationship: formData.emergency_contact_relationship || null,
        updated_at: new Date().toISOString(),
      };

      if (existingDetails) {
        const { error: detailsError } = await supabase
          .from('hr_employee_details')
          .update(detailsPayload)
          .eq('employee_id', employee.id);

        if (detailsError) throw detailsError;
      } else {
        const { error: insertError } = await supabase
          .from('hr_employee_details')
          .insert({
            ...detailsPayload,
            employee_id: employee.id,
          });

        if (insertError) throw insertError;
      }

      toast.success('Employee updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee - {employee.full_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="employee_code">Employee Code</Label>
                <Input
                  id="employee_code"
                  value={employee.employee_code || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Employment Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(v) => handleChange('role', v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Select value={formData.department} onValueChange={(v) => handleChange('department', v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select value={formData.employment_type} onValueChange={(v) => handleChange('employment_type', v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="manager_id">Manager</Label>
                <Select value={formData.manager_id || 'none'} onValueChange={(v) => handleChange('manager_id', v === 'none' ? '' : v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => handleChange('joining_date', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="birthday_celebrated_on">Birthday Celebrated On</Label>
                <Input
                  id="birthday_celebrated_on"
                  type="date"
                  value={formData.birthday_celebrated_on}
                  onChange={(e) => handleChange('birthday_celebrated_on', e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">If different from DOB</p>
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={loading}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Emergency Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleChange('emergency_contact_phone', e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Select 
                  value={formData.emergency_contact_relationship} 
                  onValueChange={(v) => handleChange('emergency_contact_relationship', v)} 
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
