import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, X, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { generateEmailFromName, generateEmployeeCode, parseDDMMYYYY } from '@/lib/employeeUtils';
import { sendWelcomeEmail } from '@/lib/emailService';

interface CSVRow {
  full_name: string;
  email: string;
  employee_code: string;
  role: string;
  department: string;
  designation?: string;
  gender?: string;
  manager_email?: string;
  joining_date?: string;
  phone?: string;
  location?: string;
  employment_type?: string;
  date_of_birth?: string;
  birthday_celebrated_on?: string;
  address?: string;
}

interface PreviewEmployee {
  rowNumber: number;
  data: CSVRow;
  valid: boolean;
  errors: string[];
}

interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; name: string; error: string }[];
}

const VALID_ROLES = ['Admin', 'Manager', 'Employee'];
const VALID_DEPARTMENTS = ['NestOps', 'NestHQ', 'NestTech', 'NestLabs', 'Nest People'];
const VALID_EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];

const BulkUploadPage = () => {
  const { session, employee } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewEmployee[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [uploadResults, setUploadResults] = useState<BulkUploadResult | null>(null);

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      // Handle CSV values that might contain commas within quotes
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row as unknown as CSVRow);
    }
    
    return rows;
  };

  const validateRow = (row: CSVRow, rowNumber: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Only full_name, role, and department are truly required
    // email and employee_code will be auto-generated
    if (!row.full_name?.trim()) errors.push('Name is required');
    if (!row.role?.trim()) errors.push('Role is required');
    if (!row.department?.trim()) errors.push('Department is required');
    
    // Email format (only validate if provided)
    if (row.email?.trim() && !row.email.includes('@')) {
      errors.push('Invalid email format');
    }
    
    // Role validation
    if (row.role && !VALID_ROLES.includes(row.role)) {
      errors.push(`Invalid role. Must be: ${VALID_ROLES.join(', ')}`);
    }
    
    // Department validation
    if (row.department && !VALID_DEPARTMENTS.includes(row.department)) {
      errors.push(`Invalid department. Must be: ${VALID_DEPARTMENTS.join(', ')}`);
    }
    
    // Employment type validation
    if (row.employment_type && !VALID_EMPLOYMENT_TYPES.includes(row.employment_type)) {
      errors.push(`Invalid employment type. Must be: ${VALID_EMPLOYMENT_TYPES.join(', ')}`);
    }
    
    // Date format validation - accept both DD-MM-YYYY and YYYY-MM-DD
    if (row.joining_date?.trim()) {
      const isYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/.test(row.joining_date);
      const isDDMMYYYY = /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(row.joining_date);
      if (!isYYYYMMDD && !isDDMMYYYY) {
        errors.push('Invalid joining date format (use DD-MM-YYYY or YYYY-MM-DD)');
      }
    }
    
    if (row.date_of_birth?.trim()) {
      const isYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth);
      const isDDMMYYYY = /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(row.date_of_birth);
      if (!isYYYYMMDD && !isDDMMYYYY) {
        errors.push('Invalid date of birth format (use DD-MM-YYYY or YYYY-MM-DD)');
      }
    }
    
    return { valid: errors.length === 0, errors };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    setFile(selectedFile);
    setIsProcessing(true);
    
    try {
      const csvText = await selectedFile.text();
      const rows = parseCSV(csvText);
      
      if (rows.length === 0) {
        toast.error('No data found in CSV file');
        setIsProcessing(false);
        return;
      }
      
      const preview: PreviewEmployee[] = rows.map((row, index) => {
        const validation = validateRow(row, index + 2);
        return {
          rowNumber: index + 2,
          data: row,
          valid: validation.valid,
          errors: validation.errors
        };
      });
      
      setPreviewData(preview);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewData([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createEmployeeFromCSV = async (row: CSVRow, rowNumber: number): Promise<void> => {
    // Auto-generate email if not provided
    let email = row.email?.trim();
    if (!email) {
      email = await generateEmailFromName(row.full_name);
    }
    
    // Auto-generate employee code if not provided
    let employeeCode = row.employee_code?.trim();
    if (!employeeCode) {
      employeeCode = await generateEmployeeCode(employee?.org_id);
    }
    
    // Parse dates (support both DD-MM-YYYY and YYYY-MM-DD)
    let joiningDate: string | null = null;
    if (row.joining_date?.trim()) {
      try {
        joiningDate = parseDDMMYYYY(row.joining_date);
      } catch (e) {
        joiningDate = new Date().toISOString().split('T')[0];
      }
    } else {
      joiningDate = new Date().toISOString().split('T')[0];
    }
    
    let dateOfBirth: string | null = null;
    if (row.date_of_birth?.trim()) {
      try {
        dateOfBirth = parseDDMMYYYY(row.date_of_birth);
      } catch (e) {
        // Invalid date, skip
      }
    }
    
    // Check if employee code already exists
    const { data: existing } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('employee_code', employeeCode)
      .maybeSingle();
    
    if (existing) {
      throw new Error(`Employee code ${employeeCode} already exists`);
    }
    
    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('hr_employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (existingEmail) {
      throw new Error(`Email ${email} already exists`);
    }
    
    // Find manager by email
    let managerId = null;
    if (row.manager_email) {
      const { data: manager } = await supabase
        .from('hr_employees')
        .select('id')
        .eq('email', row.manager_email)
        .maybeSingle();
      
      managerId = manager?.id || null;
    }
    
    // Step 1: Create Supabase auth account via client-side signUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: employeeCode, // Password = employee code
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: row.full_name,
          employee_code: employeeCode
        }
      }
    });
    
    if (authError) {
      throw new Error(`Auth creation failed: ${authError.message}`);
    }
    
    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('No user ID returned from auth creation');
    }
    
    try {
      // Step 2: Create hr_employees record
      const { data: newEmployee, error: empError } = await supabase
        .from('hr_employees')
        .insert({
          user_id: userId,
          full_name: row.full_name,
          email: email,
          employee_code: employeeCode,
          role: row.role as 'Admin' | 'Manager' | 'Employee',
          manager_id: managerId,
          status: 'Active',
          joining_date: joiningDate,
          leave_balance: 18,
          org_id: employee?.org_id
        })
        .select()
        .single();
      
      if (empError) {
        // Note: Cannot delete auth user from client-side
        console.error('Employee creation failed, auth user may be orphaned:', userId);
        throw new Error(`Employee record creation failed: ${empError.message}`);
      }
      
      // Step 3: Create hr_employee_details
      let birthdayDate: string | null = null;
      if (row.birthday_celebrated_on?.trim()) {
        try {
          birthdayDate = parseDDMMYYYY(row.birthday_celebrated_on);
        } catch (e) {
          // Invalid date, skip
        }
      }

      await supabase
        .from('hr_employee_details')
        .insert({
          employee_id: newEmployee.id,
          phone: row.phone || null,
          department: row.department,
          designation: row.designation || null,
          location: row.location || null,
          employment_type: row.employment_type || 'Full-time',
          date_of_birth: dateOfBirth,
          birthday_celebrated_on: birthdayDate,
          gender: row.gender || null,
          address: row.address || null
        });
      
      // Step 4: Auto-assign onboarding tasks using database function
      const { error: taskError } = await (supabase.rpc as any)(
        'assign_default_onboarding_tasks',
        { p_employee_id: newEmployee.id }
      );

      if (taskError) {
        console.error('Error assigning onboarding tasks:', taskError);
      }
      
      // Step 5: Create initial leave entitlements
      if (employee?.org_id) {
        const leaveTypes = ['Casual Leave', 'Sick Leave', 'Earned Leave'];
        const leaveEntitlements = leaveTypes.map(type => ({
          employee_id: newEmployee.id,
          leave_type: type,
          total_leaves: type === 'Casual Leave' ? 12 : type === 'Sick Leave' ? 6 : 0,
          used_leaves: 0,
          year: new Date().getFullYear(),
          org_id: employee.org_id!
        }));
        
        await supabase
          .from('hr_leave_entitlements')
          .insert(leaveEntitlements);
      }

      // Step 6: Send welcome email
      try {
        await sendWelcomeEmail(
          email,
          row.full_name,
          employeeCode,
          employeeCode // Password = employee code
        );
        console.log(`Welcome email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send welcome email to ${email}:`, emailError);
        // Don't fail the whole operation for email failure
      }
      
    } catch (error) {
      // Note: Cannot delete auth user from client-side on failure
      console.error('Employee setup failed, auth user may be orphaned:', userId);
      throw error;
    }
  };

  const handleBulkUpload = async () => {
    const validRows = previewData.filter(p => p.valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const results: BulkUploadResult = {
      total: validRows.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setUploadProgress(Math.round(((i + 1) / validRows.length) * 100));
      
      try {
        await createEmployeeFromCSV(row.data, row.rowNumber);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: row.rowNumber,
          name: row.data.full_name || 'Unknown',
          error: error.message || 'Unknown error'
        });
      }
    }
    
    setUploadResults(results);
    setShowResultsDialog(true);
    setIsUploading(false);
    
    if (results.success > 0) {
      toast.success(`Successfully created ${results.success} employees`);
    }
    if (results.failed > 0) {
      toast.error(`Failed to create ${results.failed} employees`);
    }
  };

  const downloadTemplate = () => {
    const template = `full_name,email,employee_code,role,department,designation,gender,manager_email,joining_date,phone,location,employment_type,date_of_birth,birthday_celebrated_on,address
Snehal Singh,,,Employee,NestOps,Software Engineer,Male,manager@atomberg.com,15-01-2026,9876543210,Visakhapatnam,Full-time,20-05-1995,,123 Street
Rahul Sharma,,,Manager,NestTech,Team Lead,Male,,20-01-2026,9876543211,Hyderabad,Full-time,15-08-1996,,456 Avenue
Jane Smith,jane.smith@atomberg.com,LNI100,Employee,NestHQ,HR Executive,Female,,25-01-2026,9876543212,Mumbai,Full-time,10-03-1994,15-08-1994,789 Road`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_bulk_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = previewData.filter(e => e.valid).length;
  const invalidCount = previewData.filter(e => !e.valid).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bulk Upload Employees</h1>
          <p className="text-muted-foreground">Import multiple employees at once using CSV files</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/add-employee')}>
          <Users className="w-4 h-4 mr-2" />
          Add Single Employee
        </Button>
      </div>

      {/* Upload Area */}
      <Card className="p-8 glass-card">
        {!file ? (
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Upload Employee Data</h3>
            <p className="text-muted-foreground mb-6">Upload a CSV file with employee information</p>
            <div className="flex items-center justify-center gap-4">
              <label className="cursor-pointer">
                <Input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <Button asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Supported format: CSV • Email & Employee Code auto-generated if empty • Date format: DD-MM-YYYY
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear} disabled={isUploading}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {isProcessing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Processing file...</span>
              </div>
            )}
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Creating employees...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Preview Table */}
      {previewData.length > 0 && !isProcessing && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground">Preview</h2>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {invalidCount} errors
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClear} disabled={isUploading}>Cancel</Button>
              <Button onClick={handleBulkUpload} disabled={validCount === 0 || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {validCount} Employees
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card className="glass-card overflow-hidden">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Row</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Employee Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Joining Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((employee, idx) => (
                    <TableRow key={idx} className={!employee.valid ? 'bg-destructive/10' : ''}>
                      <TableCell className="text-muted-foreground">{employee.rowNumber}</TableCell>
                      <TableCell>
                        {employee.valid ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{employee.data.full_name || '-'}</TableCell>
                      <TableCell>{employee.data.email || '-'}</TableCell>
                      <TableCell>{employee.data.employee_code || '-'}</TableCell>
                      <TableCell>{employee.data.role || '-'}</TableCell>
                      <TableCell>{employee.data.department || '-'}</TableCell>
                      <TableCell>{employee.data.joining_date || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
          
          {/* Error Details */}
          {invalidCount > 0 && (
            <Card className="p-4 border-destructive/50 bg-destructive/5">
              <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Validation Errors
              </h3>
              <ScrollArea className="h-[150px]">
                <ul className="space-y-1 text-sm">
                  {previewData.filter(p => !p.valid).map((p, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      <span className="font-medium text-foreground">Row {p.rowNumber}</span> ({p.data.full_name || 'Unknown'}): {p.errors.join(', ')}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </Card>
          )}
        </>
      )}

      {/* Instructions */}
      <Card className="p-6 glass-card">
        <h3 className="font-semibold text-foreground mb-4">CSV Format Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Required Columns</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <code className="bg-muted px-1 rounded">full_name</code> - Employee's full name</li>
              <li>• <code className="bg-muted px-1 rounded">email</code> - Valid email address</li>
              <li>• <code className="bg-muted px-1 rounded">employee_code</code> - Unique code (e.g., EMP001)</li>
              <li>• <code className="bg-muted px-1 rounded">role</code> - Admin, Manager, or Employee</li>
              <li>• <code className="bg-muted px-1 rounded">department</code> - NestOps, NestHQ, NestTech, NestLabs, or Nest People</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Optional Columns</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <code className="bg-muted px-1 rounded">designation</code> - Job title</li>
              <li>• <code className="bg-muted px-1 rounded">manager_email</code> - Manager's email</li>
              <li>• <code className="bg-muted px-1 rounded">joining_date</code> - YYYY-MM-DD format</li>
              <li>• <code className="bg-muted px-1 rounded">phone</code>, <code className="bg-muted px-1 rounded">location</code>, <code className="bg-muted px-1 rounded">address</code></li>
              <li>• <code className="bg-muted px-1 rounded">employment_type</code> - Full-time, Part-time, Contract</li>
              <li>• <code className="bg-muted px-1 rounded">date_of_birth</code> - YYYY-MM-DD format</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
          <p className="text-sm text-foreground">
            <strong>Note:</strong> Each employee's initial password will be set to their employee code. 
            They should change it after first login.
          </p>
        </div>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload Results</DialogTitle>
            <DialogDescription>Summary of the employee import process</DialogDescription>
          </DialogHeader>
          
          {uploadResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-foreground">{uploadResults.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{uploadResults.success}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Success</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{uploadResults.failed}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                </div>
              </div>
              
              {uploadResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Errors:</h4>
                  <ScrollArea className="h-[150px] border rounded-lg p-2">
                    <ul className="space-y-1 text-sm">
                      {uploadResults.errors.map((err, idx) => (
                        <li key={idx} className="text-muted-foreground">
                          <span className="font-medium text-foreground">Row {err.row}:</span> {err.name} - {err.error}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={() => {
                  setShowResultsDialog(false);
                  handleClear();
                  navigate('/app/directory?filter=new');
                }}
              >
                View Employees
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkUploadPage;
