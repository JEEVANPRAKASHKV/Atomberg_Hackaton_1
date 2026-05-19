import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FileSearch, Filter, Calendar, User, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useGoalCycles, useAllGoalSheets } from '@/hooks/useGoals';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { GoalAuditEntry } from '@/types/goals';

// Fetch all audit entries for a cycle's goals
function useAllAuditEntries(cycleId?: string) {
  return useQuery({
    queryKey: ['goalAuditAll', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      // Get all goal IDs for this cycle
      const { data: sheets } = await supabase
        .from('hr_goal_sheets')
        .select('id')
        .eq('cycle_id', cycleId);
      if (!sheets?.length) return [];
      const sheetIds = sheets.map(s => s.id);
      const { data: goals } = await supabase
        .from('hr_goals')
        .select('id, goal_title, employee_id')
        .in('goal_sheet_id', sheetIds);
      if (!goals?.length) return [];
      const goalIds = goals.map(g => g.id);
      const { data: entries, error } = await supabase
        .from('hr_goal_audit_log')
        .select(`
          *,
          changed_by_employee:hr_employees!changed_by(full_name, department)
        `)
        .in('goal_id', goalIds)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      // Attach goal title
      return (entries ?? []).map(e => ({
        ...e,
        goal_title: goals.find(g => g.id === e.goal_id)?.goal_title ?? '—',
      }));
    },
    enabled: !!cycleId,
  });
}

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  unlock:   { label: 'Unlock',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  edit:     { label: 'Edit',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  submit:   { label: 'Submit',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  approve:  { label: 'Approve',  color: 'bg-green-100 text-green-700 border-green-200' },
  rework:   { label: 'Rework',   color: 'bg-red-100 text-red-700 border-red-200' },
  create:   { label: 'Create',   color: 'bg-teal-100 text-teal-700 border-teal-200' },
  delete:   { label: 'Delete',   color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const ChangeTypeBadge = ({ type }: { type: string }) => {
  const cfg = CHANGE_TYPE_CONFIG[type] ?? { label: type, color: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const GoalAuditLogPage = () => {
  const [filterCycle,  setFilterCycle]  = useState<string>('');
  const [filterType,   setFilterType]   = useState<string>('all');
  const [search,       setSearch]       = useState('');

  const { data: cycles = [] } = useGoalCycles();
  const activeCycle           = cycles.find(c => c.status === 'active');
  const selectedCycleId       = filterCycle || activeCycle?.id || '';

  const { data: entries = [], isLoading } = useAllAuditEntries(selectedCycleId);

  const filtered = useMemo(() => entries.filter((e: any) => {
    const matchType   = filterType === 'all' || e.change_type === filterType;
    const matchSearch = !search ||
      e.goal_title?.toLowerCase().includes(search.toLowerCase()) ||
      e.changed_by_employee?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  }), [entries, filterType, search]);

  const changeTypes = useMemo(() =>
    Array.from(new Set((entries as any[]).map(e => e.change_type))),
    [entries]
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-primary" /> Goal Audit Log
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full field-level change history for all goals — every edit, unlock, approval and rework recorded.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-xl border bg-muted/20">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />

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

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Change type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {changeTypes.map(t => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search goal or person…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-52"
        />

        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} entr{filtered.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading audit log…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border rounded-2xl bg-muted/20 gap-3 text-center">
          <FileSearch className="w-12 h-12 text-muted-foreground" />
          <p className="font-semibold text-lg">No Audit Entries Found</p>
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? 'No post-approval changes have been made for this cycle.'
              : 'No results match your filters.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Timestamp</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Changed By</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Goal</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Action</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Field</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">Before</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">After</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                  {/* Timestamp */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-medium">
                      {format(new Date(entry.changed_at), 'dd MMM yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.changed_at), 'h:mm a')}
                    </p>
                  </td>

                  {/* Changed By */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {entry.changed_by_employee?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-xs">{entry.changed_by_employee?.full_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{entry.changed_by_employee?.department ?? '—'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Goal */}
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="truncate text-xs font-medium">{entry.goal_title}</p>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    <ChangeTypeBadge type={entry.change_type} />
                  </td>

                  {/* Field Changed */}
                  <td className="px-4 py-3">
                    {entry.field_changed ? (
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {entry.field_changed}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Old Value */}
                  <td className="px-4 py-3 max-w-[140px]">
                    {entry.old_value ? (
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded line-through max-w-[130px] block truncate">
                        {entry.old_value}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* New Value */}
                  <td className="px-4 py-3 max-w-[140px]">
                    {entry.new_value ? (
                      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded max-w-[130px] block truncate">
                        {entry.new_value}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GoalAuditLogPage;