// Leave type configuration with descriptions and rules

export interface LeaveTypeConfig {
  value: string;
  label: string;
  shortLabel: string;
  totalDays: number;
  description: string;
  carryForward: boolean;
  maxCarryForward?: number;
  genderRestriction?: 'Female' | 'Male';
  requiresSpecialReason?: boolean;
}

export const LEAVE_TYPES: LeaveTypeConfig[] = [
  {
    value: 'Casual Leave',
    label: 'Casual Leave',
    shortLabel: 'CL',
    totalDays: 6,
    description: '6 days per year (non-carry forward)',
    carryForward: false,
  },
  {
    value: 'Sick Leave',
    label: 'Sick Leave',
    shortLabel: 'SL',
    totalDays: 6,
    description: '6 days per year (non-carry forward)',
    carryForward: false,
  },
  {
    value: 'Earned Leave',
    label: 'Earned Leave',
    shortLabel: 'EL',
    totalDays: 18,
    description: '1.5 days per month (carries forward, max 30 total)',
    carryForward: true,
    maxCarryForward: 30,
  },
  {
    value: 'Menstruation Leave',
    label: 'Menstruation Leave',
    shortLabel: 'ML',
    totalDays: 12,
    description: '1 day per month (female employees only)',
    carryForward: false,
    genderRestriction: 'Female',
  },
  {
    value: 'Special Leave',
    label: 'Special Leave',
    shortLabel: 'SpL',
    totalDays: 1,
    description: '1 day per year (birthday or special occasion)',
    carryForward: false,
    requiresSpecialReason: true,
  },
];

export const SPECIAL_LEAVE_REASONS = [
  'Birthday',
  "Parent's Birthday",
  'Spouse Birthday',
  "Child's Birthday",
  'Other',
];

export const getLeaveTypesForGender = (gender: string | null | undefined): LeaveTypeConfig[] => {
  return LEAVE_TYPES.filter(lt => {
    if (!lt.genderRestriction) return true;
    return lt.genderRestriction === gender;
  });
};

export const getTotalLeaveDays = (gender: string | null | undefined): number => {
  return getLeaveTypesForGender(gender).reduce((sum, lt) => sum + lt.totalDays, 0);
};

export const getLeaveSummaryText = (gender: string | null | undefined): string => {
  const types = getLeaveTypesForGender(gender);
  const parts = types.map(lt => `${lt.totalDays} ${lt.shortLabel}`);
  const total = getTotalLeaveDays(gender);
  return `${total} days total (${parts.join(' + ')})`;
};
