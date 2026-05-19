import { supabase } from '@/integrations/supabase/client';

interface EmployeeWithDetails {
  id: string;
  full_name: string;
  employee_code: string | null;
  joining_date: string | null;
  status: string;
  hr_employee_details: { date_of_birth: string | null }[] | null;
}

export const checkBirthdaysAndAnniversaries = async (currentEmployeeId?: string) => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const currentYear = today.getFullYear();
    
    console.log(`Checking birthdays and anniversaries for ${todayMonth}-${todayDay}`);
    
    // Fetch all active employees with details
    const { data: employees, error } = await supabase
      .from('hr_employees')
      .select(`
        id,
        full_name,
        employee_code,
        joining_date,
        status,
        hr_employee_details(date_of_birth)
      `)
      .eq('status', 'Active');
    
    if (error) {
      console.error('Error fetching employees:', error);
      return { birthdays: 0, anniversaries: 0 };
    }
    
    console.log(`Found ${employees?.length || 0} active employees`);
    
    let birthdaysCreated = 0;
    let anniversariesCreated = 0;
    
    // Check birthdays
    for (const emp of (employees as EmployeeWithDetails[]) || []) {
      const dobArray = emp.hr_employee_details;
      const dob = Array.isArray(dobArray) && dobArray.length > 0 ? dobArray[0]?.date_of_birth : null;
      
      if (dob) {
        const dobDate = new Date(dob);
        const dobMonth = dobDate.getMonth() + 1;
        const dobDay = dobDate.getDate();
        
        if (dobMonth === todayMonth && dobDay === todayDay) {
          console.log(`🎂 Birthday found: ${emp.full_name}`);
          const created = await createBirthdayAnnouncement(emp, currentEmployeeId);
          if (created) birthdaysCreated++;
        }
      }
    }
    
    // Check work anniversaries
    for (const emp of (employees as EmployeeWithDetails[]) || []) {
      const joiningDate = emp.joining_date;
      
      if (joiningDate) {
        const joinDate = new Date(joiningDate);
        const joinMonth = joinDate.getMonth() + 1;
        const joinDay = joinDate.getDate();
        const joinYear = joinDate.getFullYear();
        
        if (joinMonth === todayMonth && joinDay === todayDay && joinYear < currentYear) {
          const yearsCompleted = currentYear - joinYear;
          console.log(`🎊 Anniversary found: ${emp.full_name} - ${yearsCompleted} years`);
          const created = await createAnniversaryAnnouncement(emp, yearsCompleted, currentEmployeeId);
          if (created) anniversariesCreated++;
        }
      }
    }
    
    console.log('Birthday and anniversary check completed');
    return { birthdays: birthdaysCreated, anniversaries: anniversariesCreated };
    
  } catch (error) {
    console.error('Error in birthday/anniversary check:', error);
    return { birthdays: 0, anniversaries: 0 };
  }
};

const createBirthdayAnnouncement = async (employee: EmployeeWithDetails, createdById?: string): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const title = `🎂 Happy Birthday ${employee.full_name}!`;
    
    // Check if announcement already created today
    const { data: existing } = await supabase
      .from('hr_announcements')
      .select('id')
      .eq('title', title)
      .gte('created_at', `${today}T00:00:00`)
      .maybeSingle();
    
    if (existing) {
      console.log('Birthday announcement already exists');
      return false;
    }
    
    const message = `Wishing you a very Happy Birthday! 🎂🎉

May this year bring you good health, success, and many new opportunities, both personally and professionally.

Thank you for being a valued part of Atomberg. We hope you have a wonderful day and a fantastic year ahead!`;
    
    // Get system admin or use provided ID
    let creatorId = createdById;
    if (!creatorId) {
      const { data: admin } = await supabase
        .from('hr_employees')
        .select('id')
        .eq('role', 'Admin')
        .limit(1)
        .single();
      creatorId = admin?.id;
    }
    
    if (!creatorId) {
      console.error('No admin found to create announcement');
      return false;
    }
    
    const { error } = await supabase
      .from('hr_announcements')
      .insert({
        title,
        content: message,
        target_type: 'All',
        is_important: false,
        created_by: creatorId
      });
    
    if (error) {
      console.error('Error creating birthday announcement:', error);
      return false;
    }
    
    console.log(`✅ Birthday announcement created for ${employee.full_name}`);
    return true;
    
  } catch (error) {
    console.error('Error in createBirthdayAnnouncement:', error);
    return false;
  }
};

const createAnniversaryAnnouncement = async (employee: EmployeeWithDetails, yearsCompleted: number, createdById?: string): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const title = `🎊 Work Anniversary - ${employee.full_name}!`;
    
    // Check if announcement already created today
    const { data: existing } = await supabase
      .from('hr_announcements')
      .select('id')
      .eq('title', title)
      .gte('created_at', `${today}T00:00:00`)
      .maybeSingle();
    
    if (existing) {
      console.log('Anniversary announcement already exists');
      return false;
    }
    
    const message = `Congratulations on completing ${yearsCompleted} ${yearsCompleted === 1 ? 'year' : 'years'} with Atomberg! 🎊

Your dedication, contributions, and commitment have played an important role in our journey. We truly appreciate the effort and passion you bring to the team every day.

Thank you for being a part of Atomberg's growth – we look forward to many more milestones together!`;
    
    // Get system admin or use provided ID
    let creatorId = createdById;
    if (!creatorId) {
      const { data: admin } = await supabase
        .from('hr_employees')
        .select('id')
        .eq('role', 'Admin')
        .limit(1)
        .single();
      creatorId = admin?.id;
    }
    
    if (!creatorId) {
      console.error('No admin found to create announcement');
      return false;
    }
    
    const { error } = await supabase
      .from('hr_announcements')
      .insert({
        title,
        content: message,
        target_type: 'All',
        is_important: true,
        created_by: creatorId
      });
    
    if (error) {
      console.error('Error creating anniversary announcement:', error);
      return false;
    }
    
    console.log(`✅ Anniversary announcement created for ${employee.full_name} (${yearsCompleted} years)`);
    return true;
    
  } catch (error) {
    console.error('Error in createAnniversaryAnnouncement:', error);
    return false;
  }
};
