import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileUp, Plus, Search, History, Edit, DollarSign, Users } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
  status: string;
}

interface SalaryHistory {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  gross_salary: number;
  deductions: number | null;
  net_salary: number;
  payment_status: string | null;
  payment_date: string | null;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const statusColors: Record<string, string> = {
  'Active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Resigned': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Terminated': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Abscond': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const paymentStatusColors: Record<string, string> = {
  'Paid': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

const SalaryOverviewPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<Record<string, SalaryHistory[]>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [addSalaryModalOpen, setAddSalaryModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<SalaryHistory[]>([]);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [uploadForm, setUploadForm] = useState({ employeeId: '', month: '', year: new Date().getFullYear().toString(), grossSalary: '', deductions: '', netSalary: '', file: null as File | null });
  const [salaryForm, setSalaryForm] = useState({ employeeId: '', month: '', year: new Date().getFullYear().toString(), grossSalary: '', deductions: '', paymentStatus: 'Pending', paymentDate: '' });
  const [statusForm, setStatusForm] = useState({ newStatus: '', reason: '' });
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all employees
      const { data: employeesData, error: empError } = await supabase
        .from('hr_employees')
        .select('id, full_name, employee_code, status')
        .order('full_name');

      if (empError) throw empError;

      // Fetch salary history
      const { data: historyData, error: historyError } = await supabase
        .from('hr_salary_history')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (historyError) throw historyError;

      setEmployees(employeesData || []);

      // Group salary history by employee
      const historyMap: Record<string, SalaryHistory[]> = {};
      (historyData || []).forEach((h: SalaryHistory) => {
        if (!historyMap[h.employee_id]) historyMap[h.employee_id] = [];
        historyMap[h.employee_id].push(h);
      });
      setSalaryHistory(historyMap);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleUpload = async () => {
    if (!uploadForm.employeeId || !uploadForm.month || !uploadForm.year || !uploadForm.file) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const storagePath = `${uploadForm.employeeId}/${uploadForm.year}/${uploadForm.month}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('salary-slips')
        .upload(storagePath, uploadForm.file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('salary-slips').getPublicUrl(storagePath);

      await supabase.from('hr_salary_slips').upsert({
        employee_id: uploadForm.employeeId,
        month: parseInt(uploadForm.month),
        year: parseInt(uploadForm.year),
        file_url: urlData.publicUrl,
        file_name: uploadForm.file.name,
        uploaded_by: employee?.id,
        status: 'published',
        gross_salary: uploadForm.grossSalary ? parseFloat(uploadForm.grossSalary) : null,
        net_salary: uploadForm.netSalary ? parseFloat(uploadForm.netSalary) : null,
      });

      if (uploadForm.grossSalary && uploadForm.deductions) {
        await supabase.from('hr_salary_history').upsert({
          employee_id: uploadForm.employeeId,
          month: parseInt(uploadForm.month),
          year: parseInt(uploadForm.year),
          gross_salary: parseFloat(uploadForm.grossSalary),
          deductions: parseFloat(uploadForm.deductions),
          net_salary: parseFloat(uploadForm.grossSalary) - parseFloat(uploadForm.deductions),
          payment_status: 'Paid',
          created_by: employee?.id,
        });
      }

      toast({ title: 'Payslip uploaded successfully!' });
      setUploadModalOpen(false);
      setUploadForm({ employeeId: '', month: '', year: new Date().getFullYear().toString(), grossSalary: '', deductions: '', netSalary: '', file: null });
      fetchData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast({ title: 'Error', description: 'Please select a ZIP file', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const zip = await JSZip.loadAsync(bulkFile);
      const files = Object.entries(zip.files).filter(([name]) => name.endsWith('.pdf'));

      for (const [filename, file] of files) {
        try {
          // Parse filename: EMP001_12_2024.pdf
          const parts = filename.replace('.pdf', '').split('/').pop()?.split('_') || [];
          if (parts.length < 3) {
            console.warn(`Invalid filename format: ${filename}`);
            errorCount++;
            continue;
          }

          const employeeCode = parts[0];
          const month = parseInt(parts[1]);
          const year = parseInt(parts[2]);

          if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
            console.warn(`Invalid month/year in filename: ${filename}`);
            errorCount++;
            continue;
          }

          // Get employee_id from code
          const { data: emp } = await supabase
            .from('hr_employees')
            .select('id')
            .eq('employee_code', employeeCode)
            .single();

          if (!emp) {
            console.warn(`Employee ${employeeCode} not found`);
            errorCount++;
            continue;
          }

          const pdfBlob = await file.async('blob');
          const storagePath = `${emp.id}/${year}/${month}.pdf`;

          await supabase.storage.from('salary-slips').upload(storagePath, pdfBlob, { upsert: true });

          const { data: urlData } = supabase.storage.from('salary-slips').getPublicUrl(storagePath);

          await supabase.from('hr_salary_slips').upsert({
            employee_id: emp.id,
            month,
            year,
            file_url: urlData.publicUrl,
            file_name: filename.split('/').pop(),
            uploaded_by: employee?.id,
            status: 'published',
          });

          successCount++;
        } catch (err) {
          console.error(`Error processing ${filename}:`, err);
          errorCount++;
        }
      }

      toast({ title: `Bulk upload complete! ${successCount} uploaded, ${errorCount} errors` });
      setBulkUploadModalOpen(false);
      setBulkFile(null);
      fetchData();
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddSalary = async () => {
    if (!salaryForm.employeeId || !salaryForm.month || !salaryForm.year || !salaryForm.grossSalary || !salaryForm.deductions) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const gross = parseFloat(salaryForm.grossSalary);
      const deductions = parseFloat(salaryForm.deductions);

      await supabase.from('hr_salary_history').upsert({
        employee_id: salaryForm.employeeId,
        month: parseInt(salaryForm.month),
        year: parseInt(salaryForm.year),
        gross_salary: gross,
        deductions: deductions,
        net_salary: gross - deductions,
        payment_status: salaryForm.paymentStatus,
        payment_date: salaryForm.paymentDate || null,
        created_by: employee?.id,
      });

      toast({ title: 'Salary record added!' });
      setAddSalaryModalOpen(false);
      setSalaryForm({ employeeId: '', month: '', year: new Date().getFullYear().toString(), grossSalary: '', deductions: '', paymentStatus: 'Pending', paymentDate: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding salary:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedEmployee || !statusForm.newStatus) {
      toast({ title: 'Validation Error', description: 'Please select a status', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      await supabase
        .from('hr_employees')
        .update({ status: statusForm.newStatus })
        .eq('id', selectedEmployee.id);

      toast({ title: 'Employee status updated!' });
      setStatusModalOpen(false);
      setStatusForm({ newStatus: '', reason: '' });
      setSelectedEmployee(null);
      fetchData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const openHistoryModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSelectedHistory(salaryHistory[emp.id] || []);
    setHistoryModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getLastSalary = (empId: string) => {
    const history = salaryHistory[empId];
    if (!history || history.length === 0) return null;
    return history[0];
  };

  const filteredEmployees = employees.filter(emp => {
    if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return emp.full_name.toLowerCase().includes(search) || emp.employee_code?.toLowerCase().includes(search);
    }
    return true;
  });

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const totalSalaryThisMonth = Object.values(salaryHistory).flat().filter(h => h.month === new Date().getMonth() + 1 && h.year === new Date().getFullYear()).reduce((sum, h) => sum + h.net_salary, 0);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Salary Overview</h1>
        <p className="text-muted-foreground">Manage employee salaries and payslips</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Employees" value={employees.length} icon={Users} />
        <StatCard title="Active Employees" value={activeCount} icon={Users} />
        <StatCard title="This Month's Payroll" value={formatCurrency(totalSalaryThisMonth)} icon={DollarSign} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setUploadModalOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload Payslip
        </Button>
        <Button variant="outline" onClick={() => setBulkUploadModalOpen(true)}>
          <FileUp className="mr-2 h-4 w-4" /> Bulk Upload
        </Button>
        <Button variant="outline" onClick={() => setAddSalaryModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Salary Record
        </Button>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Employee Salary Status</CardTitle>
              <CardDescription>View and manage employee salaries</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resigned">Resigned</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                  <SelectItem value="Abscond">Abscond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Salary</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const lastSalary = getLastSalary(emp.id);
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.employee_code}</TableCell>
                      <TableCell>{emp.full_name}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[emp.status] || 'bg-gray-100'}>{emp.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {lastSalary ? `${monthNames[lastSalary.month - 1]} ${lastSalary.year}` : 'Never processed'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {lastSalary ? formatCurrency(lastSalary.net_salary) : '-'}
                      </TableCell>
                      <TableCell>
                        {lastSalary && (
                          <Badge className={paymentStatusColors[lastSalary.payment_status || 'Pending']}>
                            {lastSalary.payment_status || 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openHistoryModal(emp)}>
                            <History className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(emp); setUploadForm({ ...uploadForm, employeeId: emp.id }); setUploadModalOpen(true); }}>
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(emp); setStatusForm({ newStatus: emp.status, reason: '' }); setStatusModalOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Single Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Payslip</DialogTitle>
            <DialogDescription>Upload a payslip PDF for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee*</Label>
              <Select value={uploadForm.employeeId} onValueChange={(v) => setUploadForm({ ...uploadForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_code} - {e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month*</Label>
                <Select value={uploadForm.month} onValueChange={(v) => setUploadForm({ ...uploadForm, month: v })}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year*</Label>
                <Input type="number" value={uploadForm.year} onChange={(e) => setUploadForm({ ...uploadForm, year: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Gross Salary</Label>
                <Input type="number" value={uploadForm.grossSalary} onChange={(e) => setUploadForm({ ...uploadForm, grossSalary: e.target.value })} />
              </div>
              <div>
                <Label>Deductions</Label>
                <Input type="number" value={uploadForm.deductions} onChange={(e) => setUploadForm({ ...uploadForm, deductions: e.target.value })} />
              </div>
              <div>
                <Label>Net Salary</Label>
                <Input type="number" value={uploadForm.netSalary} onChange={(e) => setUploadForm({ ...uploadForm, netSalary: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>PDF File* (max 5MB)</Label>
              <Input type="file" accept=".pdf" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSingleUpload} disabled={processing}>{processing ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={bulkUploadModalOpen} onOpenChange={setBulkUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Payslips</DialogTitle>
            <DialogDescription>Upload a ZIP file containing payslip PDFs. File naming: EMPCODE_MM_YYYY.pdf (e.g., EMP001_12_2024.pdf)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ZIP File*</Label>
              <Input type="file" accept=".zip" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            </div>
            <p className="text-sm text-muted-foreground">Each PDF should be named as: EmployeeCode_Month_Year.pdf</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUploadModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={processing}>{processing ? 'Processing...' : 'Upload'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Salary Record Modal */}
      <Dialog open={addSalaryModalOpen} onOpenChange={setAddSalaryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Salary Record</DialogTitle>
            <DialogDescription>Add a salary history entry for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee*</Label>
              <Select value={salaryForm.employeeId} onValueChange={(v) => setSalaryForm({ ...salaryForm, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_code} - {e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month*</Label>
                <Select value={salaryForm.month} onValueChange={(v) => setSalaryForm({ ...salaryForm, month: v })}>
                  <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year*</Label>
                <Input type="number" value={salaryForm.year} onChange={(e) => setSalaryForm({ ...salaryForm, year: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Gross Salary*</Label>
                <Input type="number" value={salaryForm.grossSalary} onChange={(e) => setSalaryForm({ ...salaryForm, grossSalary: e.target.value })} />
              </div>
              <div>
                <Label>Deductions*</Label>
                <Input type="number" value={salaryForm.deductions} onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })} />
              </div>
              <div>
                <Label>Net Salary</Label>
                <Input type="number" value={salaryForm.grossSalary && salaryForm.deductions ? (parseFloat(salaryForm.grossSalary) - parseFloat(salaryForm.deductions)).toString() : ''} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Status*</Label>
                <Select value={salaryForm.paymentStatus} onValueChange={(v) => setSalaryForm({ ...salaryForm, paymentStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input type="date" value={salaryForm.paymentDate} onChange={(e) => setSalaryForm({ ...salaryForm, paymentDate: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSalaryModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSalary} disabled={processing}>{processing ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary History - {selectedEmployee?.full_name}</DialogTitle>
            <DialogDescription>{selectedEmployee?.employee_code}</DialogDescription>
          </DialogHeader>
          {selectedHistory.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No salary history found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{monthNames[h.month - 1]} {h.year}</TableCell>
                    <TableCell className="text-right">{formatCurrency(h.gross_salary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(h.deductions || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(h.net_salary)}</TableCell>
                    <TableCell>
                      <Badge className={paymentStatusColors[h.payment_status || 'Pending']}>{h.payment_status || 'Pending'}</Badge>
                    </TableCell>
                    <TableCell>{h.payment_date ? format(new Date(h.payment_date), 'MMM d, yyyy') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Employee Status</DialogTitle>
            <DialogDescription>{selectedEmployee?.full_name} ({selectedEmployee?.employee_code})</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Status</Label>
              <Badge className={statusColors[selectedEmployee?.status || 'Active']}>{selectedEmployee?.status}</Badge>
            </div>
            <div>
              <Label>New Status*</Label>
              <Select value={statusForm.newStatus} onValueChange={(v) => setStatusForm({ ...statusForm, newStatus: v })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Resigned">Resigned</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                  <SelectItem value="Abscond">Abscond</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={statusForm.reason} onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })} placeholder="Enter reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={processing}>{processing ? 'Updating...' : 'Update'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryOverviewPage;
