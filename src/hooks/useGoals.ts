import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  GoalCycle,
  GoalSheet,
  Goal,
  ThrustArea,
  GoalCheckin,
  CheckinComment,
  GoalAuditEntry,
  SharedGoal,
  SheetStatus,
  QuarterType,
  GoalStatus,
  UoMType,
} from '@/types/goals';

// ============================================================
// Query Keys
// ============================================================
export const goalKeys = {
  all: ['goals'] as const,
  cycles: () => [...goalKeys.all, 'cycles'] as const,
  activeCycle: () => [...goalKeys.cycles(), 'active'] as const,
  thrustAreas: () => [...goalKeys.all, 'thrustAreas'] as const,
  sheets: () => [...goalKeys.all, 'sheets'] as const,
  sheet: (employeeId: string, cycleId: string) => [...goalKeys.sheets(), employeeId, cycleId] as const,
  teamSheets: (cycleId?: string) => [...goalKeys.sheets(), 'team', cycleId] as const,
  goals: (sheetId: string) => [...goalKeys.all, 'goals', sheetId] as const,
  checkins: (goalId: string) => [...goalKeys.all, 'checkins', goalId] as const,
  sheetCheckins: (sheetId: string) => [...goalKeys.all, 'sheetCheckins', sheetId] as const,
  comments: (sheetId: string, quarter: QuarterType) => [...goalKeys.all, 'comments', sheetId, quarter] as const,
  auditLog: (goalId: string) => [...goalKeys.all, 'audit', goalId] as const,
  sharedGoals: (employeeId: string) => [...goalKeys.all, 'shared', employeeId] as const,
};

// ============================================================
// Goal Cycles
// ============================================================

export function useGoalCycles() {
  return useQuery({
    queryKey: goalKeys.cycles(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goal_cycles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GoalCycle[];
    },
  });
}

export function useActiveGoalCycle() {
  return useQuery({
    queryKey: goalKeys.activeCycle(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goal_cycles')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data as GoalCycle | null;
    },
  });
}

export function useCreateGoalCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<GoalCycle, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('hr_goal_cycles')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as GoalCycle;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.cycles() }),
  });
}

export function useUpdateGoalCycleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GoalCycle['status'] }) => {
      // Ensure only one active cycle at a time
      if (status === 'active') {
        await supabase.from('hr_goal_cycles').update({ status: 'closed' }).eq('status', 'active');
      }
      const { data, error } = await supabase
        .from('hr_goal_cycles')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GoalCycle;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.cycles() }),
  });
}

// ============================================================
// Thrust Areas
// ============================================================

export function useThrustAreas(activeOnly = true) {
  return useQuery({
    queryKey: goalKeys.thrustAreas(),
    queryFn: async () => {
      let query = supabase.from('hr_thrust_areas').select('*').order('name');
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      return data as ThrustArea[];
    },
  });
}

export function useCreateThrustArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('hr_thrust_areas')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as ThrustArea;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.thrustAreas() }),
  });
}

export function useToggleThrustArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('hr_thrust_areas')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.thrustAreas() }),
  });
}

// ============================================================
// Goal Sheets
// ============================================================

export function useGoalSheet(employeeId: string, cycleId: string) {
  return useQuery({
    queryKey: goalKeys.sheet(employeeId, cycleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goal_sheets')
        .select(`
          *,
          cycle:hr_goal_cycles(*),
          goals:hr_goals(*, thrust_area:hr_thrust_areas(*), checkins:hr_goal_checkins(*))
        `)
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycleId)
        .maybeSingle();
      if (error) throw error;
      return data as GoalSheet | null;
    },
    enabled: !!employeeId && !!cycleId,
  });
}

export function useMyGoalSheets(employeeId: string) {
  return useQuery({
    queryKey: [...goalKeys.sheets(), 'mine', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goal_sheets')
        .select(`*, cycle:hr_goal_cycles(*), goals:hr_goals(*)`)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GoalSheet[];
    },
    enabled: !!employeeId,
  });
}

export function useTeamGoalSheets(cycleId?: string) {
  return useQuery({
    queryKey: goalKeys.teamSheets(cycleId),
    queryFn: async () => {
      let query = supabase
        .from('hr_goal_sheets')
        .select(`
          *,
          employee:hr_employees(id, full_name, employee_code, department, designation),
          cycle:hr_goal_cycles(*),
          goals:hr_goals(*, thrust_area:hr_thrust_areas(*))
        `)
        .order('created_at', { ascending: false });
      if (cycleId) query = query.eq('cycle_id', cycleId);
      const { data, error } = await query;
      if (error) throw error;
      return data as GoalSheet[];
    },
  });
}

export function useCreateGoalSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { employee_id: string; cycle_id: string }) => {
      const { data, error } = await supabase
        .from('hr_goal_sheets')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as GoalSheet;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.sheets() }),
  });
}

export function useUpdateGoalSheetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      rework_comment,
      approved_by,
    }: {
      id: string;
      status: SheetStatus;
      rework_comment?: string;
      approved_by?: string;
    }) => {
      const payload: Record<string, unknown> = { status };
      if (status === 'submitted') payload.submitted_at = new Date().toISOString();
      if (status === 'approved') {
        payload.approved_by = approved_by;
        payload.approved_at = new Date().toISOString();
        payload.is_locked = true;
      }
      if (status === 'rework') payload.rework_comment = rework_comment;

      const { data, error } = await supabase
        .from('hr_goal_sheets')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GoalSheet;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.sheets() }),
  });
}

// ============================================================
// Goals (individual)
// ============================================================

export function useGoals(sheetId: string) {
  return useQuery({
    queryKey: goalKeys.goals(sheetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goals')
        .select(`*, thrust_area:hr_thrust_areas(*), checkins:hr_goal_checkins(*)`)
        .eq('goal_sheet_id', sheetId)
        .order('created_at');
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!sheetId,
  });
}

export function useUpsertGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Omit<Goal, 'id' | 'created_at' | 'updated_at'> & { id?: string }
    ) => {
      const { data, error } = await supabase
        .from('hr_goals')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.goals(variables.goal_sheet_id) });
      queryClient.invalidateQueries({ queryKey: goalKeys.sheets() });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, sheetId }: { goalId: string; sheetId: string }) => {
      const { error } = await supabase.from('hr_goals').delete().eq('id', goalId);
      if (error) throw error;
      return sheetId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.goals(variables.sheetId) });
    },
  });
}

// ============================================================
// Goal Check-ins
// ============================================================

export function useGoalCheckins(goalId: string) {
  return useQuery({
    queryKey: goalKeys.checkins(goalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goal_checkins')
        .select('*')
        .eq('goal_id', goalId)
        .order('quarter');
      if (error) throw error;
      return data as GoalCheckin[];
    },
    enabled: !!goalId,
  });
}

export function useUpsertCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: {
        goal_id: string;
        employee_id: string;
        quarter: QuarterType;
        actual_value?: number;
        actual_date?: string;
        progress_status: GoalStatus;
        computed_score: number;
      }
    ) => {
      const { data, error } = await supabase
        .from('hr_goal_checkins')
        .upsert(payload, { onConflict: 'goal_id,quarter' })
        .select()
        .single();
      if (error) throw error;
      return data as GoalCheckin;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.checkins(variables.goal_id) });
    },
  });
}

// ============================================================
// Manager Check-in Comments
// ============================================================

export function useCheckinComments(sheetId: string, quarter: QuarterType) {
  return useQuery({
    queryKey: goalKeys.comments(sheetId, quarter),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_checkin_comments')
        .select('*')
        .eq('goal_sheet_id', sheetId)
        .eq('quarter', quarter)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CheckinComment[];
    },
    enabled: !!sheetId && !!quarter,
  });
}

export function useAddCheckinComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      goal_sheet_id: string;
      manager_id: string;
      quarter: QuarterType;
      comment: string;
    }) => {
      const { data, error } = await supabase
        .from('hr_checkin_comments')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as CheckinComment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalKeys.comments(variables.goal_sheet_id, variables.quarter),
      });
    },
  });
}

export function useUpsertCheckinComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      goal_sheet_id: string;
      manager_id: string;
      quarter: QuarterType;
      comment: string;
      id?: string;
    }) => {
      const { data, error } = await supabase
        .from('hr_checkin_comments')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as CheckinComment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: goalKeys.comments(variables.goal_sheet_id, variables.quarter),
      });
    },
  });
}

// ============================================================
// Goal Audit Log
// ============================================================

export function useGoalAuditLog(goalId: string) {
  return useQuery({
    queryKey: goalKeys.auditLog(goalId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_goal_audit_log')
        .select('*')
        .eq('goal_id', goalId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data as GoalAuditEntry[];
    },
    enabled: !!goalId,
  });
}

export function useInsertAuditLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      goal_id: string;
      changed_by: string;
      change_type: GoalAuditEntry['change_type'];
      field_changed?: string;
      old_value?: string;
      new_value?: string;
    }) => {
      const { error } = await supabase.from('hr_goal_audit_log').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.auditLog(variables.goal_id) });
    },
  });
}

// ============================================================
// Shared Goals
// ============================================================

export function useSharedGoals(employeeId: string) {
  return useQuery({
    queryKey: goalKeys.sharedGoals(employeeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_shared_goals')
        .select(`
          *,
          source_goal:hr_goals(*, thrust_area:hr_thrust_areas(*)),
          pushed_by_employee:hr_employees!pushed_by(full_name)
        `)
        .eq('target_employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SharedGoal[];
    },
    enabled: !!employeeId,
  });
}

export function usePushSharedGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      cycle_id: string;
      source_goal_id: string;
      pushed_by: string;
      target_employee_id: string;
      custom_weightage?: number;
    }) => {
      const { data, error } = await supabase
        .from('hr_shared_goals')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SharedGoal;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalKeys.all }),
  });
}

export function useUpdateSharedGoalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      employeeId,
    }: {
      id: string;
      status: SharedGoal['status'];
      employeeId: string;
    }) => {
      const { error } = await supabase
        .from('hr_shared_goals')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return employeeId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.sharedGoals(variables.employeeId) });
    },
  });
}

// ============================================================
// All Goal Sheets (Admin/HR — Achievement Report)
// ============================================================

export function useAllGoalSheets(cycleId?: string) {
  return useQuery({
    queryKey: [...goalKeys.sheets(), 'all', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('hr_goal_sheets')
        .select(`
          *,
          employee:hr_employees(id, full_name, employee_code, department, designation),
          cycle:hr_goal_cycles(*),
          goals:hr_goals(
            *,
            thrust_area:hr_thrust_areas(*),
            checkins:hr_goal_checkins(*)
          )
        `)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GoalSheet[];
    },
    enabled: !!cycleId,
  });
}
