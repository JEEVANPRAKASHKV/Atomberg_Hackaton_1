import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Mail, Phone, MapPin, Building2, Briefcase, Calendar, 
  AlertCircle, Pencil, X, Check, Loader2, RefreshCw,
  TreePalm, Lock, Cake, Users
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';

interface EmployeeDetails {
  phone: string | null;
  department: string | null;
  designation: string | null;
  location: string | null;
  employment_type: string | null;
  date_of_birth: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  gender: string | null;
  birthday_celebrated_on: string | null;
}

interface LeaveBalance {
  leave_type: string;
  remaining_leaves: number;
  total_leaves: number;
}

const phoneSchema = z.string().regex(/^\d{10,15}$/, 'Phone must be 10-15 digits').optional().or(z.literal(''));

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const ProfilePage = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<EmployeeDetails | null>(null);
  const [managerName, setManagerName] = useState<string | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [detailsExist, setDetailsExist] = useState(true);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    gender: '',
    birthday_celebrated_on: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch employee details
      const { data: detailsData, error: detailsError } = await supabase
        .from('hr_employee_details')
        .select('*')
        .eq('employee_id', employee.id)
        .maybeSingle();
      
      if (detailsError) throw detailsError;
      
      if (detailsData) {
        setDetails(detailsData);
        setDetailsExist(true);
        setFormData({
          phone: detailsData.phone || '',
          address: detailsData.address || '',
          emergency_contact_name: detailsData.emergency_contact_name || '',
          emergency_contact_phone: detailsData.emergency_contact_phone || '',
          emergency_contact_relationship: detailsData.emergency_contact_relationship || '',
          gender: detailsData.gender || '',
          birthday_celebrated_on: detailsData.birthday_celebrated_on || '',
        });
      } else {
        setDetailsExist(false);
        setDetails({
          phone: null,
          department: null,
          designation: null,
          location: null,
          employment_type: null,
          date_of_birth: null,
          address: null,
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null,
          gender: null,
          birthday_celebrated_on: null,
        });
      }
      
      // Fetch manager name if exists
      if (employee.manager_id) {
        const { data: managerData } = await supabase
          .from('hr_employees')
          .select('full_name')
          .eq('id', employee.manager_id)
          .maybeSingle();
        
        setManagerName(managerData?.full_name || null);
      }
      
      // Fetch leave balances for current year
      const currentYear = new Date().getFullYear();
      const { data: leaveData } = await supabase
        .from('hr_leave_entitlements')
        .select('leave_type, remaining_leaves, total_leaves')
        .eq('employee_id', employee.id)
        .eq('year', currentYear);
      
      setLeaveBalances(leaveData || []);
      
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employee?.id]);

  // Real-time subscription for leave balances
  useEffect(() => {
    if (!employee?.id) return;

    const currentYear = new Date().getFullYear();
    const channel = supabase
      .channel('profile-leave-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_leave_entitlements',
          filter: `employee_id=eq.${employee.id}`,
        },
        async () => {
          // Refetch leave balances when they change
          const { data: leaveData } = await supabase
            .from('hr_leave_entitlements')
            .select('leave_type, remaining_leaves, total_leaves')
            .eq('employee_id', employee.id)
            .eq('year', currentYear);
          
          setLeaveBalances(leaveData || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Phone validation
    if (formData.phone && !/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Phone must be 10-15 digits';
    }
    
    // Address validation
    if (formData.address && formData.address.length > 500) {
      errors.address = 'Address must be less than 500 characters';
    }
    
    // Emergency contact name validation
    if (formData.emergency_contact_name && formData.emergency_contact_name.length > 100) {
      errors.emergency_contact_name = 'Name must be less than 100 characters';
    }
    
    // Emergency contact phone validation
    if (formData.emergency_contact_phone && !/^\d{10,15}$/.test(formData.emergency_contact_phone.replace(/\D/g, ''))) {
      errors.emergency_contact_phone = 'Phone must be 10-15 digits';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!employee?.id) return;
    
    setSaving(true);
    
    // Optimistic update
    const previousDetails = { ...details };
    setDetails(prev => prev ? {
      ...prev,
      phone: formData.phone || null,
      address: formData.address || null,
      emergency_contact_name: formData.emergency_contact_name || null,
      emergency_contact_phone: formData.emergency_contact_phone || null,
      emergency_contact_relationship: formData.emergency_contact_relationship || null,
      gender: formData.gender || null,
      birthday_celebrated_on: formData.birthday_celebrated_on || null,
    } : null);
    
    try {
      const updateData = {
        phone: formData.phone || null,
        address: formData.address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_relationship: formData.emergency_contact_relationship || null,
        gender: formData.gender || null,
        birthday_celebrated_on: formData.birthday_celebrated_on || null,
        updated_at: new Date().toISOString(),
      };
      
      if (detailsExist) {
        const { error } = await supabase
          .from('hr_employee_details')
          .update(updateData)
          .eq('employee_id', employee.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('hr_employee_details')
          .insert({
            employee_id: employee.id,
            ...updateData,
          });
        
        if (error) throw error;
        setDetailsExist(true);
      }
      
      toast({
        title: 'Profile Updated',
        description: 'Your contact information has been saved successfully.',
      });
      setIsEditing(false);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      // Revert optimistic update
      setDetails(previousDetails as EmployeeDetails);
      toast({
        title: 'Update Failed',
        description: 'Failed to save your changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      phone: details?.phone || '',
      address: details?.address || '',
      emergency_contact_name: details?.emergency_contact_name || '',
      emergency_contact_phone: details?.emergency_contact_phone || '',
      emergency_contact_relationship: details?.emergency_contact_relationship || '',
      gender: details?.gender || '',
      birthday_celebrated_on: details?.birthday_celebrated_on || '',
    });
    setFormErrors({});
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getTotalLeaveBalance = () => {
    if (leaveBalances.length === 0) return 0;
    return leaveBalances.reduce((sum, lb) => sum + (lb.remaining_leaves || 0), 0);
  };

  const getTotalLeaveAllocation = () => {
    if (leaveBalances.length === 0) return 0;
    return leaveBalances.reduce((sum, lb) => sum + (lb.total_leaves || 0), 0);
  };

  const getLeaveTypeAbbr = (type: string) => {
    const abbrs: Record<string, string> = {
      'Earned': 'EL',
      'Casual': 'CL',
      'Sick': 'SL',
      'Earned Leave': 'EL',
      'Casual Leave': 'CL',
      'Sick Leave': 'SL',
    };
    return abbrs[type] || type.substring(0, 2).toUpperCase();
  };

  const getLeaveTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Earned': 'bg-blue-100 text-blue-800',
      'Casual': 'bg-green-100 text-green-800',
      'Sick': 'bg-orange-100 text-orange-800',
      'Earned Leave': 'bg-blue-100 text-blue-800',
      'Casual Leave': 'bg-green-100 text-green-800',
      'Sick Leave': 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800';
      case 'Manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        
        <Card className="p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </Card>
        
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load Profile</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">No Employee Data</h2>
        <p className="text-muted-foreground">Unable to load your profile information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground">View and update your personal information</p>
        </div>
        <Button variant="outline" onClick={() => setShowChangePassword(true)}>
          <Lock className="w-4 h-4 mr-2" />
          Change Password
        </Button>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword}
        email={employee.email}
      />

      {/* Profile Header with Avatar */}
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">
              {getInitials(employee.full_name)}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">{employee.full_name}</h2>
            <p className="text-muted-foreground">{details?.designation || 'No designation'}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={getRoleBadgeColor(employee.role)}>{employee.role}</Badge>
              <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                {employee.status}
              </Badge>
              {details?.department && (
                <span className="text-sm text-muted-foreground">• {details.department}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats - Leave Balance Only */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TreePalm className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Total Leave Balance</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-bold text-foreground">
                {getTotalLeaveBalance()} / {getTotalLeaveAllocation()} days
              </span>
              <div className="flex gap-1 flex-wrap">
                {['Earned Leave', 'Casual Leave', 'Sick Leave'].map((leaveType) => {
                  const lb = leaveBalances.find(b => b.leave_type === leaveType);
                  return (
                    <Badge key={leaveType} className={getLeaveTypeColor(leaveType)} variant="secondary">
                      {getLeaveTypeAbbr(leaveType)}: {lb?.remaining_leaves ?? 0}/{lb?.total_leaves ?? 0}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Section A: Basic Information (Read Only) */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Basic Information
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            These fields cannot be edited. Contact HR for changes.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium text-foreground">{employee.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{employee.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
              <Briefcase className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Employee Code</p>
                <p className="font-medium text-foreground">{employee.employee_code || 'Not assigned'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Section B: Employment Details (Read Only) */}
        <Card className="p-6 bg-muted/30">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Employment Details
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Work-related information managed by HR.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="font-medium text-foreground">{details?.department || 'Not provided'}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="font-medium text-foreground">{details?.designation || 'Not provided'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Employment Type</p>
                <p className="font-medium text-foreground">{details?.employment_type || 'Not provided'}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-foreground">{details?.location || 'Not provided'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Joining Date</p>
                <p className="font-medium text-foreground">
                  {employee.joining_date 
                    ? format(new Date(employee.joining_date), 'dd MMM yyyy') 
                    : 'Not provided'}
                </p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="font-medium text-foreground">
                  {details?.date_of_birth 
                    ? format(new Date(details.date_of_birth), 'dd MMM yyyy') 
                    : 'Not provided'}
                </p>
              </div>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-xs text-muted-foreground">Reporting Manager</p>
              <p className="font-medium text-foreground">{managerName || 'None'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Section C: Personal & Contact Information (Editable) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Personal & Contact Information
          </h3>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            {/* Personal Info Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="birthday_celebrated_on">Birthday Celebrated On</Label>
                <Input 
                  id="birthday_celebrated_on"
                  type="date"
                  value={formData.birthday_celebrated_on}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday_celebrated_on: e.target.value }))}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground mt-1">When should we celebrate your birthday?</p>
              </div>
            </div>

            {/* Contact Info Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={saving}
                  className={formErrors.phone ? 'border-destructive' : ''}
                />
                {formErrors.phone && (
                  <p className="text-xs text-destructive mt-1">{formErrors.phone}</p>
                )}
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input 
                  id="emergency_contact_phone"
                  placeholder="Emergency contact phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                  disabled={saving}
                  className={formErrors.emergency_contact_phone ? 'border-destructive' : ''}
                />
                {formErrors.emergency_contact_phone && (
                  <p className="text-xs text-destructive mt-1">{formErrors.emergency_contact_phone}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea 
                id="address"
                placeholder="Enter your address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                disabled={saving}
                className={formErrors.address ? 'border-destructive' : ''}
                rows={3}
              />
              {formErrors.address && (
                <p className="text-xs text-destructive mt-1">{formErrors.address}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{formData.address.length}/500 characters</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input 
                  id="emergency_contact_name"
                  placeholder="Emergency contact name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                  disabled={saving}
                  className={formErrors.emergency_contact_name ? 'border-destructive' : ''}
                />
                {formErrors.emergency_contact_name && (
                  <p className="text-xs text-destructive mt-1">{formErrors.emergency_contact_name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Select 
                  value={formData.emergency_contact_relationship} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_contact_relationship: value }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
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
            
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Personal Info Display */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium text-foreground">{details?.gender || 'Not provided yet'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Cake className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Birthday Celebrated On</p>
                  <p className="font-medium text-foreground">
                    {details?.birthday_celebrated_on 
                      ? format(new Date(details.birthday_celebrated_on), 'dd MMM') 
                      : 'Not provided yet'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info Display */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">{details?.phone || 'Not provided yet'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Emergency Contact Phone</p>
                  <p className="font-medium text-foreground">{details?.emergency_contact_phone || 'Not provided yet'}</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium text-foreground">{details?.address || 'Not provided yet'}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Emergency Contact Name</p>
                  <p className="font-medium text-foreground">{details?.emergency_contact_name || 'Not provided yet'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Relationship</p>
                  <p className="font-medium text-foreground">{details?.emergency_contact_relationship || 'Not provided yet'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
