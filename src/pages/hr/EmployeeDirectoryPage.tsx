import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeDetailModal } from '@/components/hr/EmployeeDetailModal';
import { EditEmployeeModal } from '@/components/hr/EditEmployeeModal';
import { toast } from 'sonner';
import { 
  Search, Users, Building, UserCheck, UserPlus, CalendarPlus, 
  MoreVertical, Eye, Pencil, Mail, Phone, Calendar, User, X, Loader2
} from 'lucide-react';
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
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

const DEPARTMENTS = ['NestOps', 'NestHQ', 'NestTech', 'NestLabs', 'Nest People'];
const STATUSES = ['Active', 'Inactive', 'Pending', 'Resigned', 'Abscond', 'Terminated'];

const EmployeeDirectoryPage = () => {
  const navigate = useNavigate();
  const { employee: currentEmployee, role } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewOnly, setShowNewOnly] = useState(false);
  
  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithDetails | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = role === 'Admin';
  
  // Check URL params for filter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('filter') === 'new') {
      setShowNewOnly(true);
    }
  }, []);

  const fetchEmployees = async () => {
    if (!currentEmployee?.org_id) return;

    setLoading(true);
    
    const { data, error } = await supabase
      .from('hr_employees')
      .select(`
        id,
        employee_code,
        full_name,
        email,
        role,
        status,
        org_id,
        manager_id,
        joining_date,
        created_at,
        updated_at,
        user_id
      `)
      .eq('org_id', currentEmployee.org_id)
      .order('full_name');

    if (error) {
      console.error('Error fetching employees:', error);
      setLoading(false);
      return;
    }

    const { data: detailsData } = await supabase
      .from('hr_employee_details')
      .select('*');

    const detailsMap = new Map(
      (detailsData || []).map(d => [d.employee_id, d])
    );

    const nameMap = new Map(
      (data || []).map(e => [e.id, e.full_name])
    );

    const combinedData: EmployeeWithDetails[] = (data || []).map(emp => {
      const details = detailsMap.get(emp.id);
      return {
        ...emp,
        department: details?.department || null,
        designation: details?.designation || null,
        phone: details?.phone || null,
        date_of_birth: details?.date_of_birth || null,
        employment_type: details?.employment_type || null,
        location: details?.location || null,
        address: details?.address || null,
        manager_name: emp.manager_id ? nameMap.get(emp.manager_id) || null : null,
        emergency_contact_name: details?.emergency_contact_name || null,
        emergency_contact_phone: details?.emergency_contact_phone || null,
        emergency_contact_relationship: details?.emergency_contact_relationship || null,
      };
    });

    setEmployees(combinedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentEmployee?.org_id]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return employees.filter(emp => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        emp.full_name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        (emp.employee_code?.toLowerCase().includes(searchLower) ?? false);
      
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      
      // New employees filter - joined this month
      let matchesNew = true;
      if (showNewOnly) {
        if (!emp.joining_date) {
          matchesNew = false;
        } else {
          const joinDate = new Date(emp.joining_date);
          matchesNew = joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
        }
      }

      return matchesSearch && matchesRole && matchesDept && matchesStatus && matchesNew;
    });
  }, [employees, searchQuery, roleFilter, departmentFilter, statusFilter, showNewOnly]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const newThisMonth = employees.filter(e => {
      if (!e.joining_date) return false;
      const joinDate = new Date(e.joining_date);
      return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
    }).length;

    const departments = new Set(employees.map(e => e.department).filter(Boolean));

    return {
      total: employees.length,
      active: employees.filter(e => e.status === 'Active').length,
      departments: departments.size,
      newThisMonth,
    };
  }, [employees]);

  const hasActiveFilters = searchQuery || roleFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all' || showNewOnly;

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setShowNewOnly(false);
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleViewDetails = (emp: EmployeeWithDetails) => {
    setSelectedEmployee(emp);
    setViewModalOpen(true);
  };

  const handleEdit = (emp: EmployeeWithDetails) => {
    setSelectedEmployee(emp);
    setEditModalOpen(true);
  };

  const handleChangeStatus = async (emp: EmployeeWithDetails, newStatus: string) => {
    const { error } = await supabase
      .from('hr_employees')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', emp.id);

    if (error) {
      toast.error('Failed to update status: ' + error.message);
    } else {
      toast.success(`Status updated to ${newStatus}`);
      fetchEmployees();
    }
  };

  const handleDeleteClick = (emp: EmployeeWithDetails) => {
    setSelectedEmployee(emp);
    setDeleteConfirmed(false);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedEmployee || !deleteConfirmed) return;
    
    setDeleting(true);

    // Check for team members
    const { data: teamMembers } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('manager_id', selectedEmployee.id)
      .limit(1);

    if (teamMembers && teamMembers.length > 0) {
      toast.error('Cannot delete: This employee has team members. Please reassign them first.');
      setDeleting(false);
      setDeleteDialogOpen(false);
      return;
    }

    // Delete auth user if exists
    if (selectedEmployee.user_id) {
      await supabase.functions.invoke('admin-manage-user', {
        body: { action: 'delete', user_id: selectedEmployee.user_id },
      });
    }

    const { error } = await supabase
      .from('hr_employees')
      .delete()
      .eq('id', selectedEmployee.id);

    if (error) {
      toast.error('Failed to delete employee: ' + error.message);
    } else {
      toast.success('Employee deleted successfully');
      fetchEmployees();
    }

    setDeleting(false);
    setDeleteDialogOpen(false);
    setSelectedEmployee(null);
  };

  const getAvatarColor = (empRole: string) => {
    switch (empRole) {
      case 'Admin': return 'bg-purple-500';
      case 'Manager': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const getRoleBadgeClass = (empRole: string) => {
    switch (empRole) {
      case 'Admin': return 'bg-purple-500 hover:bg-purple-600 text-white';
      case 'Manager': return 'bg-blue-500 hover:bg-blue-600 text-white';
      default: return 'bg-green-500 hover:bg-green-600 text-white';
    }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      Active: 'bg-green-500 text-white',
      Inactive: 'bg-gray-500 text-white',
      Pending: 'bg-yellow-500 text-white',
      Resigned: 'bg-orange-500 text-white',
      Terminated: 'bg-red-500 text-white',
      Abscond: 'bg-red-700 text-white',
    };
    return classes[status] || 'bg-gray-500 text-white';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Employee Directory</h1>
            <p className="text-muted-foreground">View and manage all employees</p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-16" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Employee Directory</h1>
          <p className="text-muted-foreground">View and manage all employees</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/app/add-employee')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <UserCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.departments}</p>
              <p className="text-sm text-muted-foreground">Departments</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <CalendarPlus className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.newThisMonth}</p>
              <p className="text-sm text-muted-foreground">New This Month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 glass-card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or employee code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant={showNewOnly ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowNewOnly(!showNewOnly)}
            >
              <CalendarPlus className="w-4 h-4 mr-1" />
              New This Month
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Showing {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Employee Grid */}
      {filteredEmployees.length === 0 ? (
        <Card className="p-8 text-center glass-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No employees found</h3>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your search or filters' 
              : 'No employees yet. Click "Add Employee" to get started.'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <Card 
              key={emp.id} 
              className="p-5 glass-card hover:shadow-lg transition-all duration-200"
            >
              {/* Card Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full ${getAvatarColor(emp.role)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-lg font-bold text-white">
                    {getInitials(emp.full_name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg truncate">{emp.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{emp.employee_code || 'No Code'}</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Badge className={getRoleBadgeClass(emp.role)}>{emp.role}</Badge>
                {emp.department && (
                  <Badge variant="outline">{emp.department}</Badge>
                )}
                <Badge className={getStatusBadge(emp.status)}>{emp.status}</Badge>
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{emp.phone}</span>
                  </div>
                )}
                {emp.manager_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span>Reports to: {emp.manager_name}</span>
                  </div>
                )}
                {emp.joining_date && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>Joined {format(new Date(emp.joining_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                {isAdmin ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEdit(emp)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewDetails(emp)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="bg-background border">
                            {STATUSES.map(status => (
                              <DropdownMenuItem 
                                key={status}
                                onClick={() => handleChangeStatus(emp, status)}
                                disabled={emp.status === status}
                              >
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteClick(emp)}
                        >
                          Delete Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleViewDetails(emp)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        isAdmin={isAdmin}
        onUpdate={fetchEmployees}
      />

      {/* Edit Modal */}
      <EditEmployeeModal
        employee={selectedEmployee}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={fetchEmployees}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedEmployee?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This action cannot be undone. All associated data will be permanently deleted.</p>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="confirm-delete" 
                  checked={deleteConfirmed}
                  onCheckedChange={(checked) => setDeleteConfirmed(checked as boolean)}
                />
                <label htmlFor="confirm-delete" className="text-sm font-medium">
                  I understand the consequences
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={!deleteConfirmed || deleting}
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

export default EmployeeDirectoryPage;
