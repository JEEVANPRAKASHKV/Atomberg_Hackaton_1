import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, UserCog, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Manager { id: string; full_name: string; role: string; }

const EditEmployeePage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    employeeCode: '', fullName: '', email: '', phone: '', department: '', designation: '',
    location: '', employmentType: '', dateOfBirth: '',
    joiningDate: '', role: '', managerId: '', address: '', status: 'Active',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelationship: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        toast.error('Invalid employee ID');
        navigate('/app/directory');
        return;
      }

      setLoading(true);
      setNotFound(false);

      try {
        const { data: empData, error: empError } = await supabase
          .from('hr_employees').select('*').eq('id', id).maybeSingle();

        if (empError) {
          console.error('Error fetching employee:', empError);
          toast.error('Failed to load employee data');
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!empData) { 
          setNotFound(true);
          setLoading(false);
          return; 
        }

        setUserId(empData.user_id);

        const { data: detailsData } = await supabase
          .from('hr_employee_details').select('*').eq('employee_id', id).maybeSingle();

        const { data: managersData } = await supabase
          .from('hr_employees').select('id, full_name, role')
          .eq('org_id', empData.org_id).in('role', ['Admin', 'Manager'])
          .eq('status', 'Active').neq('id', id).order('full_name');

        setManagers(managersData || []);
        setFormData({
          employeeCode: empData.employee_code || '',
          fullName: empData.full_name || '',
          email: empData.email || '',
          phone: detailsData?.phone || '',
          department: detailsData?.department || '',
          designation: detailsData?.designation || '',
          location: detailsData?.location || '',
          employmentType: detailsData?.employment_type || '',
          dateOfBirth: detailsData?.date_of_birth || '',
          joiningDate: empData.joining_date || '',
          role: empData.role || '',
          managerId: empData.manager_id || '',
          address: detailsData?.address || '',
          status: empData.status || 'Active',
          emergencyContactName: detailsData?.emergency_contact_name || '',
          emergencyContactPhone: detailsData?.emergency_contact_phone || '',
          emergencyContactRelationship: detailsData?.emergency_contact_relationship || '',
        });
      } catch (error: any) {
        console.error('Error fetching employee:', error);
        toast.error('Failed to load employee data');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!formData.fullName.trim()) {
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

    setSaving(true);
    try {
      const { error: empError } = await supabase.from('hr_employees').update({
        full_name: formData.fullName.trim(),
        role: formData.role,
        manager_id: formData.managerId || null,
        status: formData.status,
        joining_date: formData.joiningDate || null,
      }).eq('id', id);

      if (empError) {
        toast.error('Failed to update employee: ' + empError.message);
        setSaving(false);
        return;
      }

      const { data: existingDetails } = await supabase
        .from('hr_employee_details').select('id').eq('employee_id', id).maybeSingle();

      const detailsPayload = {
        phone: formData.phone?.trim() || null,
        department: formData.department,
        designation: formData.designation?.trim() || null,
        location: formData.location?.trim() || null,
        employment_type: formData.employmentType || null,
        date_of_birth: formData.dateOfBirth || null,
        address: formData.address?.trim() || null,
        emergency_contact_name: formData.emergencyContactName?.trim() || null,
        emergency_contact_phone: formData.emergencyContactPhone?.trim() || null,
        emergency_contact_relationship: formData.emergencyContactRelationship || null,
      };

      if (existingDetails) {
        await supabase.from('hr_employee_details').update(detailsPayload).eq('employee_id', id);
      } else {
        await supabase.from('hr_employee_details').insert({ ...detailsPayload, employee_id: id });
      }

      toast.success('Employee updated successfully');
      navigate('/app/directory');
    } catch (error: any) {
      toast.error('An error occurred: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);

    const { data: teamMembers } = await supabase.from('hr_employees').select('id').eq('manager_id', id).limit(1);
    if (teamMembers && teamMembers.length > 0) {
      toast.error('Cannot delete: This employee has team members. Reassign them first.');
      setDeleting(false);
      setShowDeleteDialog(false);
      return;
    }

    if (userId) {
      await supabase.functions.invoke('admin-manage-user', { body: { action: 'delete', user_id: userId } });
    }

    const { error } = await supabase.from('hr_employees').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
    } else {
      toast.success('Employee deleted successfully');
      navigate('/app/directory');
    }
    setDeleting(false);
    setShowDeleteDialog(false);
  };

  const updateField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card className="max-w-4xl p-6">
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <Card className="max-w-lg mx-auto p-8 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Employee Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The employee you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/app/directory')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Directory
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/directory')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Edit Employee</h1>
          <p className="text-muted-foreground">Update information for {formData.fullName}</p>
        </div>
      </div>

      <Card className="max-w-4xl p-6 glass-card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">
                {formData.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'NA'}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-lg text-foreground">{formData.fullName || 'Employee Name'}</h2>
              <p className="text-sm text-muted-foreground">{formData.employeeCode || 'Employee Code Pending'}</p>
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
              <UserCog className="w-4 h-4" /> Basic Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Code</Label>
                <Input value={formData.employeeCode} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input 
                  value={formData.fullName} 
                  onChange={(e) => updateField('fullName', e.target.value)} 
                  required 
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => updateField('phone', e.target.value)} 
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Employment Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Employment Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formData.role} onValueChange={(v) => updateField('role', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={formData.department} onValueChange={(v) => updateField('department', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NestOps">NestOps</SelectItem>
                    <SelectItem value="NestHQ">NestHQ</SelectItem>
                    <SelectItem value="NestTech">NestTech</SelectItem>
                    <SelectItem value="NestLabs">NestLabs</SelectItem>
                    <SelectItem value="Nest People">Nest People</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input 
                  value={formData.designation} 
                  onChange={(e) => updateField('designation', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={formData.employmentType} onValueChange={(v) => updateField('employmentType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select value={formData.managerId} onValueChange={(v) => updateField('managerId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {managers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Joining Date</Label>
                <Input 
                  type="date" 
                  value={formData.joiningDate} 
                  onChange={(e) => updateField('joiningDate', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input 
                  value={formData.location} 
                  onChange={(e) => updateField('location', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Abscond">Abscond</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input 
                  type="date" 
                  value={formData.dateOfBirth} 
                  onChange={(e) => updateField('dateOfBirth', e.target.value)} 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => updateField('address', e.target.value)} 
                  placeholder="Enter full address"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Emergency Contact</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input 
                  value={formData.emergencyContactName} 
                  onChange={(e) => updateField('emergencyContactName', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input 
                  value={formData.emergencyContactPhone} 
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Select 
                  value={formData.emergencyContactRelationship} 
                  onValueChange={(v) => updateField('emergencyContactRelationship', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1" disabled={saving || deleting}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/app/directory')} 
              disabled={saving || deleting}
            >
              Cancel
            </Button>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-destructive/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-destructive">Danger Zone</h4>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)} 
                disabled={saving || deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Employee
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{formData.fullName}</strong>? This will permanently remove 
              all employee records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
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
    </div>
  );
};

export default EditEmployeePage;
