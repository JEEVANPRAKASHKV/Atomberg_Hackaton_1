import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEmployeeGender = (employeeId: string | undefined) => {
  const [gender, setGender] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const fetchGender = async () => {
      try {
        const { data, error } = await supabase
          .from('hr_employee_details')
          .select('gender')
          .eq('employee_id', employeeId)
          .maybeSingle();

        if (!error && data) {
          setGender(data.gender);
        }
      } catch (err) {
        console.error('Error fetching gender:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGender();
  }, [employeeId]);

  return { gender, loading };
};
