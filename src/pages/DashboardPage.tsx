import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Calendar,
  FolderOpen,
  UserPlus,
  FileEdit,
  Megaphone,
  Heart,
  FileText,
  ClipboardList,
  Info
} from 'lucide-react';
import { useEmployeeGender } from '@/hooks/useEmployeeGender';
import { getLeaveTypesForGender, getLeaveSummaryText, LEAVE_TYPES } from '@/lib/leaveTypes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeaveBalance {
  leave_type: string;
  remaining_leaves: number;
  total_leaves: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_important: boolean;
  created_at: string;
  created_by: {
    full_name: string;
  };
}

interface Appreciation {
  id: string;
  message: string;
  tag: string;
  created_at: string;
  from_employee: {
    full_name: string;
  };
}

const DashboardPage = () => {
  const { role, employee, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { gender, loading: genderLoading } = useEmployeeGender(employee?.id);
  
  // Get leave types based on gender
  const availableLeaveTypes = getLeaveTypesForGender(gender);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [pendingLeaveApprovals, setPendingLeaveApprovals] = useState(0);
  const [pendingRegularizations, setPendingRegularizations] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeOnboardings, setActiveOnboardings] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [appreciations, setAppreciations] = useState<Appreciation[]>([]);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (employee?.id && role) {
      fetchDashboardData();
    }
  }, [employee?.id, role]);

  // Real-time subscription for leave balances
  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel('dashboard-leave-changes')
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
  }, [employee?.id, currentYear]);

  const fetchDashboardData = async () => {
    if (!employee?.id) return;
    
    setDataLoading(true);
    try {
      // Fetch leave balance with total_leaves
      const { data: leaveData } = await supabase
        .from('hr_leave_entitlements')
        .select('leave_type, remaining_leaves, total_leaves')
        .eq('employee_id', employee.id)
        .eq('year', currentYear);
      
      setLeaveBalances(leaveData || []);

      // Fetch recent announcements
      const { data: announcementData } = await supabase
        .from('hr_announcements')
        .select('id, title, content, is_important, created_at, created_by:hr_employees!hr_announcements_created_by_fkey(full_name)')
        .order('created_at', { ascending: false })
        .limit(3);
      
      setAnnouncements(announcementData as unknown as Announcement[] || []);

      // Fetch recent appreciations received
      const { data: appreciationData } = await supabase
        .from('hr_appreciations')
        .select('id, message, tag, created_at, from_employee:hr_employees!hr_appreciations_from_employee_id_fkey(full_name)')
        .eq('to_employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setAppreciations(appreciationData as unknown as Appreciation[] || []);

      if (role === 'Manager') {
        const { count: teamMemberCount } = await supabase
          .from('hr_employees')
          .select('id', { count: 'exact', head: true })
          .eq('manager_id', employee.id)
          .eq('status', 'Active');
        
        setTeamCount(teamMemberCount || 0);

        const { data: teamIds } = await supabase
          .from('hr_employees')
          .select('id')
          .eq('manager_id', employee.id);
        
        if (teamIds && teamIds.length > 0) {
          const { count: pendingCount } = await supabase
            .from('hr_leave_requests')
            .select('id', { count: 'exact', head: true })
            .in('employee_id', teamIds.map(t => t.id))
            .eq('status', 'Pending');
          
          setPendingLeaveApprovals(pendingCount || 0);
        }
      }

      if (role === 'Admin') {
        const { count: empCount } = await supabase
          .from('hr_employees')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Active');
        
        setTotalEmployees(empCount || 0);

        const { count: pendingLeaveCount } = await supabase
          .from('hr_leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Pending');
        
        setPendingLeaveApprovals(pendingLeaveCount || 0);

        const { count: pendingRegCount } = await supabase
          .from('hr_attendance_regularization_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'Pending');
        
        setPendingRegularizations(pendingRegCount || 0);

        const { count: onboardingCount } = await supabase
          .from('hr_onboarding_tasks')
          .select('employee_id', { count: 'exact', head: true })
          .eq('status', 'Pending');
        
        setActiveOnboardings(onboardingCount || 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  // Loading skeleton
  if (authLoading || !employee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      'Great Work': 'bg-green-100 text-green-800',
      'Team Player': 'bg-blue-100 text-blue-800',
      'Helpful': 'bg-purple-100 text-purple-800',
      'Innovative': 'bg-orange-100 text-orange-800',
      'Leadership': 'bg-yellow-100 text-yellow-800',
    };
    return colors[tag] || 'bg-muted text-muted-foreground';
  };

  // Employee Dashboard
  if (role === 'Employee') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome back, {employee.full_name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's your personal overview for today.
          </p>
        </div>

        {/* Leave Summary Card */}
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Leave Entitlement</p>
              <p className="text-lg font-semibold text-foreground">{getLeaveSummaryText(gender)}</p>
            </div>
          </div>
          
          {/* Leave Balance Cards */}
          <TooltipProvider>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {dataLoading || genderLoading ? (
                [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)
              ) : (
                availableLeaveTypes.map((type) => {
                  const lb = leaveBalances.find(b => b.leave_type === type.value);
                  const remaining = lb?.remaining_leaves ?? 0;
                  const total = lb?.total_leaves ?? type.totalDays;
                  return (
                    <div key={type.value} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-muted-foreground">{type.shortLabel}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs">{type.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-lg font-bold text-foreground">
                        {remaining}<span className="text-sm font-normal text-muted-foreground">/{total}</span>
                      </p>
                      {/* Mini progress bar */}
                      <div className="mt-1 h-1 bg-background rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${total > 0 ? (remaining / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TooltipProvider>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/attendance')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Attendance</h3>
                  <p className="text-xs text-muted-foreground">Punch in/out</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/leaves')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Leaves</h3>
                  <p className="text-xs text-muted-foreground">Apply for leave</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/work-log')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Work Log</h3>
                  <p className="text-xs text-muted-foreground">Log your work</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/appreciations')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Appreciate</h3>
                  <p className="text-xs text-muted-foreground">Send appreciation</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </div>

        {/* Announcements & Appreciations */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Announcements */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-primary" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div 
                      key={announcement.id} 
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate('/app/announcements')}
                    >
                      <div className="flex items-start gap-2">
                        {announcement.is_important && (
                          <Badge variant="destructive" className="text-xs shrink-0">Important</Badge>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{announcement.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{announcement.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements</p>
              )}
              <Button 
                variant="ghost" 
                className="w-full mt-3 text-sm"
                onClick={() => navigate('/app/announcements')}
              >
                View All Announcements
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Appreciations Received */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="w-5 h-5 text-pink-500" />
                Appreciations Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : appreciations.length > 0 ? (
                <div className="space-y-3">
                  {appreciations.map((appreciation) => (
                    <div key={appreciation.id} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-start gap-2">
                        <Badge className={`text-xs shrink-0 ${getTagColor(appreciation.tag)}`}>
                          {appreciation.tag}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{appreciation.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            From {appreciation.from_employee?.full_name} • {formatDistanceToNow(new Date(appreciation.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No appreciations yet</p>
              )}
              <Button 
                variant="ghost" 
                className="w-full mt-3 text-sm"
                onClick={() => navigate('/app/appreciations')}
              >
                View All Appreciations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Manager Dashboard
  if (role === 'Manager') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Welcome back, {employee.full_name.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's your team overview for today.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard 
            title="Team Members" 
            value={dataLoading ? '...' : teamCount.toString()}
            icon={Users}
            onClick={() => navigate('/app/team')}
          />
          <StatCard 
            title="Pending Approvals" 
            value={dataLoading ? '...' : pendingLeaveApprovals.toString()}
            icon={AlertCircle}
            onClick={() => navigate('/app/leave-approvals')}
          />
        </div>

        {/* Personal Leave Balance for Manager */}
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">My Leave Balance</p>
              <p className="text-xs text-muted-foreground mb-2">{getLeaveSummaryText(gender)}</p>
              {dataLoading || genderLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <TooltipProvider>
                  <div className="flex items-center gap-2 flex-wrap">
                    {availableLeaveTypes.map((type) => {
                      const lb = leaveBalances.find(b => b.leave_type === type.value);
                      return (
                        <Tooltip key={type.value}>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-sm cursor-help">
                              {type.shortLabel}: {lb?.remaining_leaves ?? 0}/{lb?.total_leaves ?? type.totalDays}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{type.label}</p>
                            <p className="text-xs">{type.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/leaves')}>
              Apply Leave
            </Button>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/leave-approvals')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Approve Leaves</h3>
                  <p className="text-xs text-muted-foreground">{pendingLeaveApprovals} pending</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/team')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Team</h3>
                  <p className="text-xs text-muted-foreground">{teamCount} members</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/manager/work-log-review')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Work Logs</h3>
                  <p className="text-xs text-muted-foreground">Review team logs</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>

          <Card 
            className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => navigate('/app/appreciations')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Appreciate</h3>
                  <p className="text-xs text-muted-foreground">Send appreciation</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </div>

        {/* Announcements & Appreciations */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 text-primary" />
                Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {announcements.length > 0 ? (
                <div className="space-y-3">
                  {announcements.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer" onClick={() => navigate('/app/announcements')}>
                      <p className="font-medium text-sm truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No announcements</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="w-5 h-5 text-pink-500" />
                Appreciations Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appreciations.length > 0 ? (
                <div className="space-y-3">
                  {appreciations.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                      <Badge className={`text-xs ${getTagColor(a.tag)}`}>{a.tag}</Badge>
                      <p className="text-sm mt-1 line-clamp-1">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        From {a.from_employee?.full_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No appreciations</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome, Admin!
        </h1>
        <p className="text-muted-foreground">
          Here's your HR overview for today.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Employees" 
          value={dataLoading ? '...' : totalEmployees.toString()}
          icon={Users}
          onClick={() => navigate('/app/directory')}
        />
        <StatCard 
          title="Pending Leave Approvals" 
          value={dataLoading ? '...' : pendingLeaveApprovals.toString()}
          icon={AlertCircle}
          onClick={() => navigate('/app/approvals')}
        />
        <StatCard 
          title="Pending Regularizations" 
          value={dataLoading ? '...' : pendingRegularizations.toString()}
          icon={FileEdit}
          onClick={() => navigate('/app/admin/attendance-regularization')}
        />
        <StatCard 
          title="Active Onboardings" 
          value={dataLoading ? '...' : activeOnboardings.toString()}
          icon={UserPlus}
          onClick={() => navigate('/app/onboarding')}
        />
      </div>

      {/* Personal Leave Balance for Admin */}
      <Card className="p-4 glass-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">My Leave Balance</p>
            <p className="text-xs text-muted-foreground mb-2">{getLeaveSummaryText(gender)}</p>
            {dataLoading || genderLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <TooltipProvider>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableLeaveTypes.map((type) => {
                    const lb = leaveBalances.find(b => b.leave_type === type.value);
                    return (
                      <Tooltip key={type.value}>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-sm cursor-help">
                            {type.shortLabel}: {lb?.remaining_leaves ?? 0}/{lb?.total_leaves ?? type.totalDays}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-xs">{type.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/leaves')}>
            View
          </Button>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/app/directory')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Directory</h3>
                <p className="text-xs text-muted-foreground">All employees</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>

        <Card 
          className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/app/add-employee')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Add Employee</h3>
                <p className="text-xs text-muted-foreground">New hire</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>

        <Card 
          className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/app/approvals')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Approvals</h3>
                <p className="text-xs text-muted-foreground">{pendingLeaveApprovals} pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>

        <Card 
          className="p-5 glass-card cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/app/admin/attendance-regularization')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileEdit className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Regularizations</h3>
                <p className="text-xs text-muted-foreground">{pendingRegularizations} pending</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="w-5 h-5 text-primary" />
              Recent Announcements
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/announcements')}>
              Manage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer" onClick={() => navigate('/app/announcements')}>
                  {a.is_important && <Badge variant="destructive" className="text-xs mb-2">Important</Badge>}
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No announcements yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
