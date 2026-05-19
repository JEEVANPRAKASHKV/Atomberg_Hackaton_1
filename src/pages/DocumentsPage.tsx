import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Upload, Eye, Trash2, Search, Filter, Image, File, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Document types by category
const DOCUMENT_TYPES = {
  Personal: [
    'Aadhar Card',
    'PAN Card', 
    'Passport',
    'Driving License',
    'Educational Certificates',
    'Previous Employment Docs'
  ],
  Company: [
    'Offer Letter',
    'Appointment Letter',
    'Experience Letter',
    'Salary Slips',
    'Policy Documents'
  ]
};

const ALL_DOCUMENT_TYPES = [...DOCUMENT_TYPES.Personal, ...DOCUMENT_TYPES.Company];

interface Document {
  id: string;
  employee_id: string;
  document_name: string;
  document_type: string;
  document_category: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  uploaded_at: string | null;
  notes: string | null;
  uploaded_by_name?: string;
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string | null;
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocumentCategory = (type: string): string => {
  if (DOCUMENT_TYPES.Personal.includes(type)) return 'Personal';
  if (DOCUMENT_TYPES.Company.includes(type)) return 'Company';
  return 'Personal';
};

const getFileIcon = (fileType: string | null) => {
  if (fileType?.includes('pdf')) {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (fileType?.includes('image')) {
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  return <File className="w-5 h-5 text-muted-foreground" />;
};

const DocumentsPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();

  // State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    documentType: '',
    documentName: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  const currentEmployeeId = employee?.id;

  // Fetch employees list (for Admin only - Managers only see their own documents)
  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('id, full_name, employee_code')
        .eq('status', 'Active')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, [isAdmin]);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!currentEmployeeId) return;

    setLoading(true);
    try {
      let targetEmployeeId = currentEmployeeId;

      // Only Admin can view another employee's documents
      if (isAdmin && selectedEmployee) {
        targetEmployeeId = selectedEmployee;
      }

      const { data, error } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('employee_id', targetEmployeeId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      // Fetch uploader names separately
      const uploaderIds = [...new Set((data || []).map(d => d.uploaded_by))];
      let uploaderMap: Record<string, string> = {};
      
      if (uploaderIds.length > 0) {
        const { data: uploaders } = await supabase
          .from('hr_employees')
          .select('id, full_name')
          .in('id', uploaderIds);
        
        uploaderMap = (uploaders || []).reduce((acc, u) => {
          acc[u.id] = u.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      const formattedDocs = (data || []).map(doc => ({
        ...doc,
        uploaded_by_name: uploaderMap[doc.uploaded_by] || 'Unknown'
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentEmployeeId, selectedEmployee, isAdmin, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Set default selected employee for admin only
  useEffect(() => {
    if (isAdmin && !selectedEmployee && currentEmployeeId) {
      setSelectedEmployee(currentEmployeeId);
    }
  }, [isAdmin, selectedEmployee, currentEmployeeId]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PDF, JPG, or PNG file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setUploadForm(prev => ({
      ...prev,
      documentName: prev.documentName || file.name.replace(/\.[^/.]+$/, ''),
    }));
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.documentType || !uploadForm.documentName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentEmployeeId) return;

    const category = getDocumentCategory(uploadForm.documentType);

    // Employees can only upload personal documents
    if (!isAdmin && category === 'Company') {
      toast({
        title: 'Not Allowed',
        description: 'You can only upload personal documents.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const targetEmployeeId = (isAdmin && selectedEmployee) ? selectedEmployee : currentEmployeeId;
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${targetEmployeeId}/${timestamp}_${uploadForm.documentName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

      // Upload to Supabase Storage
      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Insert metadata to database
      const { error: insertError } = await supabase
        .from('hr_documents')
        .insert({
          employee_id: targetEmployeeId,
          document_name: uploadForm.documentName,
          document_type: uploadForm.documentType,
          document_category: category,
          file_path: filePath,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          uploaded_by: currentEmployeeId,
          notes: uploadForm.notes || null,
        });

      if (insertError) {
        // Clean up uploaded file if insert fails
        await supabase.storage.from('employee-documents').remove([filePath]);
        throw insertError;
      }

      setUploadProgress(100);

      toast({
        title: 'Success',
        description: 'Document uploaded successfully.',
      });

      // Reset form and close modal
      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadForm({ documentType: '', documentName: '', notes: '' });
      setUploadProgress(0);

      // Refresh documents
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle download
  const handleDownload = async (doc: Document) => {
    setDownloading(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;

      // Open in new tab
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download document.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  // Handle delete
  const handleDelete = async (doc: Document) => {
    setDeleting(doc.id);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('employee-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('hr_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: 'Deleted',
        description: 'Document deleted successfully.',
      });

      // Refresh documents
      fetchDocuments();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete document.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  // Check if user can delete a document - Admin can delete any, others can delete their own personal docs
  const canDelete = (doc: Document): boolean => {
    if (isAdmin) return true;
    // Managers and Employees can delete their own personal documents that they uploaded
    if (doc.uploaded_by === currentEmployeeId && doc.document_category === 'Personal') return true;
    return false;
  };

  // Check if user can upload - All users can upload their own documents
  const canUpload = (): boolean => {
    return true; // All roles can upload their own documents
  };

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => {
      if (filterType !== 'all' && doc.document_type !== filterType) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          doc.document_name.toLowerCase().includes(query) ||
          doc.document_type.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.document_name.localeCompare(b.document_name);
        case 'type':
          return a.document_type.localeCompare(b.document_type);
        case 'date':
        default:
          return new Date(b.uploaded_at || 0).getTime() - new Date(a.uploaded_at || 0).getTime();
      }
    });

  // Group by category
  const personalDocs = filteredDocuments.filter(d => d.document_category === 'Personal');
  const companyDocs = filteredDocuments.filter(d => d.document_category === 'Company');

  // Stats
  const stats = {
    total: documents.length,
    personal: documents.filter(d => d.document_category === 'Personal').length,
    company: documents.filter(d => d.document_category === 'Company').length,
  };

  // Get available document types for upload - All non-admin users can only upload personal docs
  const getAvailableDocTypes = () => {
    if (isAdmin) return ALL_DOCUMENT_TYPES;
    return DOCUMENT_TYPES.Personal; // Employees and Managers can only upload personal docs
  };

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">View and manage your documents</p>
        </div>
        
        {canUpload() && (
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document. Allowed formats: PDF, JPG, PNG (max 10MB)
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Document Type */}
                <div className="space-y-2">
                  <Label htmlFor="docType">Document Type *</Label>
                  <Select
                    value={uploadForm.documentType}
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, documentType: value }))}
                    disabled={uploading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableDocTypes().map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {uploadForm.documentType && (
                    <p className="text-xs text-muted-foreground">
                      Category: {getDocumentCategory(uploadForm.documentType)}
                    </p>
                  )}
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="file">File *</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label htmlFor="file" className="cursor-pointer">
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          {getFileIcon(selectedFile.type)}
                          <span className="text-sm">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({formatFileSize(selectedFile.size)})
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF, JPG, PNG up to 10MB
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Document Name */}
                <div className="space-y-2">
                  <Label htmlFor="docName">Document Name *</Label>
                  <Input
                    id="docName"
                    value={uploadForm.documentName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, documentName: e.target.value }))}
                    placeholder="Enter document name"
                    disabled={uploading}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any notes..."
                    rows={2}
                    disabled={uploading}
                  />
                </div>

                {/* Upload Progress */}
                {uploading && uploadProgress > 0 && (
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadForm.documentType}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Employee Selector (Admin only) */}
      {isAdmin && employees.length > 0 && (
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="employeeSelect" className="whitespace-nowrap">
                View documents for:
              </Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {currentEmployeeId && (
                    <SelectItem value={currentEmployeeId}>My Documents</SelectItem>
                  )}
                  {employees.filter(emp => emp.id !== currentEmployeeId).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personal Documents</p>
                <p className="text-2xl font-bold text-foreground">{stats.personal}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <File className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Company Documents</p>
                <p className="text-2xl font-bold text-foreground">{stats.company}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ALL_DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="glass-card">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="w-20 h-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && documents.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Documents Yet</h3>
            <p className="text-muted-foreground mb-4">
              {canUpload() 
                ? 'Upload your first document to get started.'
                : 'No documents have been uploaded yet.'}
            </p>
            {canUpload() && (
              <Button onClick={() => setUploadModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="space-y-6">
          {/* Personal Documents */}
          {personalDocs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Personal</Badge>
                <span className="text-sm text-muted-foreground font-normal">({personalDocs.length})</span>
              </h2>
              <Card className="glass-card overflow-hidden">
                <div className="divide-y divide-border">
                  {personalDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      canDelete={canDelete(doc)}
                      deleting={deleting === doc.id}
                      downloading={downloading === doc.id}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => handleDelete(doc)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Company Documents */}
          {companyDocs.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">Company</Badge>
                <span className="text-sm text-muted-foreground font-normal">({companyDocs.length})</span>
              </h2>
              <Card className="glass-card overflow-hidden">
                <div className="divide-y divide-border">
                  {companyDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      canDelete={canDelete(doc)}
                      deleting={deleting === doc.id}
                      downloading={downloading === doc.id}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => handleDelete(doc)}
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* No results after filter */}
      {!loading && documents.length > 0 && filteredDocuments.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-8 text-center">
            <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No documents match your search criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Document Row Component
interface DocumentRowProps {
  doc: Document;
  canDelete: boolean;
  deleting: boolean;
  downloading: boolean;
  onDownload: () => void;
  onDelete: () => void;
}

const DocumentRow = ({ doc, canDelete, deleting, downloading, onDownload, onDelete }: DocumentRowProps) => {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {getFileIcon(doc.file_type)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{doc.document_name}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">{doc.document_type}</Badge>
            <span>•</span>
            <span>{formatFileSize(doc.file_size)}</span>
            <span>•</span>
            <span>{doc.uploaded_at ? format(new Date(doc.uploaded_at), 'dd MMM yyyy') : 'Unknown'}</span>
            {doc.uploaded_by_name && (
              <>
                <span>•</span>
                <span>by {doc.uploaded_by_name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          disabled={downloading}
          title="Download"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
        
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleting}
                title="Delete"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{doc.document_name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
