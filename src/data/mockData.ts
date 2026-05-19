// Mock Data for AtombergHR

export type Role = 'hr' | 'manager' | 'employee';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  managerId: string | null;
  managerName: string | null;
  avatar: string;
  phone: string;
  address: string;
  emergencyContact: string;
  education: string;
  startDate: string;
  status: 'active' | 'probation' | 'notice';
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  totalHours: number | null;
  status: 'present' | 'absent' | 'partial';
}

export interface EfficiencyRecord {
  id: string;
  employeeId: string;
  date: string;
  efficiency: number;
  expected: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface ProfileEditRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  field: string;
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface TeamExpectation {
  id: string;
  teamId: string;
  teamName: string;
  expectedEfficiency: number;
  period: 'daily' | 'weekly';
}

export interface EmployeeExpectation {
  id: string;
  employeeId: string;
  employeeName: string;
  expectedEfficiency: number;
  period: 'daily' | 'weekly';
}

// Current user (for demo purposes)
export const currentUser: Employee = {
  id: 'emp-001',
  name: 'Alex Johnson',
  email: 'alex.johnson@atomberg.com',
  role: 'Software Engineer',
  department: 'Engineering',
  managerId: 'emp-002',
  managerName: 'Sarah Chen',
  avatar: 'AJ',
  phone: '+1 (555) 123-4567',
  address: '123 Tech Street, San Francisco, CA 94102',
  emergencyContact: 'Jane Johnson - +1 (555) 987-6543',
  education: 'BS Computer Science, Stanford University',
  startDate: '2023-03-15',
  status: 'active',
};

// Employees
export const employees: Employee[] = [
  currentUser,
  {
    id: 'emp-002',
    name: 'Sarah Chen',
    email: 'sarah.chen@atomberg.com',
    role: 'Engineering Manager',
    department: 'Engineering',
    managerId: 'emp-005',
    managerName: 'Michael Park',
    avatar: 'SC',
    phone: '+1 (555) 234-5678',
    address: '456 Manager Ave, San Francisco, CA 94103',
    emergencyContact: 'Tom Chen - +1 (555) 876-5432',
    education: 'MS Computer Science, MIT',
    startDate: '2021-06-01',
    status: 'active',
  },
  {
    id: 'emp-003',
    name: 'James Wilson',
    email: 'james.wilson@atomberg.com',
    role: 'Senior Developer',
    department: 'Engineering',
    managerId: 'emp-002',
    managerName: 'Sarah Chen',
    avatar: 'JW',
    phone: '+1 (555) 345-6789',
    address: '789 Dev Lane, San Francisco, CA 94104',
    emergencyContact: 'Mary Wilson - +1 (555) 765-4321',
    education: 'BS Software Engineering, UC Berkeley',
    startDate: '2022-01-10',
    status: 'active',
  },
  {
    id: 'emp-004',
    name: 'Emily Davis',
    email: 'emily.davis@atomberg.com',
    role: 'Product Designer',
    department: 'Design',
    managerId: 'emp-006',
    managerName: 'Lisa Wong',
    avatar: 'ED',
    phone: '+1 (555) 456-7890',
    address: '321 Design Blvd, San Francisco, CA 94105',
    emergencyContact: 'Robert Davis - +1 (555) 654-3210',
    education: 'BFA Graphic Design, RISD',
    startDate: '2022-08-20',
    status: 'active',
  },
  {
    id: 'emp-005',
    name: 'Michael Park',
    email: 'michael.park@atomberg.com',
    role: 'VP of Engineering',
    department: 'Engineering',
    managerId: null,
    managerName: null,
    avatar: 'MP',
    phone: '+1 (555) 567-8901',
    address: '654 Executive Row, San Francisco, CA 94106',
    emergencyContact: 'Grace Park - +1 (555) 543-2109',
    education: 'PhD Computer Science, Carnegie Mellon',
    startDate: '2020-01-05',
    status: 'active',
  },
  {
    id: 'emp-006',
    name: 'Lisa Wong',
    email: 'lisa.wong@atomberg.com',
    role: 'Design Lead',
    department: 'Design',
    managerId: 'emp-005',
    managerName: 'Michael Park',
    avatar: 'LW',
    phone: '+1 (555) 678-9012',
    address: '987 Creative Way, San Francisco, CA 94107',
    emergencyContact: 'Kevin Wong - +1 (555) 432-1098',
    education: 'MFA Industrial Design, Parsons',
    startDate: '2021-03-15',
    status: 'active',
  },
  {
    id: 'emp-007',
    name: 'David Kim',
    email: 'david.kim@atomberg.com',
    role: 'Junior Developer',
    department: 'Engineering',
    managerId: 'emp-002',
    managerName: 'Sarah Chen',
    avatar: 'DK',
    phone: '+1 (555) 789-0123',
    address: '147 Code Street, San Francisco, CA 94108',
    emergencyContact: 'Susan Kim - +1 (555) 321-0987',
    education: 'BS Computer Science, UCLA',
    startDate: '2024-01-08',
    status: 'probation',
  },
  {
    id: 'emp-008',
    name: 'Rachel Green',
    email: 'rachel.green@atomberg.com',
    role: 'HR Manager',
    department: 'Human Resources',
    managerId: null,
    managerName: null,
    avatar: 'RG',
    phone: '+1 (555) 890-1234',
    address: '258 HR Plaza, San Francisco, CA 94109',
    emergencyContact: 'Ross Green - +1 (555) 210-9876',
    education: 'MBA Human Resources, Cornell',
    startDate: '2020-06-01',
    status: 'active',
  },
];

// Generate attendance records for the last 7 days
const generateAttendanceRecords = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  employees.forEach(emp => {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const random = Math.random();
      let status: 'present' | 'absent' | 'partial';
      let punchIn: string | null = null;
      let punchOut: string | null = null;
      let totalHours: number | null = null;
      
      if (random > 0.9) {
        status = 'absent';
      } else if (random > 0.8) {
        status = 'partial';
        punchIn = '09:15';
        punchOut = '14:30';
        totalHours = 5.25;
      } else {
        status = 'present';
        const inHour = 8 + Math.floor(Math.random() * 2);
        const inMin = Math.floor(Math.random() * 60);
        const outHour = 17 + Math.floor(Math.random() * 2);
        const outMin = Math.floor(Math.random() * 60);
        punchIn = `${inHour.toString().padStart(2, '0')}:${inMin.toString().padStart(2, '0')}`;
        punchOut = `${outHour.toString().padStart(2, '0')}:${outMin.toString().padStart(2, '0')}`;
        totalHours = parseFloat(((outHour + outMin/60) - (inHour + inMin/60)).toFixed(2));
      }
      
      records.push({
        id: `att-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        date: dateStr,
        punchIn,
        punchOut,
        totalHours,
        status,
      });
    }
  });
  
  return records;
};

export const attendanceRecords = generateAttendanceRecords();

// Generate efficiency records
const generateEfficiencyRecords = (): EfficiencyRecord[] => {
  const records: EfficiencyRecord[] = [];
  const today = new Date();
  
  employees.forEach(emp => {
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const baseEfficiency = 70 + Math.random() * 25;
      const expected = 80;
      
      records.push({
        id: `eff-${emp.id}-${dateStr}`,
        employeeId: emp.id,
        date: dateStr,
        efficiency: Math.round(baseEfficiency),
        expected,
      });
    }
  });
  
  return records;
};

export const efficiencyRecords = generateEfficiencyRecords();

// Leave requests
export const leaveRequests: LeaveRequest[] = [
  {
    id: 'leave-001',
    employeeId: 'emp-001',
    employeeName: 'Alex Johnson',
    type: 'annual',
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    status: 'pending',
    reason: 'Family vacation',
  },
  {
    id: 'leave-002',
    employeeId: 'emp-003',
    employeeName: 'James Wilson',
    type: 'sick',
    startDate: '2024-02-10',
    endDate: '2024-02-10',
    status: 'approved',
    reason: 'Not feeling well',
  },
  {
    id: 'leave-003',
    employeeId: 'emp-004',
    employeeName: 'Emily Davis',
    type: 'personal',
    startDate: '2024-02-20',
    endDate: '2024-02-21',
    status: 'pending',
    reason: 'Personal matters',
  },
];

// Profile edit requests
export const profileEditRequests: ProfileEditRequest[] = [
  {
    id: 'edit-001',
    employeeId: 'emp-001',
    employeeName: 'Alex Johnson',
    field: 'Phone',
    oldValue: '+1 (555) 123-4567',
    newValue: '+1 (555) 999-8888',
    status: 'pending',
    requestedAt: '2024-02-08',
  },
  {
    id: 'edit-002',
    employeeId: 'emp-007',
    employeeName: 'David Kim',
    field: 'Address',
    oldValue: '147 Code Street, San Francisco, CA 94108',
    newValue: '200 New Street, San Francisco, CA 94110',
    status: 'pending',
    requestedAt: '2024-02-09',
  },
];

// Team expectations
export const teamExpectations: TeamExpectation[] = [
  {
    id: 'team-exp-001',
    teamId: 'team-eng',
    teamName: 'Engineering',
    expectedEfficiency: 85,
    period: 'weekly',
  },
  {
    id: 'team-exp-002',
    teamId: 'team-design',
    teamName: 'Design',
    expectedEfficiency: 80,
    period: 'weekly',
  },
];

// Employee expectations
export const employeeExpectations: EmployeeExpectation[] = [
  {
    id: 'emp-exp-001',
    employeeId: 'emp-001',
    employeeName: 'Alex Johnson',
    expectedEfficiency: 85,
    period: 'daily',
  },
  {
    id: 'emp-exp-002',
    employeeId: 'emp-003',
    employeeName: 'James Wilson',
    expectedEfficiency: 90,
    period: 'daily',
  },
  {
    id: 'emp-exp-003',
    employeeId: 'emp-007',
    employeeName: 'David Kim',
    expectedEfficiency: 75,
    period: 'daily',
  },
];

// Helper functions
export const getEmployeeById = (id: string): Employee | undefined => {
  return employees.find(emp => emp.id === id);
};

export const getAttendanceForEmployee = (employeeId: string): AttendanceRecord[] => {
  return attendanceRecords.filter(record => record.employeeId === employeeId);
};

export const getEfficiencyForEmployee = (employeeId: string): EfficiencyRecord[] => {
  return efficiencyRecords.filter(record => record.employeeId === employeeId);
};

export const getTeamMembers = (managerId: string): Employee[] => {
  return employees.filter(emp => emp.managerId === managerId);
};

export const getDirectReports = (managerId: string): Employee[] => {
  return employees.filter(emp => emp.managerId === managerId);
};

export const getTodayAttendance = (employeeId: string): AttendanceRecord | undefined => {
  const today = new Date().toISOString().split('T')[0];
  return attendanceRecords.find(record => record.employeeId === employeeId && record.date === today);
};

export const getAverageEfficiency = (employeeId: string): number => {
  const records = getEfficiencyForEmployee(employeeId);
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, record) => acc + record.efficiency, 0);
  return Math.round(sum / records.length);
};
