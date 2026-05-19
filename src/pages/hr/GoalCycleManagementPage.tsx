import { useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar, Plus, CheckCircle2, Lock, RotateCcw, Pencil, Trash2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useGoalCycles, useCreateGoalCycle, useUpdateGoalCycleStatus
} from '@/hooks/useGoals';
import { GoalSheetStatusBadge } from '@/components/goals/GoalStatusBadges';
import type { GoalCycle, CycleStatus } from '@/types/goals';

// ── Status badge for cycle ───────────────────────────────────
const CycleStatusBadge = ({ status }: { status: CycleStatus }) => {
  const config = {
    draft:  { label: 'Draft',  icon: <Pencil className="w-3 h-3" />,       cls: 'bg-gray-100 text-gray-700 border-gray-200' },
    active: { label: 'Active', icon: <CheckCircle2 className="w-3 h-3" />, cls: 'bg-green-100 text-green-700 border-green-200' },
    closed: { label: 'Closed', icon: <Lock className="w-3 h-3" />,         cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const { label, icon, cls } = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {icon} {label}
    </span>
  );
};

// ── Empty form state ─────────────────────────────────────────
const emptyForm = {
  cycle_name: '',
  goal_setting_opens: '',
  q1_opens: '',
  q2_opens: '',
  q3_opens: '',
  q4_opens: '',
};

// ── Main Page ────────────────────────────────────────────────
const GoalCycleManagementPage = () => {
  const { toast } = useToast();
  const { data: cycles = [], isLoading } = useGoalCycles();
  const createCycle = useCreateGoalCycle();
  const updateStatus = useUpdateGoalCycleStatus();

  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState(emptyForm);
  const [activating, setActivating]       = useState<GoalCycle | null>(null);
  const [closing, setClosing]             = useState<GoalCycle | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async () => {
    // Basic validation
    const fields = Object.values(form);
    if (fields.some(f => !f)) {
      toast({ title: 'All fields are required', variant: 'destructive' });
      return;
    }
    try {
      await createCycle.mutateAsync({ ...form, status: 'draft' });
      toast({ title: '✅ Goal cycle created successfully!' });
      setShowForm(false);
      setForm(emptyForm);
    } catch (err: any) {
      toast({ title: 'Error creating cycle', description: err.message, variant: 'destructive' });
    }
  };

  const handleActivate = async () => {
    if (!activating) return;
    try {
      await updateStatus.mutateAsync({ id: activating.id, status: 'active' });
      toast({ title: `✅ "${activating.cycle_name}" is now Active` });
      setActivating(null);
    } catch (err: any) {
      toast({ title: 'Error activating cycle', description: err.message, variant: 'destructive' });
    }
  };

  const handleClose = async () => {
    if (!closing) return;
    try {
      await updateStatus.mutateAsync({ id: closing.id, status: 'closed' });
      toast({ title: `🔒 "${closing.cycle_name}" has been closed` });
      setClosing(null);
    } catch (err: any) {
      toast({ title: 'Error closing cycle', description: err.message, variant: 'destructive' });
    }
  };

  const activeCycle = cycles.find(c => c.status === 'active');

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" /> Goal Cycles
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage annual goal cycles with quarterly check-in windows.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Cycle
        </Button>
      </div>

      {/* ── Active Cycle Banner ── */}
      {activeCycle && (
        <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-800">{activeCycle.cycle_name} is currently active</p>
            <p className="text-xs text-green-700">
              Goal setting opened: {format(new Date(activeCycle.goal_setting_opens), 'dd MMM yyyy')} &nbsp;·&nbsp;
              Q1: {format(new Date(activeCycle.q1_opens), 'dd MMM')} &nbsp;·&nbsp;
              Q2: {format(new Date(activeCycle.q2_opens), 'dd MMM')} &nbsp;·&nbsp;
              Q3: {format(new Date(activeCycle.q3_opens), 'dd MMM')} &nbsp;·&nbsp;
              Q4: {format(new Date(activeCycle.q4_opens), 'dd MMM')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setClosing(activeCycle)}
          >
            <Lock className="w-4 h-4 mr-1" /> Close Cycle
          </Button>
        </div>
      )}

      {/* ── Cycle Table ── */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading cycles…</div>
      ) : cycles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border rounded-2xl bg-muted/30">
          <Calendar className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="font-semibold text-lg">No Goal Cycles Yet</p>
            <p className="text-muted-foreground text-sm">Create your first cycle to allow employees to set goals.</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create First Cycle
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Cycle Name</th>
                <th className="text-left px-4 py-3 font-medium">Goal Setting Opens</th>
                <th className="text-left px-4 py-3 font-medium">Q1</th>
                <th className="text-left px-4 py-3 font-medium">Q2</th>
                <th className="text-left px-4 py-3 font-medium">Q3</th>
                <th className="text-left px-4 py-3 font-medium">Q4</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cycles.map(cycle => (
                <tr key={cycle.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{cycle.cycle_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(cycle.goal_setting_opens), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(cycle.q1_opens), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(cycle.q2_opens), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(cycle.q3_opens), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(cycle.q4_opens), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <CycleStatusBadge status={cycle.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {cycle.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => setActivating(cycle)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                        </Button>
                      )}
                      {cycle.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setClosing(cycle)}
                        >
                          <Lock className="w-3.5 h-3.5" /> Close
                        </Button>
                      )}
                      {cycle.status === 'closed' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Closed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Cycle Dialog ── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Create New Goal Cycle
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cycle_name">Cycle Name</Label>
              <Input
                id="cycle_name"
                name="cycle_name"
                placeholder="e.g. FY 2025-26"
                value={form.cycle_name}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="goal_setting_opens">Goal Setting Opens</Label>
                <Input
                  id="goal_setting_opens"
                  name="goal_setting_opens"
                  type="date"
                  value={form.goal_setting_opens}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">When employees can start setting goals</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q1_opens">Q1 Check-In Opens</Label>
                <Input
                  id="q1_opens"
                  name="q1_opens"
                  type="date"
                  value={form.q1_opens}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q2_opens">Q2 Check-In Opens</Label>
                <Input
                  id="q2_opens"
                  name="q2_opens"
                  type="date"
                  value={form.q2_opens}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q3_opens">Q3 Check-In Opens</Label>
                <Input
                  id="q3_opens"
                  name="q3_opens"
                  type="date"
                  value={form.q3_opens}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="q4_opens">Q4 Check-In Opens</Label>
                <Input
                  id="q4_opens"
                  name="q4_opens"
                  type="date"
                  value={form.q4_opens}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Only <strong>one cycle can be active</strong> at a time. Activating this cycle will automatically close the current active cycle.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createCycle.isPending} className="gap-2">
              {createCycle.isPending ? 'Creating…' : <><Plus className="w-4 h-4" /> Create Cycle</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Activate Confirm ── */}
      <AlertDialog open={!!activating} onOpenChange={() => setActivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate "{activating?.cycle_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make <strong>{activating?.cycle_name}</strong> the active goal cycle.
              Any previously active cycle will be automatically closed.
              Employees will be able to start creating their goal sheets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Close Confirm ── */}
      <AlertDialog open={!!closing} onOpenChange={() => setClosing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close "{closing?.cycle_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this cycle will <strong>lock all goal sheets and check-ins</strong>.
              Employees will no longer be able to submit check-ins for this cycle.
              This action cannot be undone without Admin intervention.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              className="bg-red-600 hover:bg-red-700"
            >
              <Lock className="w-4 h-4 mr-1.5" /> Close Cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalCycleManagementPage;