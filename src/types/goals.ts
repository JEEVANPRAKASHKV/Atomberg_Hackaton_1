// ============================================================
// src/types/goals.ts — TypeScript types for the Goal module
// ============================================================

export type UoMType = 'min' | 'max' | 'timeline' | 'zero';
export type GoalStatus = 'not_started' | 'on_track' | 'completed';
export type SheetStatus = 'draft' | 'submitted' | 'approved' | 'rework';
export type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type CycleStatus = 'draft' | 'active' | 'closed';
export type SharedGoalStatus = 'pending' | 'accepted' | 'declined';
export type AuditChangeType = 'edit' | 'unlock' | 'status_change' | 'admin_override';

export interface GoalCycle {
  id: string;
  cycle_name: string;
  goal_setting_opens: string;
  q1_opens: string;
  q2_opens: string;
  q3_opens: string;
  q4_opens: string;
  status: CycleStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ThrustArea {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface GoalSheet {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: SheetStatus;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  rework_comment?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  cycle?: GoalCycle;
  goals?: Goal[];
  employee?: {
    id: string;
    full_name: string;
    employee_code?: string;
    department?: string;
    designation?: string;
  };
}

export interface Goal {
  id: string;
  goal_sheet_id: string;
  employee_id: string;
  thrust_area_id?: string;
  goal_title: string;
  description?: string;
  uom_type: UoMType;
  target_value?: number;
  target_date?: string;
  weightage: number;
  is_shared: boolean;
  shared_goal_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  thrust_area?: ThrustArea;
  checkins?: GoalCheckin[];
}

export interface SharedGoal {
  id: string;
  cycle_id: string;
  source_goal_id: string;
  pushed_by: string;
  target_employee_id: string;
  custom_weightage?: number;
  status: SharedGoalStatus;
  created_at: string;
  // Joined fields
  source_goal?: Goal;
  pushed_by_employee?: { full_name: string };
  target_employee?: { full_name: string };
}

export interface GoalCheckin {
  id: string;
  goal_id: string;
  employee_id: string;
  quarter: QuarterType;
  actual_value?: number;
  actual_date?: string;
  progress_status: GoalStatus;
  computed_score?: number;
  submitted_at: string;
  updated_at: string;
}

export interface CheckinComment {
  id: string;
  goal_sheet_id: string;
  manager_id: string;
  quarter: QuarterType;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface GoalAuditEntry {
  id: string;
  goal_id: string;
  changed_by: string;
  change_type: AuditChangeType;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  changed_at: string;
  // Joined
  changed_by_employee?: { full_name: string };
}

// ============================================================
// UoM Score Calculation
// ============================================================

/**
 * Computes a 0–100 progress score for a goal based on its Unit of Measurement type.
 * - min:      Higher actual is better (e.g. Revenue). Score = actual/target * 100
 * - max:      Lower actual is better (e.g. TAT, cost). Score = target/actual * 100
 * - timeline: On-time completion = 100, missed deadline = 0
 * - zero:     Actual must be exactly 0 for 100 score (e.g. Safety incidents)
 */
export function computeGoalScore(goal: Goal, checkin: GoalCheckin): number {
  switch (goal.uom_type) {
    case 'min': {
      // Higher is better
      if (!goal.target_value || checkin.actual_value == null) return 0;
      return Math.min((checkin.actual_value / goal.target_value) * 100, 100);
    }
    case 'max': {
      // Lower is better
      if (!goal.target_value || !checkin.actual_value || checkin.actual_value === 0) return 0;
      return Math.min((goal.target_value / checkin.actual_value) * 100, 100);
    }
    case 'timeline': {
      // On or before deadline = 100, missed = 0
      if (!goal.target_date || !checkin.actual_date) return 0;
      const deadline = new Date(goal.target_date).getTime();
      const completed = new Date(checkin.actual_date).getTime();
      return completed <= deadline ? 100 : 0;
    }
    case 'zero': {
      // Zero actual = success
      if (checkin.actual_value == null) return 0;
      return checkin.actual_value === 0 ? 100 : 0;
    }
    default:
      return 0;
  }
}

/**
 * Returns the active quarter based on a GoalCycle's window dates
 */
export function getActiveQuarter(cycle: GoalCycle): QuarterType | null {
  const now = new Date();
  const q4 = new Date(cycle.q4_opens);
  const q3 = new Date(cycle.q3_opens);
  const q2 = new Date(cycle.q2_opens);
  const q1 = new Date(cycle.q1_opens);

  if (now >= q4) return 'Q4';
  if (now >= q3) return 'Q3';
  if (now >= q2) return 'Q2';
  if (now >= q1) return 'Q1';
  return null;
}

/**
 * Checks if a specific quarter's check-in window is currently open
 */
export function isQuarterOpen(cycle: GoalCycle, quarter: QuarterType): boolean {
  const now = new Date();
  const opens = new Date(cycle[`${quarter.toLowerCase()}_opens` as keyof GoalCycle] as string);
  
  // Quarter is open from its open date until the next quarter opens (or cycle closes)
  const quarters: QuarterType[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const idx = quarters.indexOf(quarter);
  const nextQuarter = quarters[idx + 1];
  
  if (!nextQuarter) {
    // Q4 stays open until cycle is closed
    return now >= opens && cycle.status !== 'closed';
  }
  
  const nextOpens = new Date(cycle[`${nextQuarter.toLowerCase()}_opens` as keyof GoalCycle] as string);
  return now >= opens && now < nextOpens;
}

/**
 * Validates that goal weightages sum to exactly 100
 */
export function validateWeightageTotal(goals: { weightage: number }[]): boolean {
  const total = goals.reduce((sum, g) => sum + (g.weightage || 0), 0);
  return Math.round(total) === 100;
}

/**
 * Computes weighted final score across all goals for a given quarter
 */
export function computeFinalScore(
  goals: Goal[],
  checkins: GoalCheckin[],
  quarter: QuarterType
): number {
  let totalWeighted = 0;
  let totalWeight = 0;

  for (const goal of goals) {
    const checkin = checkins.find(c => c.goal_id === goal.id && c.quarter === quarter);
    if (!checkin) continue;
    const score = computeGoalScore(goal, checkin);
    totalWeighted += score * goal.weightage;
    totalWeight += goal.weightage;
  }

  return totalWeight > 0 ? totalWeighted / totalWeight : 0;
}
