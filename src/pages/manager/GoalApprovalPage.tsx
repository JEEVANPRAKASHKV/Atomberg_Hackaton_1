import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2, XCircle, Eye, ChevronDown, ChevronUp,
  Users, Clock, AlertCircle, Target, BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import {
  useTeamGoalSheets, useUpdateGoalSheetStatus, useGoalCycles
} from '@/hooks/useGoals';
import { GoalSheetStatusBadge } from '@/components/goals/GoalStatusBadges';
import { UoMScoreDisplay } from '@/components/goals/UoMScoreDisplay';
import type { GoalSheet, SheetStatus } from '@/types/goals';

// ── Stat Card ───────────────────────────────────────────────
const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="rounded-xl border bg-card p-4 text-center">
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </div>
);

// ── Goal Approval Page ───────────────────────────────────────
const GoalApprovalPage = () => {
  const { toast } = useToast();
  const { user }  = useAuth();

  const [managerId, setManagerId]         = useState<string | null>(null);
  const [filterCycle, setFilterCycle]     = useState<string>('all');
  const [filterStatus, setFilterStatus]   = useState<string>('submitted');
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [reviewing, setReviewing]         = useState<GoalSheet | null>(null);
  const [action, setAction]               = useState<'approved' | 'rework' | null>(null);
  const [reworkComment, setReworkComment] = useState('');

  const updateStatus = useUpdateGoalSheetStatus();
  const { data: cycles = [] } = useGoalCycles();

  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setManagerId(data.id); });
  }, [user]);

  const { data: allSheets = [], isLoading } = useTeamGoalSheets(
    filterCycle !== 'all' ? filterCycle : undefined
  );

  // Filter by status
  const sheets = allSheets.filter(s =>
    filterStatus === 'all' ? true : s.status === filterStatus
  );

  const counts = {
    submitted: allSheets.filter(s => s.status === 'submitted').length,
    approved:  allSheets.filter(s => s.status === 'approved').length,
    rework:    allSheets.filter(s => s.status === 'rework').length,
    draft:     allSheets.filter(s => s.status === 'draft').length,
  };

  const handleAction = async () => {
    if (!reviewing || !action || !managerId) return;
    if (action === 'rework' && !reworkComment.trim()) {
      toast({ title: 'Please enter your feedback comment', variant: 'destructive' });
      return;
    }
    try {
      await updateStatus.mutateAsync({
        id:             reviewing.id,
        status:         action as SheetStatus,
        approved_by:    action === 'approved' ? managerId : undefined,
        rework_comment: action === 'rework' ? reworkComment : undefined,
      });
      toast({
        title: action === 'approved'
          ? `✅ Goal sheet approved for ${reviewing.employee?.full_name}`
          : `🔄 Goal sheet returned to ${reviewing.employee?.full_name} for rework`,
      });
      setReviewing(null);
      setAction(null);
      setReworkComment('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" /> Goal Approvals
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve your team members' goal sheets.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending Review" value={counts.submitted} color="text-amber-600" />
        <StatCard label="Approved"       value={counts.approved}  color="text-green-600" />
        <StatCard label="Sent for Rework" value={counts.rework}   color="text-red-500" />
        <StatCard label="Draft"          value={counts.draft}     color="text-gray-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterCycle} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.cycle_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
          {(['all', 'submitted', 'approved', 'rework', 'draft'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                filterStatus === s
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sheet List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading team sheets…</div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-3 text-center">
          <Users className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-lg">No Goal Sheets Found</p>
          <p className="text-muted-foreground text-sm">
            {filterStatus === 'submitted'
              ? 'No submissions pending your review.'
              : 'No goal sheets match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sheets.map(sheet => {
            const isExpanded = expandedSheet === sheet.id;
            const goals = (sheet as any).goals ?? [];

            return (
              <div key={sheet.id} className="rounded-2xl border bg-card overflow-hidden">
                {/* Sheet Header Row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {sheet.employee?.full_name?.charAt(0) ?? '?'}
                    </span>
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{sheet.employee?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {sheet.employee?.designation ?? ''}{sheet.employee?.department ? ` · ${sheet.employee.department}` : ''}
                      &nbsp;·&nbsp; {goals.length} goal{goals.length !== 1 ? 's' : ''}
                      {sheet.submitted_at && (
                        <> · Submitted {format(new Date(sheet.submitted_at), 'dd MMM yyyy')}</>
                      )}
                    </p>
                  </div>

                  {/* Status */}
                  <GoalSheetStatusBadge status={sheet.status} />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {sheet.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setReviewing(sheet); setAction('approved'); }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => { setReviewing(sheet); setAction('rework'); }}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Rework
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
                    >
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                </div>

                {/* Expanded Goal Details */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 px-5 py-4 space-y-3">
                    {goals.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No goals recorded yet.</p>
                    ) : (
                      goals.map((goal: any, idx: number) => (
                        <div key={goal.id} className="rounded-xl border bg-background p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {idx + 1}. {goal.goal_title}
                              </p>
                              {goal.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {goal.weightage}%
                              </span>
                              {goal.thrust_area && (
                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  {goal.thrust_area.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            <span>UoM: <strong className="text-foreground">{goal.uom_type}</strong></span>
                            {goal.target_value != null && (
                              <span>Target: <strong className="text-foreground">{goal.target_value}</strong></span>
                            )}
                            {goal.target_date && (
                              <span>Deadline: <strong className="text-foreground">{format(new Date(goal.target_date), 'dd MMM yyyy')}</strong></span>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Rework comment if returned */}
                    {sheet.status === 'rework' && sheet.rework_comment && (
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-amber-800">Your Feedback</p>
                          <p className="text-xs text-amber-700 mt-0.5">{sheet.rework_comment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Action Dialog */}
      <Dialog open={!!reviewing} onOpenChange={() => { setReviewing(null); setAction(null); setReworkComment(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {action === 'approved'
                ? <><CheckCircle2 className="w-5 h-5 text-green-600" /> Approve Goal Sheet</>
                : <><XCircle className="w-5 h-5 text-amber-500" /> Return for Rework</>
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {action === 'approved'
                ? <>You are approving the goal sheet for <strong>{reviewing?.employee?.full_name}</strong>. Their goals will be <strong>locked</strong> and they can begin quarterly check-ins.</>
                : <>Return the goal sheet to <strong>{reviewing?.employee?.full_name}</strong> for revision. Please provide specific feedback.</>
              }
            </p>

            {action === 'rework' && (
              <div className="space-y-1.5">
                <Label htmlFor="rework-comment">Your Feedback *</Label>
                <Textarea
                  id="rework-comment"
                  placeholder="e.g. Please add measurable targets for Goal 2. Weightage for Operations goal should be at least 20%..."
                  rows={4}
                  value={reworkComment}
                  onChange={e => setReworkComment(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewing(null); setAction(null); setReworkComment(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={updateStatus.isPending}
              className={action === 'approved'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-amber-500 hover:bg-amber-600'
              }
            >
              {updateStatus.isPending
                ? 'Saving…'
                : action === 'approved'
                ? <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Approval</>
                : <><XCircle className="w-4 h-4 mr-1.5" /> Send for Rework</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalApprovalPage;