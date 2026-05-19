import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  ClipboardList, MessageSquarePlus, CheckCircle2, ChevronDown,
  ChevronUp, Send, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import {
  useTeamGoalSheets, useGoalCycles,
  useAddCheckinComment, useCheckinComments
} from '@/hooks/useGoals';
import { UoMScoreDisplay } from '@/components/goals/UoMScoreDisplay';
import { QuarterSelector } from '@/components/goals/QuarterSelector';
import { computeFinalScore, getActiveQuarter } from '@/types/goals';
import type { GoalSheet, QuarterType } from '@/types/goals';

// ── Score Badge ──────────────────────────────────────────────
const ScoreBadge = ({ score }: { score: number }) => {
  const cls = score >= 80
    ? 'bg-green-100 text-green-700 border-green-200'
    : score >= 50
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-600 border-red-200';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${cls}`}>
      {Math.round(score)}%
    </span>
  );
};

// ── Comment Thread ───────────────────────────────────────────
const CommentThread = ({
  sheetId, quarter, managerId
}: {
  sheetId: string; quarter: QuarterType; managerId: string;
}) => {
  const { data: comments = [] } = useCheckinComments(sheetId, quarter);
  const addComment = useAddCheckinComment();
  const { toast }  = useToast();
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await addComment.mutateAsync({
        goal_sheet_id: sheetId,
        manager_id:    managerId,
        quarter,
        comment:       text.trim(),
      });
      setText('');
      toast({ title: '✅ Comment added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing Comments */}
      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No comments yet for {quarter}.</p>
      ) : (
        <div className="space-y-2">
          {comments.map(c => (
            <div key={c.id} className="rounded-lg bg-muted/50 border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">
                {format(new Date(c.created_at), 'dd MMM yyyy, h:mm a')}
              </p>
              <p className="text-sm">{c.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment */}
      <div className="flex gap-2">
        <Textarea
          placeholder={`Add your ${quarter} feedback…`}
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          className="flex-1 text-sm"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={addComment.isPending || !text.trim()}
          className="self-end gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {addComment.isPending ? '…' : 'Send'}
        </Button>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────
const ManagerCheckInPage = () => {
  const { toast }  = useToast();
  const { user }   = useAuth();

  const [managerId, setManagerId]   = useState<string | null>(null);
  const [quarter, setQuarter]       = useState<QuarterType>('Q1');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    supabase.from('hr_employees').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setManagerId(data.id); });
  }, [user]);

  const { data: cycles = [] }    = useGoalCycles();
  const activeCycle              = cycles.find(c => c.status === 'active');
  const { data: allSheets = [], isLoading } = useTeamGoalSheets(activeCycle?.id);

  // Set default quarter
  useEffect(() => {
    if (!activeCycle) return;
    const active = getActiveQuarter(activeCycle);
    if (active) setQuarter(active);
  }, [activeCycle]);

  // Only show approved/locked sheets (check-ins only possible after approval)
  const sheets = allSheets.filter(s => {
    const isApproved = s.status === 'approved';
    if (filterStatus !== 'all') return isApproved; // filter handled below
    return isApproved;
  });

  // Count submitted check-ins for this quarter
  const getQCheckinCount = (sheet: GoalSheet) => {
    const goals = (sheet as any).goals ?? [];
    return goals.filter((g: any) =>
      g.checkins?.some((c: any) => c.quarter === quarter)
    ).length;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Team Check-In Review
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCycle?.cycle_name ?? 'No active cycle'} · Review your team's quarterly check-ins and add feedback.
          </p>
        </div>
      </div>

      {/* No active cycle */}
      {!activeCycle && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700">No active goal cycle. Ask HR to activate one.</p>
        </div>
      )}

      {/* Quarter Selector */}
      {activeCycle && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quarter</Label>
          <QuarterSelector cycle={activeCycle} value={quarter} onChange={setQuarter} />
        </div>
      )}

      {/* Sheet List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading team check-ins…</div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-3 text-center">
          <ClipboardList className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-lg">No Approved Goal Sheets Yet</p>
          <p className="text-sm text-muted-foreground">
            Team members need their goal sheets approved before they can submit check-ins.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sheets.map(sheet => {
            const isExpanded = expandedId === sheet.id;
            const goals      = (sheet as any).goals ?? [];
            const checkinCount = getQCheckinCount(sheet);
            const qCheckins  = goals.flatMap((g: any) =>
              g.checkins?.filter((c: any) => c.quarter === quarter) ?? []
            );
            const score = goals.length > 0
              ? computeFinalScore(goals, qCheckins, quarter)
              : null;

            return (
              <div key={sheet.id} className="rounded-2xl border bg-card overflow-hidden">
                {/* Row Header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {sheet.employee?.full_name?.charAt(0) ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{sheet.employee?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[sheet.employee?.designation, sheet.employee?.department]
                        .filter(Boolean).join(' · ')}
                      {' '}&nbsp;·&nbsp;
                      <span className={checkinCount === goals.length ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                        {checkinCount}/{goals.length} goals checked in
                      </span>
                    </p>
                  </div>

                  {/* Quarter Score */}
                  {score !== null && qCheckins.length > 0 && (
                    <div className="flex flex-col items-end gap-0.5">
                      <ScoreBadge score={score} />
                      <p className="text-[10px] text-muted-foreground">{quarter} score</p>
                    </div>
                  )}

                  {/* Checkin status pill */}
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    checkinCount === 0
                      ? 'bg-gray-100 text-gray-500 border-gray-200'
                      : checkinCount < goals.length
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-green-100 text-green-700 border-green-200'
                  }`}>
                    {checkinCount === 0
                      ? 'Not started'
                      : checkinCount < goals.length
                      ? 'Partial'
                      : 'Complete'}
                  </span>

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sheet.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 divide-y">
                    {/* Per-goal check-ins */}
                    {goals.map((goal: any, idx: number) => {
                      const checkin = goal.checkins?.find((c: any) => c.quarter === quarter);
                      return (
                        <div key={goal.id} className="px-5 py-4 grid md:grid-cols-3 gap-4 items-start">
                          {/* Goal Info */}
                          <div className="md:col-span-2 space-y-1.5">
                            <p className="font-medium text-sm">
                              <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                              {goal.goal_title}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="bg-muted px-2 py-0.5 rounded-full">{goal.weightage}%</span>
                              <span className="bg-muted px-2 py-0.5 rounded-full">{goal.uom_type}</span>
                              {goal.target_value != null && <span>Target: <strong>{goal.target_value}</strong></span>}
                              {goal.target_date && <span>By: <strong>{format(new Date(goal.target_date), 'dd MMM yy')}</strong></span>}
                            </div>

                            {/* Check-in Data */}
                            {checkin ? (
                              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                                <span className={`px-2 py-0.5 rounded-full border font-medium ${
                                  checkin.progress_status === 'completed' ? 'bg-green-100 text-green-700 border-green-200'
                                  : checkin.progress_status === 'on_track' ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}>
                                  {checkin.progress_status.replace('_', ' ')}
                                </span>
                                {checkin.actual_value != null && (
                                  <span className="text-muted-foreground">
                                    Actual: <strong className="text-foreground">{checkin.actual_value}</strong>
                                  </span>
                                )}
                                {checkin.actual_date && (
                                  <span className="text-muted-foreground">
                                    On: <strong className="text-foreground">
                                      {format(new Date(checkin.actual_date), 'dd MMM yy')}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic mt-1">
                                No {quarter} check-in submitted yet.
                              </p>
                            )}
                          </div>

                          {/* Score */}
                          <div>
                            <UoMScoreDisplay goal={goal} checkin={checkin} showLabel />
                          </div>
                        </div>
                      );
                    })}

                    {/* Overall Score Row */}
                    {score !== null && qCheckins.length > 0 && (
                      <div className="px-5 py-3 bg-muted/20 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          {quarter} Weighted Score
                        </span>
                        <ScoreBadge score={score} />
                      </div>
                    )}

                    {/* Comment Thread */}
                    {managerId && (
                      <div className="px-5 py-4 space-y-3">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquarePlus className="w-4 h-4 text-primary" />
                          Manager Feedback — {quarter}
                        </p>
                        <CommentThread
                          sheetId={sheet.id}
                          quarter={quarter}
                          managerId={managerId}
                        />
                      </div>
                    )}
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

export default ManagerCheckInPage;