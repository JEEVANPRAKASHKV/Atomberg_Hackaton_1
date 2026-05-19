import { useState } from 'react';
import { format } from 'date-fns';
import { useWorkLog } from '@/hooks/useWorkLog';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { WeekNavigation } from '@/components/worklog/WeekNavigation';
import { WeekProgressBar } from '@/components/worklog/WeekProgressBar';
import { DaySection } from '@/components/worklog/DaySection';
import { CategoryBreakdown } from '@/components/worklog/CategoryBreakdown';
import { DayStatusBadge } from '@/components/worklog/DayStatusBadge';
import { Send, Save, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WorkLogPage = () => {
  const { employee } = useAuth();
  const {
    loading,
    saving,
    weekLog,
    employees,
    currentWeekStart,
    isWeekEditable,
    getDayTasks,
    getWeekSummary,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    goToWeek,
    addTask,
    updateTask,
    deleteTask,
    submitDay,
    submitWeek,
  } = useWorkLog();

  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const days = getDayTasks();
  const summary = getWeekSummary();
  const hasTasks = days.some(d => d.tasks.length > 0);
  const canSubmitWeek = hasTasks && (weekLog?.status === 'Draft' || weekLog?.status === 'Rework');
  const hasReworkDays = days.some(d => d.status === 'Rework');

  const handleDeleteTask = (taskId: string): Promise<boolean> => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
    return Promise.resolve(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete);
      setTaskToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleSubmitWeek = async () => {
    await submitWeek();
    setShowSubmitDialog(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Work Log
            </h1>
            <p className="text-muted-foreground">Track your daily tasks and activities</p>
          </div>

          {weekLog && (
            <DayStatusBadge status={weekLog.status} className="text-sm px-3 py-1" />
          )}
        </div>

        {/* Week Navigation */}
        <WeekNavigation
          currentWeekStart={currentWeekStart}
          onPrevious={goToPreviousWeek}
          onNext={goToNextWeek}
          onGoToWeek={goToWeek}
          onGoToCurrent={goToCurrentWeek}
        />
      </div>

      {/* Rework Alert Banner */}
      {hasReworkDays && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-700 dark:text-orange-400">Rework Required</h3>
            <p className="text-sm text-orange-600 dark:text-orange-300">
              Some days have been sent back for rework. Please review the manager's feedback and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* Week Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <WeekProgressBar summary={summary} />
        </div>
        <CategoryBreakdown breakdown={summary.categoryBreakdown} />
      </div>

      {/* Days Grid */}
      <div className="space-y-4">
        {days.map((day) => (
          <DaySection
            key={day.dateStr}
            day={day}
            employees={employees}
            managerId={employee?.manager_id || undefined}
            isEditable={isWeekEditable}
            saving={saving}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={handleDeleteTask}
            onSubmitDay={submitDay}
          />
        ))}
      </div>

      {/* Week Actions */}
      {canSubmitWeek && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>All changes are auto-saved</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="default" 
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={saving}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Entire Week
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved/Submitted Message */}
      {weekLog?.status === 'Approved' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Week Approved</p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Your work log for this week has been approved by your manager.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {weekLog?.status === 'Submitted' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-400">Pending Review</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Your work log has been submitted and is awaiting manager approval.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Week Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Week for Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit all your tasks for the week of {format(currentWeekStart, 'MMM d')} - {format(new Date(currentWeekStart.getTime() + 4 * 24 * 60 * 60 * 1000), 'MMM d, yyyy')} for manager review.
              You won't be able to edit these entries until they're approved or sent back for rework.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitWeek}>
              Submit Week
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkLogPage;
