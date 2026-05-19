import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  User,
  FileText,
  IndianRupee,
  Users,
  Calendar,
  CheckCircle,
  LogOut,
  Settings,
  FolderOpen,
  UserPlus,
  Contact,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  FileEdit,
  Megaphone,
  NotebookPen,
  ClipboardCheck,
  Heart,
  BarChart3,
  UsersRound,
  // Goal module icons
  Target,
  CheckSquare,
  Share2,
  Unlock,
  FileSearch,
  PieChart,
  BarChart2,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarRole = 'Admin' | 'Manager' | 'Employee';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SidebarRole[];
  conditionalKey?: string; // Key for conditional visibility
}

const navItems: NavItem[] = [
  // Common items (Overview section for all roles)
  { title: 'Attendance', href: '/app/attendance', icon: Clock, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Work Log', href: '/app/work-log', icon: NotebookPen, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Work Log Analytics', href: '/app/work-log-analytics', icon: BarChart3, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'My Leaves', href: '/app/leaves', icon: Calendar, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Request Regularization', href: '/app/attendance-regularization', icon: FileEdit, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Appreciations', href: '/app/appreciations', icon: Heart, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Holidays', href: '/app/holidays', icon: CalendarDays, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Announcements', href: '/app/announcements', icon: Megaphone, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Profile', href: '/app/profile', icon: User, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Documents', href: '/app/documents', icon: FileText, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Salary', href: '/app/salary', icon: IndianRupee, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Contacts', href: '/app/contacts', icon: Contact, roles: ['Admin', 'Manager', 'Employee'] },

  // Employee specific (Personal section)
  { title: 'My Onboarding', href: '/app/my-onboarding', icon: ClipboardList, roles: ['Employee'] },
  { title: 'My Offboarding', href: '/app/my-offboarding', icon: DoorOpen, roles: ['Employee'], conditionalKey: 'hasOffboarding' },

  // Manager specific (Team Management section)
  { title: 'My Team', href: '/app/team', icon: Users, roles: ['Manager'] },
  { title: 'Team Work Logs', href: '/app/manager/work-log-review', icon: ClipboardCheck, roles: ['Manager', 'Admin'] },
  { title: 'Team Analytics', href: '/app/team-analytics', icon: UsersRound, roles: ['Manager', 'Admin'] },
  { title: 'Leave Approvals', href: '/app/leave-approvals', icon: CheckCircle, roles: ['Manager'] },
  { title: 'My Offboarding', href: '/app/my-offboarding', icon: DoorOpen, roles: ['Manager'], conditionalKey: 'hasOffboarding' },

  // Admin (HR) specific
  { title: 'Employee Directory', href: '/app/directory', icon: FolderOpen, roles: ['Admin'] },
  { title: 'Add Employee', href: '/app/add-employee', icon: UserPlus, roles: ['Admin'] },
  { title: 'Onboarding', href: '/app/onboarding', icon: UserPlus, roles: ['Admin'] },
  { title: 'Offboarding', href: '/app/offboarding', icon: LogOut, roles: ['Admin'] },
  { title: 'Attendance Records', href: '/app/admin/attendance-records', icon: CalendarDays, roles: ['Admin'] },
  { title: 'Attendance Regularization', href: '/app/admin/attendance-regularization', icon: FileEdit, roles: ['Admin'] },
  { title: 'Employee Salary', href: '/app/admin/salary-overview', icon: IndianRupee, roles: ['Admin'] },
  { title: 'Approvals', href: '/app/approvals', icon: CheckCircle, roles: ['Admin'] },
  { title: 'Settings', href: '/app/settings', icon: Settings, roles: ['Admin'] },

  // Goal Module — Employee
  { title: 'My Goals', href: '/app/goals', icon: Target, roles: ['Admin', 'Manager', 'Employee'] },
  { title: 'Check-In', href: '/app/goals/checkin', icon: ClipboardCheck, roles: ['Admin', 'Manager', 'Employee'] },

  // Goal Module — Manager
  { title: 'Goal Approvals', href: '/app/manager/goal-approvals', icon: CheckSquare, roles: ['Manager', 'Admin'] },
  { title: 'Team Goals', href: '/app/manager/team-goals', icon: UsersRound, roles: ['Manager', 'Admin'] },
  { title: 'Team Check-In', href: '/app/manager/team-checkin', icon: ClipboardList, roles: ['Manager', 'Admin'] },

  // Goal Module — Admin (HR)
  { title: 'Goal Cycles', href: '/app/hr/goal-cycles', icon: Calendar, roles: ['Admin'] },
  { title: 'Thrust Areas', href: '/app/hr/thrust-areas', icon: Layers, roles: ['Admin'] },
  { title: 'Shared Goals', href: '/app/hr/shared-goals', icon: Share2, roles: ['Admin'] },
  { title: 'Goal Unlock', href: '/app/hr/goal-unlock', icon: Unlock, roles: ['Admin'] },
  { title: 'Audit Log', href: '/app/hr/goal-audit', icon: FileSearch, roles: ['Admin'] },
  { title: 'Achievement Report', href: '/app/hr/achievement-report', icon: BarChart2, roles: ['Admin'] },
  { title: 'Check-In Dashboard', href: '/app/hr/checkin-dashboard', icon: PieChart, roles: ['Admin'] },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { employee, role } = useAuth();
  const [hasOffboarding, setHasOffboarding] = useState(false);

  const currentRole = role || 'Employee';

  // Check if employee has offboarding record (for non-Admin roles)
  useEffect(() => {
    const checkOffboarding = async () => {
      if (!employee?.id || currentRole === 'Admin') return;

      try {
        const { data, error } = await supabase
          .from('hr_offboarding')
          .select('id')
          .eq('employee_id', employee.id)
          .maybeSingle();

        if (!error && data) {
          setHasOffboarding(true);
        } else {
          setHasOffboarding(false);
        }
      } catch (error) {
        console.error('Error checking offboarding:', error);
        setHasOffboarding(false);
      }
    };

    checkOffboarding();
  }, [employee?.id, currentRole]);

  // Conditional visibility map
  const conditionalVisibility: Record<string, boolean> = {
    hasOffboarding: hasOffboarding,
  };

  const filteredItems = navItems.filter(item => {
    // First check role
    if (!item.roles.includes(currentRole)) return false;
    
    // Then check conditional visibility if specified
    if (item.conditionalKey) {
      return conditionalVisibility[item.conditionalKey] === true;
    }
    
    return true;
  });

  // Overview section includes My Leaves for Manager/Employee
  const overviewTitles = ['Attendance', 'Work Log', 'Work Log Analytics', 'My Leaves', 'Request Regularization', 'Appreciations', 'Holidays', 'Announcements', 'Profile', 'Documents', 'Salary', 'Contacts'];
  
  const commonItems = filteredItems.filter(item => 
    overviewTitles.includes(item.title)
  );
  
  const roleSpecificItems = filteredItems.filter(item => 
    !overviewTitles.includes(item.title)
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="w-64 bg-sidebar h-screen flex flex-col border-r border-sidebar-border sticky top-0">
      <div className="p-6 border-b border-sidebar-border">
        <Link to="/app" className="flex items-center gap-3">
          <img 
            src="/atomberg-logo.png" 
            alt="AtombergHR" 
            className="h-10 w-auto rounded-lg"
          />
          <div>
            <span className="font-display font-bold text-sidebar-foreground">AtombergHR</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div>
          <h3 className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-3">Overview</h3>
          <ul className="space-y-1">
            {commonItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link to={item.href} className={cn('nav-link', isActive && 'nav-link-active')}>
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {roleSpecificItems.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-3">
              {currentRole === 'Admin' ? 'HR Management' : currentRole === 'Manager' ? 'Team Management' : 'Personal'}
            </h3>
            <ul className="space-y-1">
              {roleSpecificItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <li key={`${item.href}-${item.title}`}>
                    <Link to={item.href} className={cn('nav-link', isActive && 'nav-link-active')}>
                      <Icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {employee ? getInitials(employee.full_name) : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{employee?.full_name || 'User'}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{employee?.role || 'Employee'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
