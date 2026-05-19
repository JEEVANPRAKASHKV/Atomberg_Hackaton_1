import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Target, Plus, ChevronRight, ClipboardCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMyGoalSheets, useActiveGoalCycle } from '@/hooks/useGoals';
import { GoalSheetStatusBadge } from '@/components/goals/GoalStatusBadges';
import { GoalWeightageBar } from '@/components/goals/GoalWeightageBar';
import { CheckInWindowBanner } from '@/components/goals/CheckInWindowBanner';

const MyGoalsPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setEmployeeId(data.id); });
  }, [user]);

  const { data: sheets = [], isLoading } = useMyGoalSheets(employeeId ?? '');
  const { data: activeCycle }            = useActiveGoalCycle();

  const hasActiveSheet = sheets.some(s => s.cycle_id === activeCycle?.id);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" /> My Goals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your goal sheets and quarterly check-ins across all cycles.
          </p>
        </div>
        {activeCycle && !hasActiveSheet && (
          <Button onClick={() => navigate('/app/goals/create')} className="gap-2">
            <Plus className="w-4 h-4" /> Create Goal Sheet
          </Button>
        )}
        {activeCycle && hasActiveSheet && (
          <Button variant="outline" onClick={() => navigate('/app/goals/checkin')} className="gap-2">
            <ClipboardCheck className="w-4 h-4" /> Submit Check-In
          </Button>
        )}
      </div>

      {/* Active cycle check-in banner */}
      {activeCycle && <CheckInWindowBanner cycle={activeCycle} />}

      {/* No active cycle */}
      {!activeCycle && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Target className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            No active goal cycle at the moment. HR will notify you when the next cycle begins.
          </p>
        </div>
      )}

      {/* Goal Sheets */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading your goal sheets…</div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-4 text-center">
          <Target className="w-14 h-14 text-muted-foreground" />
          <div>
            <p className="font-semibold text-lg">No Goal Sheets Yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              {activeCycle
                ? 'Start by creating your goal sheet for the current cycle.'
                : 'Wait for HR to activate a goal cycle.'}
            </p>
          </div>
          {activeCycle && (
            <Button onClick={() => navigate('/app/goals/create')} className="gap-2">
              <Plus className="w-4 h-4" /> Create My First Goal Sheet
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sheets.map(sheet => {
            const goals = (sheet as any).goals ?? [];
            const cycle = (sheet as any).cycle;
            const isActive = sheet.cycle_id === activeCycle?.id;

            return (
              <div
                key={sheet.id}
                className={`rounded-2xl border bg-card overflow-hidden transition-all ${
                  isActive ? 'ring-2 ring-primary/30 shadow-sm' : ''
                }`}
              >
                {/* Sheet Header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{cycle?.cycle_name ?? 'Unknown Cycle'}</p>
                      {isActive && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {goals.length} goal{goals.length !== 1 ? 's' : ''}
                      {sheet.submitted_at && (
                        <> · Submitted {format(new Date(sheet.submitted_at), 'dd MMM yyyy')}</>
                      )}
                      {sheet.approved_at && (
                        <> · Approved {format(new Date(sheet.approved_at), 'dd MMM yyyy')}</>
                      )}
                    </p>
                  </div>

                  <GoalSheetStatusBadge status={sheet.status} />

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(
                      sheet.status === 'draft' || sheet.status === 'rework'
                        ? '/app/goals/create'
                        : '/app/goals/checkin'
                    )}
                    className="gap-1"
                  >
                    {sheet.status === 'draft' || sheet.status === 'rework'
                      ? 'Edit'
                      : <><ClipboardCheck className="w-4 h-4" /> Check-In</>
                    }
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Weightage Bar */}
                {goals.length > 0 && (
                  <div className="px-5 pb-4">
                    <GoalWeightageBar goals={goals} />
                  </div>
                )}

                {/* Goal Mini List */}
                {goals.length > 0 && (
                  <div className="border-t px-5 py-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {goals.slice(0, 4).map((g: any, i: number) => (
                      <div key={g.id} className="flex items-center gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate text-muted-foreground">{g.goal_title}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-auto">{g.weightage}%</span>
                      </div>
                    ))}
                    {goals.length > 4 && (
                      <p className="text-xs text-muted-foreground col-span-full">
                        +{goals.length - 4} more goal{goals.length - 4 !== 1 ? 's' : ''}…
                      </p>
                    )}
                  </div>
                )}

                {/* Rework comment */}
                {sheet.status === 'rework' && sheet.rework_comment && (
                  <div className="border-t px-5 py-3 bg-amber-50">
                    <p className="text-xs font-semibold text-amber-800">Manager's Feedback:</p>
                    <p className="text-xs text-amber-700 mt-0.5">{sheet.rework_comment}</p>
                    <Button
                      size="sm"
                      className="mt-2 gap-1"
                      onClick={() => navigate('/app/goals/create')}
                    >
                      <Plus className="w-3 h-3" /> Revise Now
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyGoalsPage;