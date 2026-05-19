import { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import {
  PieChart as PieIcon, BarChart2, TrendingUp, Users,
  Target, CheckCircle2, Clock, AlertCircle, Activity
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useGoalCycles, useAllGoalSheets } from '@/hooks/useGoals';
import { computeFinalScore } from '@/types/goals';
import type { QuarterType } from '@/types/goals';

const QUARTERS: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const COLORS = {
  green:  '#22c55e',
  amber:  '#f59e0b',
  red:    '#ef4444',
  blue:   '#3b82f6',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  teal:   '#14b8a6',
  gray:   '#9ca3af',
};

const STATUS_COLORS: Record<string, string> = {
  approved:  COLORS.green,
  submitted: COLORS.amber,
  rework:    COLORS.red,
  draft:     COLORS.gray,
};

// ── Stat Card ────────────────────────────────────────────────
const KPICard = ({
  icon: Icon, label, value, sub, iconColor, trend
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; iconColor: string; trend?: { value: number; positive: boolean }
}) => (
  <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-primary mt-1">{sub}</p>}
    </div>
  </div>
);

// ── Custom Tooltip ────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-background shadow-lg px-4 py-3 text-sm space-y-1">
      {label && <p className="font-semibold text-muted-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{typeof p.value === 'number' ? `${Math.round(p.value)}%` : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Section Title ─────────────────────────────────────────────
const SectionTitle = ({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div>
      <h2 className="font-semibold text-base">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────
const CheckInDashboardPage = () => {
  const [filterCycle, setFilterCycle] = useState<string>('');
  const [filterQuarter, setFilterQuarter] = useState<QuarterType>('Q1');

  const { data: cycles = [] } = useGoalCycles();
  const activeCycle = cycles.find(c => c.status === 'active');
  const selectedCycleId = filterCycle || activeCycle?.id || '';

  const { data: allSheets = [], isLoading } = useAllGoalSheets(selectedCycleId);

  // ── Derived Data ─────────────────────────────────────────
  const derived = useMemo(() => {
    const approved = allSheets.filter(s => s.status === 'approved');

    // 1. Sheet status distribution (pie)
    const statusDist = Object.entries(
      allSheets.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    // 2. Check-in completion per quarter (bar)
    const completionByQuarter = QUARTERS.map(q => {
      const totalGoals = approved.reduce((sum, s) => sum + ((s as any).goals?.length ?? 0), 0);
      const checkedIn  = approved.reduce((sum, s) => {
        const goals = (s as any).goals ?? [];
        return sum + goals.filter((g: any) => g.checkins?.some((c: any) => c.quarter === q)).length;
      }, 0);
      return {
        quarter: q,
        completion: totalGoals > 0 ? Math.round((checkedIn / totalGoals) * 100) : 0,
        total: totalGoals,
        done: checkedIn,
      };
    });

    // 3. Average score per quarter (line)
    const avgScoreByQuarter = QUARTERS.map(q => {
      const scores = approved.map(s => {
        const goals   = (s as any).goals ?? [];
        const qChecks = goals.flatMap((g: any) => g.checkins?.filter((c: any) => c.quarter === q) ?? []);
        return computeFinalScore(goals, qChecks, q);
      }).filter(Boolean) as number[];
      return {
        quarter: q,
        avgScore: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0,
        count: scores.length,
      };
    });

    // 4. Score distribution for selected quarter (0-20, 20-40 ... 80-100)
    const buckets = ['0-20', '20-40', '40-60', '60-80', '80-100'];
    const scoreDistribution = buckets.map(b => ({ range: b, count: 0 }));
    approved.forEach(s => {
      const goals   = (s as any).goals ?? [];
      const qChecks = goals.flatMap((g: any) => g.checkins?.filter((c: any) => c.quarter === filterQuarter) ?? []);
      const score   = computeFinalScore(goals, qChecks, filterQuarter);
      if (score === null) return;
      const idx = Math.min(Math.floor(score / 20), 4);
      scoreDistribution[idx].count++;
    });

    // 5. Department-level average score radar (selected quarter)
    const deptMap = new Map<string, number[]>();
    approved.forEach(s => {
      const dept    = s.employee?.department ?? 'Unknown';
      const goals   = (s as any).goals ?? [];
      const qChecks = goals.flatMap((g: any) => g.checkins?.filter((c: any) => c.quarter === filterQuarter) ?? []);
      const score   = computeFinalScore(goals, qChecks, filterQuarter);
      if (score === null) return;
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(score);
    });
    const deptRadar = Array.from(deptMap.entries()).map(([dept, scores]) => ({
      dept,
      avgScore: +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    }));

    // 6. Top performers (selected quarter)
    const topPerformers = approved
      .map(s => {
        const goals   = (s as any).goals ?? [];
        const qChecks = goals.flatMap((g: any) => g.checkins?.filter((c: any) => c.quarter === filterQuarter) ?? []);
        const score   = computeFinalScore(goals, qChecks, filterQuarter);
        return {
          name:  s.employee?.full_name ?? '—',
          dept:  s.employee?.department ?? '—',
          score: score ?? 0,
          hasCheckin: qChecks.length > 0,
        };
      })
      .filter(p => p.hasCheckin)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // 7. Thrust area distribution (selected quarter goals)
    const thrustMap = new Map<string, number[]>();
    approved.forEach(s => {
      const goals = (s as any).goals ?? [];
      goals.forEach((g: any) => {
        const ta = g.thrust_area?.name ?? 'Unassigned';
        if (!thrustMap.has(ta)) thrustMap.set(ta, []);
        const checkin = g.checkins?.find((c: any) => c.quarter === filterQuarter);
        if (checkin?.computed_score != null) thrustMap.get(ta)!.push(checkin.computed_score);
      });
    });
    const thrustPerf = Array.from(thrustMap.entries())
      .map(([area, scores]) => ({
        area: area.length > 18 ? area.slice(0, 16) + '…' : area,
        avgScore: scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    // KPIs
    const totalEmployees     = allSheets.length;
    const approvedCount      = approved.length;
    const submittedCount     = allSheets.filter(s => s.status === 'submitted').length;
    const selectedQCompletion = completionByQuarter.find(c => c.quarter === filterQuarter);
    const selectedQAvgScore   = avgScoreByQuarter.find(q => q.quarter === filterQuarter);

    return {
      statusDist, completionByQuarter, avgScoreByQuarter,
      scoreDistribution, deptRadar, topPerformers, thrustPerf,
      totalEmployees, approvedCount, submittedCount,
      selectedQCompletion, selectedQAvgScore,
    };
  }, [allSheets, filterQuarter]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Check-In Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time view of check-in completion rates, score distribution, and team performance.
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedCycleId} onValueChange={setFilterCycle}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Select cycle" />
            </SelectTrigger>
            <SelectContent>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.cycle_name}{c.status === 'active' ? ' (Active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
            {QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => setFilterQuarter(q)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filterQuarter === q
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">Loading dashboard…</div>
      ) : allSheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border rounded-2xl bg-muted/20 gap-3 text-center">
          <BarChart2 className="w-14 h-14 text-muted-foreground" />
          <p className="font-semibold text-lg">No Data Available</p>
          <p className="text-sm text-muted-foreground">Select a goal cycle to view check-in analytics.</p>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              icon={Users} label="Total Employees" iconColor="bg-blue-100 text-blue-600"
              value={derived.totalEmployees}
              sub={`${derived.approvedCount} with approved sheets`}
            />
            <KPICard
              icon={CheckCircle2} label={`${filterQuarter} Completion`} iconColor="bg-green-100 text-green-600"
              value={`${derived.selectedQCompletion?.completion ?? 0}%`}
              sub={`${derived.selectedQCompletion?.done ?? 0} / ${derived.selectedQCompletion?.total ?? 0} goals`}
            />
            <KPICard
              icon={TrendingUp} label={`${filterQuarter} Avg Score`} iconColor="bg-purple-100 text-purple-600"
              value={derived.selectedQAvgScore?.avgScore ? `${derived.selectedQAvgScore.avgScore}%` : '—'}
              sub={`${derived.selectedQAvgScore?.count ?? 0} employees scored`}
            />
            <KPICard
              icon={Clock} label="Awaiting Review" iconColor="bg-amber-100 text-amber-600"
              value={derived.submittedCount}
              sub="Goal sheets pending approval"
            />
          </div>

          {/* ── Row 1: Sheet Status Pie + Completion Bar ── */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sheet Status Pie */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle icon={PieIcon} title="Goal Sheet Status" sub="Distribution across all employees" />
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={derived.statusDist}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {derived.statusDist.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.name] ?? COLORS.gray} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 shrink-0">
                  {derived.statusDist.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.name] ?? COLORS.gray }} />
                      <span className="capitalize text-muted-foreground">{s.name}</span>
                      <span className="font-bold ml-auto">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Check-in Completion by Quarter */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle icon={BarChart2} title="Check-In Completion" sub="% of goals with check-ins per quarter" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={derived.completionByQuarter} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="completion" name="Completion" radius={[6, 6, 0, 0]}>
                    {derived.completionByQuarter.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.quarter === filterQuarter ? COLORS.blue : COLORS.indigo + '80'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Row 2: Avg Score Line + Score Distribution Bar ── */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Average Score Trend (Line) */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle icon={TrendingUp} title="Avg Score Trend" sub="Team average weighted score across quarters" />
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={derived.avgScoreByQuarter}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone" dataKey="avgScore" name="Avg Score"
                    stroke={COLORS.purple} strokeWidth={2.5}
                    dot={{ fill: COLORS.purple, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution Histogram */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle
                icon={BarChart2}
                title={`${filterQuarter} Score Distribution`}
                sub="Number of employees per score band"
              />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={derived.scoreDistribution} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip content={({ active, payload, label }) => (
                    active && payload?.length
                      ? <div className="rounded-xl border bg-background shadow-lg px-4 py-3 text-sm">
                          <p className="font-semibold">{label}%</p>
                          <p className="text-muted-foreground">{payload[0].value} employees</p>
                        </div>
                      : null
                  )} />
                  <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]}>
                    {derived.scoreDistribution.map((entry, index) => {
                      const rangeStart = index * 20;
                      const col = rangeStart >= 80 ? COLORS.green : rangeStart >= 40 ? COLORS.amber : COLORS.red;
                      return <Cell key={index} fill={col} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Row 3: Radar + Thrust Area + Top Performers ── */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Department Radar */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle
                icon={Activity}
                title="Dept Performance"
                sub={`${filterQuarter} avg score by department`}
              />
              {derived.deptRadar.length < 3 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center">
                  Needs 3+ departments with check-ins
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <RadarChart data={derived.deptRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dept" tick={{ fontSize: 10 }} />
                    <Radar
                      name="Avg Score" dataKey="avgScore"
                      stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.25}
                    />
                    <Tooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Thrust Area Performance */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle
                icon={Target}
                title="Thrust Area Scores"
                sub={`${filterQuarter} avg score per category`}
              />
              {derived.thrustPerf.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  No check-in data yet
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {derived.thrustPerf.slice(0, 6).map((t, i) => {
                    const scoreColor = t.avgScore >= 80 ? 'bg-green-500' : t.avgScore >= 50 ? 'bg-amber-400' : 'bg-red-400';
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{t.area}</span>
                          <span className="font-bold ml-2">{Math.round(t.avgScore)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${scoreColor}`}
                            style={{ width: `${Math.min(t.avgScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Performers */}
            <div className="rounded-2xl border bg-card p-5">
              <SectionTitle
                icon={TrendingUp}
                title="Top Performers"
                sub={`${filterQuarter} — highest weighted scores`}
              />
              {derived.topPerformers.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  No scored check-ins yet
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {derived.topPerformers.map((p, i) => {
                    const scoreColor = p.score >= 80 ? 'text-green-600' : p.score >= 50 ? 'text-amber-500' : 'text-red-500';
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-lg">{medals[i] ?? `#${i + 1}`}</span>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.dept}</p>
                        </div>
                        <span className={`text-sm font-bold ${scoreColor}`}>
                          {Math.round(p.score)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CheckInDashboardPage;