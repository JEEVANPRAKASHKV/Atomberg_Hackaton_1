import { supabase } from '@/integrations/supabase/client';

/**
 * Generate email from full name: firstname.lastname@atomberg.com
 * Handles duplicates by adding numbers (firstname.lastname2@atomberg.com)
 */
export const generateEmailFromName = async (fullName: string): Promise<string> => {
  // Clean and format name
  const nameParts = fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/gi, '') // Remove non-alphabetic characters
    .split(/\s+/)
    .filter(part => part.length > 0);
  
  if (nameParts.length === 0) {
    throw new Error('Invalid name for email generation');
  }
  
  // Create base email
  const baseEmail = nameParts.join('.');
  let email = `${baseEmail}@atomberg.com`;
  
  // Check if email exists
  const { data: existing } = await supabase
    .from('hr_employees')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  
  if (!existing) {
    return email; // Email available
  }
  
  // Email exists, try with numbers
  let counter = 2;
  while (counter < 100) {
    email = `${baseEmail}${counter}@atomberg.com`;
    
    const { data: duplicate } = await supabase
      .from('hr_employees')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (!duplicate) {
      return email;
    }
    
    counter++;
  }
  
  throw new Error('Could not generate unique email');
};

/**
 * Generate employee code with LNI prefix: LNI001, LNI002, etc.
 */
export const generateEmployeeCode = async (orgId?: string): Promise<string> => {
  // Get highest existing employee code with LNI prefix
  let query = supabase
    .from('hr_employees')
    .select('employee_code')
    .like('employee_code', 'LNI%')
    .order('employee_code', { ascending: false })
    .limit(100);
  
  if (orgId) {
    query = query.eq('org_id', orgId);
  }
  
  const { data: employees } = await query;
  
  if (!employees || employees.length === 0) {
    return 'LNI001'; // First employee
  }
  
  // Find the highest number
  let maxNum = 0;
  for (const emp of employees) {
    const code = emp.employee_code;
    if (code && code.startsWith('LNI')) {
      const match = code.match(/LNI(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  
  // Increment and format with leading zeros (3 digits)
  const newNumber = maxNum + 1;
  return `LNI${String(newNumber).padStart(3, '0')}`;
};

/**
 * Convert DD-MM-YYYY to YYYY-MM-DD for database storage
 */
export const parseDDMMYYYY = (dateString: string): string | null => {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  const trimmed = dateString.trim();
  
  // Check if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Parse DD-MM-YYYY or DD/MM/YYYY
  const match = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (!match) {
    throw new Error('Date must be in DD-MM-YYYY format');
  }
  
  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Validate
  if (dayNum < 1 || dayNum > 31) {
    throw new Error('Invalid day');
  }
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month');
  }
  if (yearNum < 1900 || yearNum > 2100) {
    throw new Error('Invalid year');
  }
  
  // Return YYYY-MM-DD for database
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Convert YYYY-MM-DD to DD-MM-YYYY for display
 */
export const formatDDMMYYYY = (dateString: string | null): string => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format time ago for notifications
 */
export const formatTimeAgo = (dateString: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
