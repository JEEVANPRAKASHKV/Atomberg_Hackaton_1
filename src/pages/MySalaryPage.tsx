import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, lastDayOfMonth, addMonths } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, IndianRupee, Calendar, TrendingUp, FileText } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface SalaryHistory {
  id: string;
  month: number;
  year: number;
  gross_salary: number;
  deductions: number | null;
  net_salary: number;
  payment_status: string | null;
  payment_date: string | null;
}

interface SalarySlip {
  id: string;
  month: number;
  year: number;
  file_url: string | null;
  file_name: string | null;
  uploaded_at: string | null;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const paymentStatusColors: Record<string, string> = {
  'Paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

const MySalaryPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    if (employee?.id) fetchData();
  }, [employee?.id]);

  const fetchData = async () => {
    if (!employee?.id) return;

    setLoading(true);
    try {
      const [historyRes, slipsRes] = await Promise.all([
        supabase
          .from('hr_salary_history')
          .select('*')
          .eq('employee_id', employee.id)
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
        supabase
          .from('hr_salary_slips')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('status', 'published')
          .order('year', { ascending: false })
          .order('month', { ascending: false }),
      ]);

      if (historyRes.error) throw historyRes.error;
      if (slipsRes.error) throw slipsRes.error;

      setSalaryHistory(historyRes.data || []);
      setSalarySlips(slipsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching salary data:', error);
      toast({ title: 'Error', description: 'Failed to load salary data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (slip: SalarySlip) => {
    try {
      const path = `${employee?.id}/${slip.year}/${slip.month}.pdf`;
      const { data, error } = await supabase.storage.from('salary-slips').download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Payslip_${monthNames[slip.month - 1]}_${slip.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast({ title: 'Error', description: 'Failed to download payslip', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getNextSalaryDate = () => {
    const today = new Date();
    const currentDay = today.getDate();
    let targetMonth = currentDay > 25 ? today : addMonths(today, -1);
    targetMonth = addMonths(targetMonth, 1);
    return lastDayOfMonth(targetMonth);
  };

  const lastSalary = salaryHistory[0];
  const currentYear = new Date().getFullYear();
  const ytdEarnings = salaryHistory
    .filter(s => s.year === currentYear)
    .reduce((sum, s) => sum + s.net_salary, 0);

  const years = [...new Set(salaryHistory.map(s => s.year))].sort((a, b) => b - a);

  const filteredHistory = yearFilter === 'all' ? salaryHistory : salaryHistory.filter(s => s.year.toString() === yearFilter);
  const filteredSlips = yearFilter === 'all' ? salarySlips : salarySlips.filter(s => s.year.toString() === yearFilter);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Salary</h1>
        <p className="text-muted-foreground">View your salary history and download payslips</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Salary</p>
                {lastSalary ? (
                  <>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(lastSalary.net_salary)}</p>
                    <p className="text-xs text-muted-foreground">{monthNames[lastSalary.month - 1]} {lastSalary.year}</p>
                    <Badge className={paymentStatusColors[lastSalary.payment_status || 'Pending']} style={{ marginTop: '4px' }}>
                      {lastSalary.payment_status || 'Pending'}
                    </Badge>
                  </>
                ) : (
                  <p className="text-lg text-muted-foreground">No records yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Salary Date</p>
                <p className="text-2xl font-bold text-foreground">{format(getNextSalaryDate(), 'd MMM')}</p>
                <p className="text-xs text-muted-foreground">{format(getNextSalaryDate(), 'yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">YTD Earnings ({currentYear})</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(ytdEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year Filter */}
      {years.length > 0 && (
        <div className="flex justify-end">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Salary History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Salary History</CardTitle>
          <CardDescription>Your past salary records</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <IndianRupee className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No salary records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{monthNames[h.month - 1]} {h.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(h.gross_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(h.deductions || 0)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(h.net_salary)}</TableCell>
                      <TableCell>
                        <Badge className={paymentStatusColors[h.payment_status || 'Pending']}>
                          {h.payment_status || 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslips */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>Download your payslip PDFs</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSlips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No payslips available yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Uploaded On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlips.map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">{monthNames[slip.month - 1]} {slip.year}</TableCell>
                      <TableCell>{slip.file_name || `Payslip_${slip.month}_${slip.year}.pdf`}</TableCell>
                      <TableCell>{slip.uploaded_at ? format(new Date(slip.uploaded_at), 'MMM d, yyyy') : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(slip)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MySalaryPage;
