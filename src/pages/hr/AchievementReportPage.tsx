import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  BarChart2, Download, FileSpreadsheet, Filter,
  TrendingUp, Users, Target, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useGoalCycles, useAllGoalSheets } from '@/hooks/useGoals';
import { GoalSheetStatusBadge } from '@/components/goals/GoalStatusBadges';
import { computeFinalScore, computeGoalScore } from '@/types/goals';
import type { QuarterType } from '@/types/goals';

const QUARTERS: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];

// ── Stat Card ────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, color, sub
}: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string
}) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  </div>
);

// ── Score Cell ───────────────────────────────────────────────
const ScoreCell = ({ score }: { score: number | null }) => {
  if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
  const cls = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  return <span className={`font-bold ${cls}`}>{Math.round(score)}%</span>;
};

// ── Main Page ────────────────────────────────────────────────
const AchievementReportPage = () => {
  const [filterCycle,  setFilterCycle]  = useState<string>('');
  const [filterDept,   setFilterDept]   = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search,       setSearch]       = useState('');

  const { data: cycles = [] } = useGoalCycles();
  const activeCycle           = cycles.find(c => c.status === 'active');

  // Default to active cycle
  const selectedCycle = filterCycle || activeCycle?.id || '';

  const { data: allSheets = [], isLoading } = useAllGoalSheets(selectedCycle);

  // Extract unique departments
  const departments = useMemo(() => {
    const depts = new Set(allSheets.map(s => s.employee?.department).filter(Boolean) as string[]);
    return Array.from(depts).sort();
  }, [allSheets]);

  // Apply filters
  const filtered = useMemo(() => allSheets.filter(s => {
    const matchDept   = filterDept   === 'all' || s.employee?.department === filterDept;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchSearch = !search || s.employee?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  }), [allSheets, filterDept, filterStatus, search]);

  // Stats
  const stats = useMemo(() => {
    const approved = filtered.filter(s => s.status === 'approved');
    const avgScores = QUARTERS.map(q => {
      const scores = approved.map(s => {
        const goals   = (s as any).goals ?? [];
        const qChk    = goals.flatMap((g: any) => g.checkins?.filter((c: any) => c.quarter === q) ?? []);
        return computeFinalScore(goals, qChk, q);
      }).filter(s => s !== null) as number[];
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    });

    return {
      total:    filtered.length,
      approved: approved.length,
      avgQ1:    avgScores[0],
      avgQ2:    avgScores[1],
      avgQ3:    avgScores[2],
      avgQ4:    avgScores[3],
    };
  }, [filtered]);

  // ── Build flat row data for table & export ────────────────
  const rows = useMemo(() => filtered.flatMap(sheet => {
    const goals    = (sheet as any).goals ?? [];
    const cycle    = cycles.find(c => c.id === sheet.cycle_id);
    const emp      = sheet.employee;

    if (goals.length === 0) {
      return [{
        employeeName:  emp?.full_name ?? '—',
        employeeCode:  emp?.employee_code ?? '—',
        department:    emp?.department ?? '—',
        designation:   emp?.designation ?? '—',
        cycle:         cycle?.cycle_name ?? '—',
        sheetStatus:   sheet.status,
        goalTitle:     '(no goals)',
        thrustArea:    '—',
        uomType:       '—',
        target:        '—',
        weightage:     '—',
        Q1: null, Q2: null, Q3: null, Q4: null,
        overallScore:  null,
      }];
    }

    return goals.map((goal: any) => {
      const scores: Record<string, number | null> = {};
      QUARTERS.forEach(q => {
        const checkin = goal.checkins?.find((c: any) => c.quarter === q);
        scores[q] = checkin ? computeGoalScore(goal, checkin) : null;
      });

      // Weighted contribution across quarters
      const qScores = QUARTERS.map(q => scores[q]).filter(s => s !== null) as number[];
      const overall = qScores.length
        ? qScores.reduce((a, b) => a + b, 0) / qScores.length
        : null;

      return {
        employeeName:  emp?.full_name ?? '—',
        employeeCode:  emp?.employee_code ?? '—',
        department:    emp?.department ?? '—',
        designation:   emp?.designation ?? '—',
        cycle:         cycle?.cycle_name ?? '—',
        sheetStatus:   sheet.status,
        goalTitle:     goal.goal_title,
        thrustArea:    goal.thrust_area?.name ?? '—',
        uomType:       goal.uom_type,
        target:        goal.target_value ?? goal.target_date ?? '—',
        weightage:     goal.weightage,
        Q1: scores['Q1'], Q2: scores['Q2'], Q3: scores['Q3'], Q4: scores['Q4'],
        overallScore:  overall,
      };
    });
  }), [filtered, cycles]);

  // ── Excel Export ──────────────────────────────────────────
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Full Detail
    const detailData = [
      [
        'Employee Name', 'Employee Code', 'Department', 'Designation',
        'Cycle', 'Sheet Status', 'Goal Title', 'Thrust Area',
        'UoM Type', 'Target', 'Weightage (%)',
        'Q1 Score (%)', 'Q2 Score (%)', 'Q3 Score (%)', 'Q4 Score (%)',
        'Overall Goal Score (%)'
      ],
      ...rows.map(r => [
        r.employeeName, r.employeeCode, r.department, r.designation,
        r.cycle, r.sheetStatus, r.goalTitle, r.thrustArea,
        r.uomType, r.target, r.weightage,
        r.Q1 !== null ? Math.round(r.Q1) : '',
        r.Q2 !== null ? Math.round(r.Q2) : '',
        r.Q3 !== null ? Math.round(r.Q3) : '',
        r.Q4 !== null ? Math.round(r.Q4) : '',
        r.overallScore !== null ? Math.round(r.overallScore) : '',
      ])
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(detailData);
    ws1['!cols'] = [
      { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 20 },
      { wch: 14 }, { wch: 12 }, { wch: 35 }, { wch: 22 },
      { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Goal Details');

    // Sheet 2: Employee Summary (one row per employee)
    const empSummary = new Map<string, {
      name: string; code: string; dept: string; cycle: string; status: string;
      goals: number; q1: number[]; q2: number[]; q3: number[]; q4: number[];
    }>();
    filtered.forEach(sheet => {
      const goals  = (sheet as any).goals ?? [];
      const emp    = sheet.employee;
      const cycle  = cycles.find(c => c.id === sheet.cycle_id);
      const key    = sheet.id;

      const entry = {
        name:   emp?.full_name ?? '—',
        code:   emp?.employee_code ?? '—',
        dept:   emp?.department ?? '—',
        cycle:  cycle?.cycle_name ?? '—',
        status: sheet.status,
        goals:  goals.length,
        q1: [] as number[], q2: [] as number[], q3: [] as number[], q4: [] as number[],
      };

      goals.forEach((goal: any) => {
        QUARTERS.forEach((q, qi) => {
          const checkin = goal.checkins?.find((c: any) => c.quarter === q);
          if (checkin) {
            const score = computeGoalScore(goal, checkin);
            if (score !== null) {
              const arr = [entry.q1, entry.q2, entry.q3, entry.q4][qi];
              arr.push(score * (goal.weightage / 100));
            }
          }
        });
      });

      empSummary.set(key, entry);
    });

    const summaryData = [
      ['Employee', 'Code', 'Department', 'Cycle', 'Sheet Status', '# Goals',
       'Q1 Score', 'Q2 Score', 'Q3 Score', 'Q4 Score', 'Full Year Score'],
      ...Array.from(empSummary.values()).map(e => {
        const sumQ = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) : null;
        const q1 = sumQ(e.q1), q2 = sumQ(e.q2), q3 = sumQ(e.q3), q4 = sumQ(e.q4);
        const qs = [q1, q2, q3, q4].filter(s => s !== null) as number[];
        const fy = qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : null;
        return [
          e.name, e.code, e.dept, e.cycle, e.status, e.goals,
          q1 !== null ? Math.round(q1) : '',
          q2 !== null ? Math.round(q2) : '',
          q3 !== null ? Math.round(q3) : '',
          q4 !== null ? Math.round(q4) : '',
          fy !== null ? Math.round(fy) : '',
        ];
      })
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2['!cols'] = [
      { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
      { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Employee Summary');

    const cycle = cycles.find(c => c.id === selectedCycle);
    const fname = `AtombergHR_Achievement_Report_${cycle?.cycle_name ?? 'Export'}_${format(new Date(), 'dd-MMM-yyyy')}.xlsx`;
    XLSX.writeFile(wb, fname);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" /> Achievement Report
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full achievement data across all goals, quarters and employees. Export as Excel.
          </p>
        </div>
        <Button onClick={handleExport} disabled={rows.length === 0} className="gap-2">
          <Download className="w-4 h-4" /> Export to Excel
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={Users}       label="Employees"    value={stats.total}    color="bg-blue-100 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Approved Sheets" value={stats.approved} color="bg-green-100 text-green-600" />
        <StatCard icon={BarChart2}   label="Avg Q1 Score" value={stats.avgQ1 !== null ? `${Math.round(stats.avgQ1)}%` : '—'} color="bg-purple-100 text-purple-600" />
        <StatCard icon={BarChart2}   label="Avg Q2 Score" value={stats.avgQ2 !== null ? `${Math.round(stats.avgQ2)}%` : '—'} color="bg-indigo-100 text-indigo-600" />
        <StatCard icon={BarChart2}   label="Avg Q3 Score" value={stats.avgQ3 !== null ? `${Math.round(stats.avgQ3)}%` : '—'} color="bg-sky-100 text-sky-600" />
        <StatCard icon={TrendingUp}  label="Avg Q4 Score" value={stats.avgQ4 !== null ? `${Math.round(stats.avgQ4)}%` : '—'} color="bg-teal-100 text-teal-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl border bg-muted/20">
        <Filter className="w-4 h-4 text-muted-foreground" />

        <Select value={selectedCycle} onValueChange={setFilterCycle}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select cycle…" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.cycle_name}
                {c.status === 'active' && ' (Active)'}
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

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sheet Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="rework">Rework</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48"
        />

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} employees · {rows.length} goal rows
        </span>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading achievement data…</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-3 text-center">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-lg">No Data Available</p>
          <p className="text-sm text-muted-foreground">
            {selectedCycle ? 'No goal sheets found for the selected filters.' : 'Please select a goal cycle.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Employee</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Dept</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Goal</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Thrust Area</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Wt%</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Q1</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Q2</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Q3</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Q4</th>
                <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.department}</td>
                  <td className="px-4 py-3">
                    <GoalSheetStatusBadge status={row.sheetStatus as any} />
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate font-medium">{row.goalTitle}</p>
                    <p className="text-xs text-muted-foreground">{row.uomType}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.thrustArea}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{row.weightage}</td>
                  <td className="px-4 py-3 text-center"><ScoreCell score={row.Q1} /></td>
                  <td className="px-4 py-3 text-center"><ScoreCell score={row.Q2} /></td>
                  <td className="px-4 py-3 text-center"><ScoreCell score={row.Q3} /></td>
                  <td className="px-4 py-3 text-center"><ScoreCell score={row.Q4} /></td>
                  <td className="px-4 py-3 text-center"><ScoreCell score={row.overallScore} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AchievementReportPage;