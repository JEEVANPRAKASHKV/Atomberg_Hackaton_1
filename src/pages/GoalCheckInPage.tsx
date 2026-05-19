import { useEffect, useState } from 'react';
import { ClipboardCheck, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useActiveGoalCycle, useGoalSheet, useGoals, useUpsertCheckin
} from '@/hooks/useGoals';
import { CheckInWindowBanner } from '@/components/goals/CheckInWindowBanner';
import { QuarterSelector } from '@/components/goals/QuarterSelector';
import { GoalStatusBadge } from '@/components/goals/GoalStatusBadges';
import { UoMScoreDisplay } from '@/components/goals/UoMScoreDisplay';
import { getActiveQuarter, computeGoalScore, isQuarterOpen } from '@/types/goals';
import type { QuarterType, GoalStatus, GoalCheckin } from '@/types/goals';

const GoalCheckInPage = () => {
  const { toast } = useToast();
  const { user }  = useAuth();

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [quarter, setQuarter]       = useState<QuarterType>('Q1');
  const [saving, setSaving]         = useState(false);

  // Local checkin state: goalId -> checkin fields
  const [checkins, setCheckins] = useState<
    Record<string, { actual_value: string; actual_date: string; progress_status: GoalStatus }>
  >({});

  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setEmployeeId(data.id); });
  }, [user]);

  const { data: cycle }  = useActiveGoalCycle();
  const { data: sheet }  = useGoalSheet(employeeId ?? '', cycle?.id ?? '');
  const { data: goals = [], refetch } = useGoals(sheet?.id ?? '');
  const upsertCheckin    = useUpsertCheckin();

  // Set default quarter to active one
  useEffect(() => {
    if (!cycle) return;
    const active = getActiveQuarter(cycle);
    if (active) setQuarter(active);
  }, [cycle]);

  // Seed local state from existing checkins when quarter/goals change
  useEffect(() => {
    if (!goals.length) return;
    const initial: typeof checkins = {};
    goals.forEach(goal => {
      const existing = goal.checkins?.find(c => c.quarter === quarter);
      initial[goal.id] = {
        actual_value:     existing?.actual_value?.toString() ?? '',
        actual_date:      existing?.actual_date ?? '',
        progress_status:  existing?.progress_status ?? 'not_started',
      };
    });
    setCheckins(initial);
  }, [goals, quarter]);

  const updateCheckin = (goalId: string, field: string, value: string) => {
    setCheckins(prev => ({ ...prev, [goalId]: { ...prev[goalId], [field]: value } }));
  };

  const handleSave = async () => {
    if (!cycle || !sheet || !employeeId) return;
    if (!isQuarterOpen(cycle, quarter)) {
      toast({ title: `${quarter} check-in window is not open yet`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      for (const goal of goals) {
        const c = checkins[goal.id];
        if (!c) continue;

        const fakeCheckin: GoalCheckin = {
          id: '',
          goal_id: goal.id,
          employee_id: employeeId,
          quarter,
          actual_value: c.actual_value ? Number(c.actual_value) : undefined,
          actual_date: c.actual_date || undefined,
          progress_status: c.progress_status,
          computed_score: 0,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const score = computeGoalScore(goal, fakeCheckin);

        await upsertCheckin.mutateAsync({
          goal_id:         goal.id,
          employee_id:     employeeId,
          quarter,
          actual_value:    c.actual_value ? Number(c.actual_value) : undefined,
          actual_date:     c.actual_date || undefined,
          progress_status: c.progress_status,
          computed_score:  score,
        });
      }
      await refetch();
      toast({ title: `✅ ${quarter} check-in saved successfully!` });
    } catch (err: any) {
      toast({ title: 'Error saving check-in', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Guards ──
  if (!cycle) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <AlertCircle className="w-12 h-12 text-amber-500" />
      <h2 className="text-xl font-bold">No Active Goal Cycle</h2>
      <p className="text-muted-foreground max-w-sm">HR hasn't activated a goal cycle yet.</p>
    </div>
  );

  if (!sheet || !sheet.is_locked) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <ClipboardCheck className="w-12 h-12 text-muted-foreground" />
      <h2 className="text-xl font-bold">Goal Sheet Not Approved Yet</h2>
      <p className="text-muted-foreground max-w-sm">
        Your goal sheet needs to be approved by your manager before you can submit check-ins.
      </p>
    </div>
  );

  const quarterOpen = isQuarterOpen(cycle, quarter);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" /> Quarterly Check-In
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {cycle.cycle_name} · Update your actual progress against each goal.
        </p>
      </div>

      {/* Banner */}
      <CheckInWindowBanner cycle={cycle} />

      {/* Quarter Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Select Quarter</Label>
        <QuarterSelector
          cycle={cycle}
          value={quarter}
          onChange={setQuarter}
        />
      </div>

      {/* Window closed warning */}
      {!quarterOpen && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">
            The <strong>{quarter}</strong> check-in window is not open yet. You can view previous check-ins but cannot submit new ones.
          </p>
        </div>
      )}

      {/* Goal Check-In Rows */}
      <div className="space-y-4">
        {goals.map((goal, idx) => {
          const c = checkins[goal.id] ?? { actual_value: '', actual_date: '', progress_status: 'not_started' as GoalStatus };
          const existingCheckin = goal.checkins?.find(ch => ch.quarter === quarter);

          // Build a temporary checkin for score display
          const tempCheckin = {
            ...existingCheckin,
            actual_value: c.actual_value ? Number(c.actual_value) : existingCheckin?.actual_value,
            actual_date:  c.actual_date  || existingCheckin?.actual_date,
            progress_status: c.progress_status,
            computed_score: 0,
            id: existingCheckin?.id ?? '',
            goal_id: goal.id,
            employee_id: employeeId ?? '',
            quarter,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return (
            <div key={goal.id} className="rounded-2xl border bg-card p-5 space-y-4">
              {/* Goal Title */}
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                    {goal.goal_title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Weightage: {goal.weightage}%
                    {goal.thrust_area && <> · {goal.thrust_area.name}</>}
                    {goal.target_value != null && <> · Target: {goal.target_value}</>}
                    {goal.target_date && <> · By: {goal.target_date}</>}
                  </p>
                </div>
                <GoalStatusBadge status={c.progress_status} />
              </div>

              {/* Score Display */}
              <UoMScoreDisplay goal={goal} checkin={tempCheckin as any} />

              {/* Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Progress Status */}
                <div className="space-y-1.5">
                  <Label>Progress Status</Label>
                  <Select
                    value={c.progress_status}
                    onValueChange={v => updateCheckin(goal.id, 'progress_status', v)}
                    disabled={!quarterOpen}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actual Value */}
                {(goal.uom_type === 'min' || goal.uom_type === 'max') && (
                  <div className="space-y-1.5">
                    <Label>Actual Value</Label>
                    <Input
                      type="number"
                      placeholder={`Target: ${goal.target_value ?? '—'}`}
                      value={c.actual_value}
                      onChange={e => updateCheckin(goal.id, 'actual_value', e.target.value)}
                      disabled={!quarterOpen}
                    />
                  </div>
                )}

                {/* Actual Date */}
                {goal.uom_type === 'timeline' && (
                  <div className="space-y-1.5">
                    <Label>Actual Completion Date</Label>
                    <Input
                      type="date"
                      value={c.actual_date}
                      onChange={e => updateCheckin(goal.id, 'actual_date', e.target.value)}
                      disabled={!quarterOpen}
                    />
                  </div>
                )}

                {/* Zero metric note */}
                {goal.uom_type === 'zero' && (
                  <div className="flex items-end pb-1 md:col-span-2">
                    <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg w-full">
                      Mark <strong>Completed</strong> if zero incidents occurred this quarter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      {quarterOpen && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
            <CheckCircle2 className="w-5 h-5" />
            {saving ? 'Saving…' : `Save ${quarter} Check-In`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default GoalCheckInPage;