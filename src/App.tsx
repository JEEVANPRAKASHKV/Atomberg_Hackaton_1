import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// App Layout
import { AppLayout } from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import ProfilePage from "./pages/ProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import MySalaryPage from "./pages/MySalaryPage";
import MyLeavesPage from "./pages/MyLeavesPage";
import ContactsPage from "./pages/ContactsPage";
import HolidaysPage from "./pages/HolidaysPage";
import MyOnboardingPage from "./pages/MyOnboardingPage";
import MyOffboardingPage from "./pages/MyOffboardingPage";
import AttendanceRegularizationPage from "./pages/AttendanceRegularizationPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import WorkLogPage from "./pages/WorkLogPage";
import WorkLogAnalyticsPage from "./pages/WorkLogAnalyticsPage";
import AppreciationsPage from "./pages/AppreciationsPage";
import NotificationsPage from "./pages/NotificationsPage";

// Manager Pages
import MyTeamPage from "./pages/manager/MyTeamPage";
import TeamWorkLogsPage from "./pages/manager/TeamWorkLogsPage";
import TeamAnalyticsPage from "./pages/TeamAnalyticsPage";

// HR Pages
import EmployeeDirectoryPage from "./pages/hr/EmployeeDirectoryPage";
import AddEmployeePage from "./pages/hr/AddEmployeePage";
import EditEmployeePage from "./pages/hr/EditEmployeePage";
import ApprovalsPage from "./pages/hr/ApprovalsPage";
import OnboardingPage from "./pages/hr/OnboardingPage";
import OffboardingPage from "./pages/hr/OffboardingPage";
import SettingsPage from "./pages/hr/SettingsPage";
import AttendanceRegularizationAdminPage from "./pages/hr/AttendanceRegularizationAdminPage";
import SalaryOverviewPage from "./pages/hr/SalaryOverviewPage";
import AttendanceRecordsPage from "./pages/hr/AttendanceRecordsPage";
import BulkUploadPage from "./pages/hr/BulkUploadPage";

// Goal Module — Employee
import MyGoalsPage from "./pages/MyGoalsPage";
import GoalSheetPage from "./pages/GoalSheetPage";
import GoalCheckInPage from "./pages/GoalCheckInPage";

// Goal Module — Manager
import GoalApprovalPage from "./pages/manager/GoalApprovalPage";
import TeamGoalsPage from "./pages/manager/TeamGoalsPage";
import ManagerCheckInPage from "./pages/manager/ManagerCheckInPage";

// Goal Module — HR/Admin
import GoalCycleManagementPage from "./pages/hr/GoalCycleManagementPage";
import ThrustAreaManagementPage from "./pages/hr/ThrustAreaManagementPage";
import SharedGoalPushPage from "./pages/hr/SharedGoalPushPage";
import GoalUnlockPage from "./pages/hr/GoalUnlockPage";
import GoalAuditLogPage from "./pages/hr/GoalAuditLogPage";
import AchievementReportPage from "./pages/hr/AchievementReportPage";
import CheckInDashboardPage from "./pages/hr/CheckInDashboardPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected App Routes - All authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="salary" element={<MySalaryPage />} />
                <Route path="leaves" element={<MyLeavesPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="holidays" element={<HolidaysPage />} />
                <Route path="my-onboarding" element={<MyOnboardingPage />} />
                <Route path="my-offboarding" element={<MyOffboardingPage />} />
                <Route path="attendance-regularization" element={<AttendanceRegularizationPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="work-log" element={<WorkLogPage />} />
                <Route path="work-log-analytics" element={<WorkLogAnalyticsPage />} />
                <Route path="appreciations" element={<AppreciationsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                {/* Goal Module — Employee */}
                <Route path="goals" element={<MyGoalsPage />} />
                <Route path="goals/create" element={<GoalSheetPage />} />
                <Route path="goals/checkin" element={<GoalCheckInPage />} />
              </Route>
            </Route>
            
            {/* Manager Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Manager', 'Admin']} />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="team" element={<MyTeamPage />} />
                <Route path="leave-approvals" element={<ApprovalsPage />} />
                <Route path="manager/work-log-review" element={<TeamWorkLogsPage />} />
                <Route path="team-analytics" element={<TeamAnalyticsPage />} />
                {/* Goal Module — Manager */}
                <Route path="manager/goal-approvals" element={<GoalApprovalPage />} />
                <Route path="manager/team-goals" element={<TeamGoalsPage />} />
                <Route path="manager/team-checkin" element={<ManagerCheckInPage />} />
              </Route>
            </Route>
            
            {/* Admin (HR) Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/app" element={<AppLayout />}>
                <Route path="directory" element={<EmployeeDirectoryPage />} />
                <Route path="add-employee" element={<AddEmployeePage />} />
                <Route path="edit-employee/:id" element={<EditEmployeePage />} />
                <Route path="bulk-upload" element={<BulkUploadPage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="offboarding" element={<OffboardingPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin/attendance-records" element={<AttendanceRecordsPage />} />
                <Route path="admin/attendance-regularization" element={<AttendanceRegularizationAdminPage />} />
                <Route path="admin/salary-overview" element={<SalaryOverviewPage />} />
                {/* Goal Module — Admin */}
                <Route path="hr/goal-cycles" element={<GoalCycleManagementPage />} />
                <Route path="hr/thrust-areas" element={<ThrustAreaManagementPage />} />
                <Route path="hr/shared-goals" element={<SharedGoalPushPage />} />
                <Route path="hr/goal-unlock" element={<GoalUnlockPage />} />
                <Route path="hr/goal-audit" element={<GoalAuditLogPage />} />
                <Route path="hr/achievement-report" element={<AchievementReportPage />} />
                <Route path="hr/checkin-dashboard" element={<CheckInDashboardPage />} />
              </Route>
            </Route>
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;