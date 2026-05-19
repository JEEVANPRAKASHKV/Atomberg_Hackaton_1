import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Users, ChevronDown, ChevronUp, Target, TrendingUp,
  CheckCircle2, Clock, AlertCircle, Filter, BarChart2
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTeamGoalSheets, useGoalCycles } from '@/hooks/useGoals';
import { GoalSheetStatusBadge } from '@/components/goals/GoalStatusBadges';
import { GoalWeightageBar } from '@/components/goals/GoalWeightageBar';
import { UoMScoreDisplay } from '@/components/goals/UoMScoreDisplay';
import { computeFinalScore } from '@/types/goals';
import type { GoalSheet, QuarterType } from '@/types/goals';

// ── Score Ring Component ─────────────────────────────────────
const ScoreRing = ({ score, size = 56 }: { score: number; size?: number }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size < 56 ? 10 : 12} fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {Math.round(score)}%
      </text>
    </svg>
  );
};

// ── Stat Summary Card ────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub, color
}: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color: string
}) => (
  <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

// ── Main Page ────────────────────────────────────────────────
const TeamGoalsPage = () => {
  const [filterCycle, setFilterCycle]   = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch]             = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [viewQuarter, setViewQuarter]   = useState<QuarterType>('Q1');

  const { data: cycles = [] }    = useGoalCycles();
  const activeCycle              = cycles.find(c => c.status === 'active');

  const { data: allSheets = [], isLoading } = useTeamGoalSheets(
    filterCycle !== 'all' ? filterCycle : activeCycle?.id
  );

  // Set default cycle to active
  useEffect(() => {
    if (activeCycle && filterCycle === 'all') setFilterCycle(activeCycle.id);
  }, [activeCycle]);

  // Filters
  const sheets = allSheets.filter(s => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchSearch = !search || s.employee?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Stats
  const stats = {
    total:     allSheets.length,
    approved:  allSheets.filter(s => s.status === 'approved').length,
    submitted: allSheets.filter(s => s.status === 'submitted').length,
    rework:    allSheets.filter(s => s.status === 'rework').length,
    draft:     allSheets.filter(s => s.status === 'draft').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Team Goals
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your team's goal sheets, progress and check-in scores.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users}       label="Total Members"   value={stats.total}     color="bg-blue-100 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Approved"        value={stats.approved}  color="bg-green-100 text-green-600" />
        <StatCard icon={Clock}       label="Awaiting Review" value={stats.submitted} color="bg-amber-100 text-amber-600" />
        <StatCard icon={AlertCircle} label="Needs Rework"    value={stats.rework}    color="bg-red-100 text-red-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-52"
        />

        <Select value={filterCycle} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.cycle_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rework">Rework</SelectItem>
          </SelectContent>
        </Select>

        {/* Quarter selector for score view */}
        <div className="flex gap-1 rounded-lg border p-1 bg-muted/30 ml-auto">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterType[]).map(q => (
            <button
              key={q}
              onClick={() => setViewQuarter(q)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewQuarter === q
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Sheet List */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading team data…</div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-3 text-center">
          <Users className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-lg">No Goal Sheets Found</p>
          <p className="text-sm text-muted-foreground">
            {search ? `No results for "${search}"` : 'Your team members haven\'t created goal sheets yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sheets.map(sheet => {
            const isExpanded  = expandedId === sheet.id;
            const goals       = (sheet as any).goals ?? [];
            const checkins    = goals.flatMap((g: any) => g.checkins ?? []);
            const qCheckins   = checkins.filter((c: any) => c.quarter === viewQuarter);
            const score       = goals.length > 0
              ? computeFinalScore(goals, qCheckins, viewQuarter)
              : null;

            return (
              <div key={sheet.id} className="rounded-2xl border bg-card overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {sheet.employee?.full_name?.charAt(0) ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{sheet.employee?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">
                      {[sheet.employee?.designation, sheet.employee?.department]
                        .filter(Boolean).join(' · ')}
                      {' '}&nbsp;·&nbsp; {goals.length} goals
                    </p>
                  </div>

                  {/* Score Ring */}
                  {score !== null && goals.length > 0 && (
                    <div className="flex flex-col items-center gap-0.5">
                      <ScoreRing score={score} />
                      <p className="text-[10px] text-muted-foreground">{viewQuarter} Score</p>
                    </div>
                  )}

                  {/* Status */}
                  <GoalSheetStatusBadge status={sheet.status} />

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : sheet.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {/* Weightage Bar (always shown) */}
                {goals.length > 0 && (
                  <div className="px-5 pb-3">
                    <GoalWeightageBar goals={goals} />
                  </div>
                )}

                {/* Expanded: Per-Goal Detail */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 divide-y">
                    {goals.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground italic">No goals set yet.</p>
                    ) : goals.map((goal: any, idx: number) => {
                      const checkin = goal.checkins?.find((c: any) => c.quarter === viewQuarter);

                      return (
                        <div key={goal.id} className="px-5 py-4 grid md:grid-cols-3 gap-4 items-start">
                          {/* Goal Info */}
                          <div className="md:col-span-2 space-y-1">
                            <p className="font-medium text-sm">
                              <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                              {goal.goal_title}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="bg-muted px-2 py-0.5 rounded-full">{goal.weightage}%</span>
                              {goal.thrust_area && (
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {goal.thrust_area.name}
                                </span>
                              )}
                              <span className="bg-muted px-2 py-0.5 rounded-full">
                                UoM: {goal.uom_type}
                              </span>
                              {goal.target_value != null && (
                                <span>Target: <strong>{goal.target_value}</strong></span>
                              )}
                              {goal.target_date && (
                                <span>By: <strong>{format(new Date(goal.target_date), 'dd MMM yy')}</strong></span>
                              )}
                            </div>

                            {/* Check-in data */}
                            {checkin ? (
                              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                <span className={`px-2 py-0.5 rounded-full border font-medium ${
                                  checkin.progress_status === 'completed'  ? 'bg-green-100 text-green-700 border-green-200'
                                  : checkin.progress_status === 'on_track' ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
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
                                    Completed: <strong className="text-foreground">
                                      {format(new Date(checkin.actual_date), 'dd MMM yy')}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                No {viewQuarter} check-in submitted yet.
                              </p>
                            )}
                          </div>

                          {/* Score Display */}
                          <div>
                            <UoMScoreDisplay goal={goal} checkin={checkin} showLabel={true} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Overall Quarter Score Footer */}
                    {goals.length > 0 && score !== null && (
                      <div className="px-5 py-3 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <BarChart2 className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {viewQuarter} Weighted Score for {sheet.employee?.full_name}
                          </span>
                        </div>
                        <span className={`text-lg font-bold ${
                          score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {Math.round(score)}%
                        </span>
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

export default TeamGoalsPage;