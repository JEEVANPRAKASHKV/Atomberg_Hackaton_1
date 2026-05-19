import { useEffect, useState, useMemo } from 'react';
import { Share2, Search, Plus, Check, X, Users, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  useGoalCycles, useAllGoalSheets, usePushSharedGoal
} from '@/hooks/useGoals';

const SharedGoalPushPage = () => {
  const { toast } = useToast();
  const { user }  = useAuth();

  const [adminId,       setAdminId]       = useState<string | null>(null);
  const [filterCycle,   setFilterCycle]   = useState<string>('');
  const [sourceSheet,   setSourceSheet]   = useState<string>('');
  const [sourceGoalId,  setSourceGoalId]  = useState<string>('');
  const [selectedEmps,  setSelectedEmps]  = useState<string[]>([]);
  const [weightage,     setWeightage]     = useState<string>('20');
  const [empSearch,     setEmpSearch]     = useState('');
  const [showDialog,    setShowDialog]    = useState(false);
  const [pushing,       setPushing]       = useState(false);

  const pushGoal = usePushSharedGoal();

  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setAdminId(data.id); });
  }, [user]);

  const { data: cycles = [] }  = useGoalCycles();
  const activeCycle            = cycles.find(c => c.status === 'active');
  const selectedCycleId        = filterCycle || activeCycle?.id || '';

  const { data: allSheets = [], isLoading } = useAllGoalSheets(selectedCycleId);

  // Employees list (all with approved sheets)
  const employees = useMemo(() =>
    allSheets
      .filter(s => s.status === 'approved')
      .map(s => s.employee)
      .filter(Boolean),
    [allSheets]
  );

  // Goals from the selected source sheet
  const sourceGoals = useMemo(() => {
    if (!sourceSheet) return [];
    const sheet = allSheets.find(s => s.id === sourceSheet);
    return (sheet as any)?.goals ?? [];
  }, [allSheets, sourceSheet]);

  const selectedGoal = sourceGoals.find((g: any) => g.id === sourceGoalId);

  // Filtered employees (exclude source sheet owner)
  const sourceSheetOwner = allSheets.find(s => s.id === sourceSheet)?.employee?.id;
  const filteredEmps = employees.filter(e =>
    e?.id !== sourceSheetOwner &&
    (!empSearch || e?.full_name?.toLowerCase().includes(empSearch.toLowerCase()))
  );

  const toggleEmp = (id: string) =>
    setSelectedEmps(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handlePush = async () => {
    if (!selectedGoal || selectedEmps.length === 0 || !selectedCycleId || !adminId) return;
    if (!weightage || Number(weightage) < 10) {
      toast({ title: 'Weightage must be at least 10%', variant: 'destructive' }); return;
    }
    setPushing(true);
    let successCount = 0;
    for (const empId of selectedEmps) {
      try {
        await pushGoal.mutateAsync({
          cycle_id:          selectedCycleId,
          source_goal_id:    sourceGoalId,
          pushed_by:         adminId,
          target_employee_id: empId,
          custom_weightage:  Number(weightage),
        });
        successCount++;
      } catch (err) { /* skip duplicates */ }
    }
    toast({ title: `✅ Shared goal pushed to ${successCount} employee${successCount !== 1 ? 's' : ''}` });
    setShowDialog(false);
    setSelectedEmps([]);
    setSourceGoalId('');
    setPushing(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6 text-primary" /> Shared Goals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Push a departmental KPI goal to multiple employees. It will appear in their goal sheets as a shared goal.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border bg-blue-50 border-blue-200 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-semibold">How Shared Goals work</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Select a <strong>source goal</strong> from any approved employee's sheet</li>
            <li>Choose one or more <strong>target employees</strong></li>
            <li>Set a <strong>custom weightage</strong> (can differ from source)</li>
            <li>The goal appears in each target employee's sheet as a <strong>Shared Goal</strong> (read-only)</li>
          </ol>
        </div>
      </div>

      {/* Step 1: Cycle */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Step 1 — Select Cycle</p>
        <Select value={selectedCycleId} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select goal cycle…" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.cycle_name}{c.status === 'active' ? ' (Active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2: Source Sheet & Goal */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Step 2 — Pick Source Goal</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Source Employee</Label>
            <Select value={sourceSheet} onValueChange={v => { setSourceSheet(v); setSourceGoalId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee sheet…" />
              </SelectTrigger>
              <SelectContent>
                {allSheets.filter(s => s.status === 'approved').map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.employee?.full_name} — {s.employee?.department ?? 'No dept'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Source Goal</Label>
            <Select value={sourceGoalId} onValueChange={setSourceGoalId} disabled={!sourceSheet}>
              <SelectTrigger>
                <SelectValue placeholder="Select goal…" />
              </SelectTrigger>
              <SelectContent>
                {sourceGoals.map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.goal_title} ({g.weightage}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview selected goal */}
        {selectedGoal && (
          <div className="rounded-xl bg-muted/50 border p-4 space-y-1">
            <p className="font-medium">{selectedGoal.goal_title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="bg-background border px-2 py-0.5 rounded-full">UoM: {selectedGoal.uom_type}</span>
              {selectedGoal.target_value != null && (
                <span className="bg-background border px-2 py-0.5 rounded-full">Target: {selectedGoal.target_value}</span>
              )}
              {selectedGoal.target_date && (
                <span className="bg-background border px-2 py-0.5 rounded-full">By: {selectedGoal.target_date}</span>
              )}
              {selectedGoal.thrust_area && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedGoal.thrust_area.name}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Target Employees + Weightage */}
      {sourceGoalId && (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Step 3 — Select Targets & Weightage</p>

          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-1.5 flex-1 min-w-48">
              <Label>Search Employees</Label>
              <Input
                placeholder="Filter by name…"
                value={empSearch}
                onChange={e => setEmpSearch(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 w-36">
              <Label>Weightage % *</Label>
              <Input
                type="number" min={10} max={100}
                value={weightage}
                onChange={e => setWeightage(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setSelectedEmps(filteredEmps.map(e => e!.id))}
              variant="outline" size="sm"
            >
              Select All
            </Button>
            <Button
              onClick={() => setSelectedEmps([])}
              variant="ghost" size="sm"
            >
              Clear
            </Button>
          </div>

          {/* Employee List */}
          <div className="grid md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {filteredEmps.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                No eligible employees found.
              </p>
            ) : filteredEmps.map(emp => {
              if (!emp) return null;
              const checked = selectedEmps.includes(emp.id);
              return (
                <div
                  key={emp.id}
                  onClick={() => toggleEmp(emp.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleEmp(emp.id)} />
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {emp.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.department ?? '—'}</p>
                  </div>
                  {checked && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Push Button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedEmps.length} employee{selectedEmps.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={() => setShowDialog(true)}
              disabled={selectedEmps.length === 0}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" /> Push Goal to {selectedEmps.length} Employee{selectedEmps.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" /> Confirm Shared Goal Push
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to push <strong>"{selectedGoal?.goal_title}"</strong> to{' '}
              <strong>{selectedEmps.length} employee{selectedEmps.length !== 1 ? 's' : ''}</strong>{' '}
              with a weightage of <strong>{weightage}%</strong>.
            </p>
            <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg">
              This goal will appear as a <strong>Shared Goal</strong> in each employee's goal sheet.
              They will not be able to edit it — only submit check-ins.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handlePush} disabled={pushing} className="gap-2">
              {pushing ? 'Pushing…' : <><Share2 className="w-4 h-4" /> Confirm Push</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SharedGoalPushPage;