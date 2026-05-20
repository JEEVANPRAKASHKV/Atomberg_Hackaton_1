import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Send, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useActiveGoalCycle, useGoalSheet, useCreateGoalSheet,
  useUpsertGoal, useDeleteGoal, useUpdateGoalSheetStatus, useThrustAreas,
  useSharedGoals, useUpdateSharedGoalStatus
} from '@/hooks/useGoals';
import { GoalWeightageBar } from '@/components/goals/GoalWeightageBar';
import { GoalSheetStatusBadge, SharedGoalBadge } from '@/components/goals/GoalStatusBadges';
import { CheckInWindowBanner } from '@/components/goals/CheckInWindowBanner';
import { validateWeightageTotal } from '@/types/goals';
import type { Goal, UoMType } from '@/types/goals';

const UOM_OPTIONS: { value: UoMType; label: string; hint: string }[] = [
  { value: 'min', label: 'Higher is Better (Min→Max)', hint: 'e.g. Sales Revenue, Units Sold' },
  { value: 'max', label: 'Lower is Better (Max→Min)', hint: 'e.g. Cost, TAT, Error Rate' },
  { value: 'timeline', label: 'Date-Based (On-time)', hint: 'e.g. Project Completion, Launch Date' },
  { value: 'zero', label: 'Zero = Success', hint: 'e.g. Safety Incidents, Complaints' },
];

const emptyGoalRow = (employeeId: string, sheetId: string) => ({
  id: undefined as string | undefined,
  goal_sheet_id: sheetId,
  employee_id: employeeId,
  thrust_area_id: '',
  goal_title: '',
  description: '',
  uom_type: 'min' as UoMType,
  target_value: '' as unknown as number,
  target_date: '',
  weightage: 20,
  is_shared: false,
});

const GoalSheetPage = () => {
  const { toast } = useToast();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  // Get employee id
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setEmployeeId(data.id); });
  }, [user]);

  const { data: cycle }          = useActiveGoalCycle();
  const { data: thrustAreas = [] } = useThrustAreas();
  const { data: sheet, refetch } = useGoalSheet(employeeId ?? '', cycle?.id ?? '');
  const { data: sharedGoals = [] } = useSharedGoals(employeeId ?? '');
  const updateSharedStatus = useUpdateSharedGoalStatus();

  const createSheet  = useCreateGoalSheet();
  const upsertGoal   = useUpsertGoal();
  const deleteGoal   = useDeleteGoal();
  const updateStatus = useUpdateGoalSheetStatus();

  const [rows, setRows] = useState<ReturnType<typeof emptyGoalRow>[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync existing goals into local rows
  useEffect(() => {
    if (sheet?.goals && sheet.goals.length > 0 && employeeId) {
      setRows(sheet.goals.map(g => ({
        id: g.id,
        goal_sheet_id: g.goal_sheet_id,
        employee_id: g.employee_id,
        thrust_area_id: g.thrust_area_id ?? '',
        goal_title: g.goal_title,
        description: g.description ?? '',
        uom_type: g.uom_type,
        target_value: g.target_value ?? ('' as unknown as number),
        target_date: g.target_date ?? '',
        weightage: g.weightage,
        is_shared: g.is_shared,
      })));
    }
  }, [sheet, employeeId]);

  // Ensure sheet exists
  const ensureSheet = async (): Promise<string> => {
    if (sheet) return sheet.id;
    const created = await createSheet.mutateAsync({
      employee_id: employeeId!,
      cycle_id: cycle!.id,
    });
    await refetch();
    return created.id;
  };

  const addRow = async () => {
    const sheetId = await ensureSheet();
    setRows(prev => [...prev, emptyGoalRow(employeeId!, sheetId)]);
  };

  const updateRow = (idx: number, field: string, value: unknown) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = async (idx: number) => {
    const row = rows[idx];
    if (row.id && sheet) {
      await deleteGoal.mutateAsync({ goalId: row.id, sheetId: sheet.id });
    }
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAcceptSharedGoal = async (shared: any) => {
    try {
      setSaving(true);
      const sheetId = await ensureSheet();
      const sg = shared.source_goal;
      
      // 1. Insert the goal into the employee's sheet
      await upsertGoal.mutateAsync({
        goal_sheet_id: sheetId,
        employee_id: employeeId!,
        thrust_area_id: sg.thrust_area_id || undefined,
        goal_title: sg.goal_title,
        description: sg.description || undefined,
        uom_type: sg.uom_type,
        target_value: sg.target_value ?? undefined,
        target_date: sg.target_date ?? undefined,
        weightage: shared.custom_weightage ?? 20,
        is_shared: true,
        shared_goal_id: sg.id,
      } as any);

      // 2. Mark shared goal as accepted
      await updateSharedStatus.mutateAsync({
        id: shared.id,
        status: 'accepted',
        employeeId: employeeId!,
      });

      await refetch();
      toast({ title: 'Shared goal added to your sheet!' });
    } catch (err: any) {
      toast({ title: 'Error accepting goal', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeclineSharedGoal = async (shared: any) => {
    try {
      await updateSharedStatus.mutateAsync({
        id: shared.id,
        status: 'declined',
        employeeId: employeeId!,
      });
      toast({ title: 'Shared goal declined.' });
    } catch (err: any) {
      toast({ title: 'Error declining goal', description: err.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sheetId = await ensureSheet();
      for (const row of rows) {
        if (!row.goal_title.trim()) continue;
        await upsertGoal.mutateAsync({
          ...(row.id ? { id: row.id } : {}),
          goal_sheet_id: sheetId,
          employee_id: employeeId!,
          thrust_area_id: row.thrust_area_id || undefined,
          goal_title: row.goal_title,
          description: row.description || undefined,
          uom_type: row.uom_type,
          target_value: row.target_value ? Number(row.target_value) : undefined,
          target_date: row.target_date || undefined,
          weightage: Number(row.weightage),
          is_shared: row.is_shared,
        } as any);
      }
      await refetch();
      toast({ title: '✅ Goals saved as draft' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!sheet) { toast({ title: 'Save goals first', variant: 'destructive' }); return; }
    if (!validateWeightageTotal(rows)) {
      toast({ title: 'Total weightage must equal 100%', variant: 'destructive' }); return;
    }
    if (rows.filter(r => r.goal_title.trim()).length < 3) {
      toast({ title: 'Add at least 3 goals before submitting', variant: 'destructive' }); return;
    }
    if (rows.length > 8) {
      toast({ title: 'Maximum 8 goals allowed per employee', variant: 'destructive' }); return;
    }
    try {
      await handleSave();
      await updateStatus.mutateAsync({ id: sheet.id, status: 'submitted' });
      toast({ title: '🎯 Goal sheet submitted for manager approval!' });
      navigate('/app/goals');
    } catch (err: any) {
      toast({ title: 'Error submitting', description: err.message, variant: 'destructive' });
    }
  };

  // ── Guards ──
  if (!cycle) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <AlertCircle className="w-12 h-12 text-amber-500" />
      <h2 className="text-xl font-bold">No Active Goal Cycle</h2>
      <p className="text-muted-foreground max-w-md">
        HR hasn't activated a goal cycle yet. Please contact your HR Admin to set up the current cycle.
      </p>
    </div>
  );

  if (sheet?.is_locked) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
      <AlertCircle className="w-12 h-12 text-blue-500" />
      <h2 className="text-xl font-bold">Goal Sheet Locked</h2>
      <p className="text-muted-foreground max-w-md">
        Your goal sheet has been approved and locked. You can now submit quarterly check-ins.
      </p>
      <Button onClick={() => navigate('/app/goals/checkin')}>Go to Check-In</Button>
    </div>
  );

  const isSubmitted = sheet?.status === 'submitted';
  const totalGoals  = rows.filter(r => r.goal_title.trim()).length;
  const pendingShared = sharedGoals.filter(g => g.status === 'pending');

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Goal Sheet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {cycle.cycle_name} &nbsp;·&nbsp; Set your goals and define targets
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sheet && <GoalSheetStatusBadge status={sheet.status} />}
          {!isSubmitted && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                <Send className="w-4 h-4" /> Submit for Approval
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Check-In Banner */}
      <CheckInWindowBanner cycle={cycle} />

      {/* Pending Shared Goals Alert */}
      {!isSubmitted && pendingShared.length > 0 && (
        <div className="space-y-3">
          {pendingShared.map(shared => (
            <div key={shared.id} className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Shared KPI assigned by {shared.pushed_by_employee?.full_name}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <span className="font-medium">{shared.source_goal?.goal_title}</span>
                    {shared.custom_weightage && ` · Suggested weightage: ${shared.custom_weightage}%`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="bg-white" onClick={() => handleDeclineSharedGoal(shared)} disabled={saving}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => handleAcceptSharedGoal(shared)} disabled={saving || rows.length >= 8}>
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rework comment */}
      {sheet?.status === 'rework' && sheet.rework_comment && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Manager's Feedback</p>
            <p className="text-sm text-amber-700 mt-1">{sheet.rework_comment}</p>
          </div>
        </div>
      )}

      {/* Weightage Bar */}
      {rows.length > 0 && <GoalWeightageBar goals={rows} />}

      {/* Goal Rows */}
      <div className="space-y-4">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-2xl border bg-card p-5 space-y-4">
            {/* Row header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Goal #{idx + 1}</span>
              <div className="flex items-center gap-2">
                {row.is_shared && <SharedGoalBadge />}
                {!isSubmitted && !row.is_shared && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Goal Title */}
              <div className="md:col-span-2 space-y-1.5">
                <Label>Goal Title *</Label>
                <Input
                  placeholder="e.g. Increase Monthly Sales Revenue"
                  value={row.goal_title}
                  onChange={e => updateRow(idx, 'goal_title', e.target.value)}
                  disabled={isSubmitted || row.is_shared}
                />
              </div>

              {/* Thrust Area */}
              <div className="space-y-1.5">
                <Label>Thrust Area</Label>
                <Select
                  value={row.thrust_area_id}
                  onValueChange={v => updateRow(idx, 'thrust_area_id', v)}
                  disabled={isSubmitted}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                  <SelectContent>
                    {thrustAreas.map(ta => (
                      <SelectItem key={ta.id} value={ta.id}>{ta.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UoM */}
              <div className="space-y-1.5">
                <Label>Unit of Measurement *</Label>
                <Select
                  value={row.uom_type}
                  onValueChange={v => updateRow(idx, 'uom_type', v)}
                  disabled={isSubmitted || row.is_shared}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UOM_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <div>
                          <p>{o.label}</p>
                          <p className="text-xs text-muted-foreground">{o.hint}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Value / Date */}
              {(row.uom_type === 'min' || row.uom_type === 'max') && (
                <div className="space-y-1.5">
                  <Label>Target Value *</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={row.target_value as unknown as string}
                    onChange={e => updateRow(idx, 'target_value', e.target.value)}
                    disabled={isSubmitted || row.is_shared}
                  />
                </div>
              )}
              {row.uom_type === 'timeline' && (
                <div className="space-y-1.5">
                  <Label>Target Completion Date *</Label>
                  <Input
                    type="date"
                    value={row.target_date}
                    onChange={e => updateRow(idx, 'target_date', e.target.value)}
                    disabled={isSubmitted || row.is_shared}
                  />
                </div>
              )}
              {row.uom_type === 'zero' && (
                <div className="flex items-end pb-1">
                  <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg w-full">
                    Target: 0 incidents/occurrences
                  </p>
                </div>
              )}

              {/* Weightage */}
              <div className="space-y-1.5">
                <Label>Weightage % (min 10%)</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={row.weightage}
                  onChange={e => updateRow(idx, 'weightage', Number(e.target.value))}
                  disabled={isSubmitted}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2 space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Describe how you plan to achieve this goal…"
                  rows={2}
                  value={row.description}
                  onChange={e => updateRow(idx, 'description', e.target.value)}
                  disabled={isSubmitted}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Goal Button */}
      {!isSubmitted && rows.length < 8 && (
        <Button
          variant="dashed"
          className="w-full gap-2 border-2 border-dashed"
          onClick={addRow}
        >
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      )}

      {/* Max Goals Info */}
      {!isSubmitted && rows.length >= 8 && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
          You have reached the maximum limit of 8 goals.
        </div>
      )}

      {/* Info Bar */}
      {!isSubmitted && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            You need <strong>at least 3 goals</strong> and a <strong>total weightage of exactly 100%</strong> to submit.
            Current: <strong>{totalGoals} goals</strong>, <strong>{rows.reduce((s, r) => s + Number(r.weightage), 0)}% weightage</strong>.
          </p>
        </div>
      )}
    </div>
  );
};

export default GoalSheetPage;