import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Unlock, Search, Lock, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import {
  useGoalCycles, useAllGoalSheets, useUpdateGoalSheetStatus, useInsertAuditLog
} from '@/hooks/useGoals';
import { GoalSheetStatusBadge } from '@/components/goals/GoalStatusBadges';
import type { GoalSheet } from '@/types/goals';

const GoalUnlockPage = () => {
  const { toast }  = useToast();
  const { user }   = useAuth();

  const [adminId,       setAdminId]       = useState<string | null>(null);
  const [filterCycle,   setFilterCycle]   = useState<string>('');
  const [search,        setSearch]        = useState('');
  const [filterDept,    setFilterDept]    = useState<string>('all');
  const [unlocking,     setUnlocking]     = useState<GoalSheet | null>(null);
  const [reason,        setReason]        = useState('');
  const [saving,        setSaving]        = useState(false);

  const updateStatus = useUpdateGoalSheetStatus();
  const insertAudit  = useInsertAuditLog();

  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setAdminId(data.id); });
  }, [user]);

  const { data: cycles = [] }  = useGoalCycles();
  const activeCycle            = cycles.find(c => c.status === 'active');
  const selectedCycleId        = filterCycle || activeCycle?.id || '';

  const { data: allSheets = [], isLoading } = useAllGoalSheets(selectedCycleId);

  // Only show locked (approved) sheets
  const lockedSheets = allSheets.filter(s => s.status === 'approved' && s.is_locked);

  // Extract departments
  const departments = useMemo(() =>
    Array.from(new Set(lockedSheets.map(s => s.employee?.department).filter(Boolean) as string[])).sort(),
    [lockedSheets]
  );

  // Apply filters
  const filtered = lockedSheets.filter(s => {
    const matchSearch = !search || s.employee?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchDept   = filterDept === 'all' || s.employee?.department === filterDept;
    return matchSearch && matchDept;
  });

  const handleUnlock = async () => {
    if (!unlocking || !adminId) return;
    if (!reason.trim()) {
      toast({ title: 'Please provide an unlock reason', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      // Set sheet back to rework with unlock reason as rework_comment
      await updateStatus.mutateAsync({
        id:             unlocking.id,
        status:         'rework',
        rework_comment: `[ADMIN UNLOCK] ${reason.trim()}`,
      });

      // Log to audit for each goal in this sheet
      const goals = (unlocking as any).goals ?? [];
      for (const goal of goals) {
        await insertAudit.mutateAsync({
          goal_id:      goal.id,
          changed_by:   adminId,
          change_type:  'unlock',
          field_changed: 'is_locked',
          old_value:    'true',
          new_value:    'false',
        });
      }

      toast({ title: `🔓 Goal sheet unlocked for ${unlocking.employee?.full_name}` });
      setUnlocking(null);
      setReason('');
    } catch (err: any) {
      toast({ title: 'Error unlocking', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Unlock className="w-6 h-6 text-primary" /> Goal Unlock
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Unlock approved and locked goal sheets to allow employees to make corrections. All unlocks are audited.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700">
          <p className="font-semibold">Unlock will revert the sheet to "Rework" status</p>
          <p className="text-xs mt-1">
            The employee will need to re-submit their goal sheet for manager approval.
            Every unlock action is recorded in the Goal Audit Log.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={selectedCycleId} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.cycle_name}{c.status === 'active' ? ' (Active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48"
        />

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} locked sheet{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Locked Sheets List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-3 text-center">
          <Lock className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-lg">No Locked Goal Sheets</p>
          <p className="text-sm text-muted-foreground">
            {lockedSheets.length === 0
              ? 'No approved goal sheets found for this cycle.'
              : 'No results match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sheet => {
            const goals = (sheet as any).goals ?? [];
            return (
              <div key={sheet.id} className="rounded-2xl border bg-card p-5 flex items-center gap-4">
                {/* Lock Icon */}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-green-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{sheet.employee?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[sheet.employee?.designation, sheet.employee?.department].filter(Boolean).join(' · ')}
                    {' '}&nbsp;·&nbsp; {goals.length} goals
                    {sheet.approved_at && (
                      <> · Approved {format(new Date(sheet.approved_at), 'dd MMM yyyy')}</>
                    )}
                  </p>
                </div>

                {/* Goals Count */}
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-muted border px-2 py-1 rounded-full">
                    {goals.length} goal{goals.length !== 1 ? 's' : ''}
                  </span>
                  <GoalSheetStatusBadge status={sheet.status} />
                </div>

                {/* Unlock Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 shrink-0"
                  onClick={() => { setUnlocking(sheet); setReason(''); }}
                >
                  <Unlock className="w-3.5 h-3.5" /> Unlock
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Unlock Confirm Dialog */}
      <Dialog open={!!unlocking} onOpenChange={() => { setUnlocking(null); setReason(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-amber-500" /> Unlock Goal Sheet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Employee info */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 border">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                {unlocking?.employee?.full_name?.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{unlocking?.employee?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {unlocking?.employee?.department} · {(unlocking as any)?.goals?.length ?? 0} goals
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unlock-reason">Unlock Reason * (recorded in audit log)</Label>
              <Textarea
                id="unlock-reason"
                placeholder="e.g. Employee requested correction to Q2 target for Sales goal. Approved by CHRO."
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <History className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                This action will be recorded in the <strong>Goal Audit Log</strong> for all {(unlocking as any)?.goals?.length ?? 0} goals in this sheet.
                The employee's sheet status will revert to <strong>Rework</strong>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnlocking(null); setReason(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={saving || !reason.trim()}
              className="gap-2 bg-amber-500 hover:bg-amber-600"
            >
              {saving
                ? 'Unlocking…'
                : <><Unlock className="w-4 h-4" /> Confirm Unlock</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalUnlockPage;