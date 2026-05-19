import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Megaphone, Pin, Check, MoreVertical, Edit, Trash2, Cake, PartyPopper, Loader2 } from 'lucide-react';
import { checkBirthdaysAndAnniversaries } from '@/utils/birthdayAnniversaryCheck';
import { EmojiReactions } from '@/components/announcements/EmojiReactions';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_type: string;
  target_value: string | null;
  is_important: boolean | null;
  created_at: string | null;
  created_by: string;
  creator?: { full_name: string };
  hr_announcement_reads?: { read_at: string }[];
}

const AnnouncementsPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [checkingBirthdays, setCheckingBirthdays] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  // Form state
  const [form, setForm] = useState({ title: '', content: '', targetType: 'All', targetValue: '', isImportant: false });

  const isAdmin = employee?.role === 'Admin';
  const isManager = employee?.role === 'Manager';
  const canCreate = isAdmin || isManager;

  useEffect(() => {
    fetchAnnouncements();
    fetchDepartments();
  }, [employee?.id]);

  const fetchAnnouncements = async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_announcements')
        .select(`
          *,
          creator:hr_employees!created_by(full_name),
          hr_announcement_reads!left(read_at)
        `)
        .order('is_important', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      toast({ title: 'Error', description: 'Failed to load announcements', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from('hr_employee_details').select('department').not('department', 'is', null);
    const uniqueDepts = [...new Set((data || []).map(d => d.department).filter(Boolean))] as string[];
    setDepartments(uniqueDepts);
  };

  const markAsRead = async (announcementId: string) => {
    if (!employee?.id) return;
    try {
      await supabase.from('hr_announcement_reads').upsert({
        announcement_id: announcementId,
        employee_id: employee.id,
      });
      // Update local state
      setAnnouncements(prev => prev.map(a => {
        if (a.id === announcementId) {
          return { ...a, hr_announcement_reads: [{ read_at: new Date().toISOString() }] };
        }
        return a;
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleExpand = (id: string) => {
    if (expandedId !== id) {
      setExpandedId(id);
      const announcement = announcements.find(a => a.id === id);
      if (announcement && (!announcement.hr_announcement_reads || announcement.hr_announcement_reads.length === 0)) {
        markAsRead(id);
      }
    } else {
      setExpandedId(null);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Validation Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.from('hr_announcements').insert({
        title: form.title,
        content: form.content,
        target_type: form.targetType,
        target_value: form.targetType === 'All' ? null : form.targetValue,
        is_important: form.isImportant,
        created_by: employee?.id,
      });

      if (error) throw error;

      // Create notifications for targeted employees
      let targetedEmployeesQuery = supabase
        .from('hr_employees')
        .select('id')
        .eq('status', 'Active');

      if (form.targetType === 'Role') {
        targetedEmployeesQuery = targetedEmployeesQuery.eq('role', form.targetValue);
      } else if (form.targetType === 'Department') {
        // Need to join with hr_employee_details for department
        const { data: empDetails } = await supabase
          .from('hr_employee_details')
          .select('employee_id')
          .eq('department', form.targetValue);
        
        if (empDetails && empDetails.length > 0) {
          const empIds = empDetails.map(d => d.employee_id);
          targetedEmployeesQuery = targetedEmployeesQuery.in('id', empIds);
        }
      }

      const { data: targetedEmployees } = await targetedEmployeesQuery;
      
      if (targetedEmployees && targetedEmployees.length > 0) {
        const notifications = targetedEmployees
          .filter(emp => emp.id !== employee?.id) // Don't notify creator
          .map(emp => ({
            employee_id: emp.id,
            type: 'announcement_new',
            title: 'New Announcement',
            message: form.title,
            link: '/app/announcements',
          }));
        
        if (notifications.length > 0) {
          await supabase.from('hr_notifications').insert(notifications);
        }
      }

      toast({ title: 'Announcement published!' });
      setCreateModalOpen(false);
      setForm({ title: '', content: '', targetType: 'All', targetValue: '', isImportant: false });
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      targetType: announcement.target_type,
      targetValue: announcement.target_value || '',
      isImportant: announcement.is_important || false,
    });
    setCreateModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedAnnouncement || !form.title.trim() || !form.content.trim()) {
      toast({ title: 'Validation Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.from('hr_announcements').update({
        title: form.title,
        content: form.content,
        target_type: form.targetType,
        target_value: form.targetType === 'All' ? null : form.targetValue,
        is_important: form.isImportant,
      }).eq('id', selectedAnnouncement.id);

      if (error) throw error;

      toast({ title: 'Announcement updated!' });
      closeModal();
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Error updating announcement:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;

    setProcessing(true);
    try {
      const { error } = await supabase.from('hr_announcements').delete().eq('id', selectedAnnouncement.id);
      if (error) throw error;

      toast({ title: 'Announcement deleted!' });
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setCreateModalOpen(false);
    setSelectedAnnouncement(null);
    setForm({ title: '', content: '', targetType: 'All', targetValue: '', isImportant: false });
  };

  const isRead = (announcement: Announcement) => announcement.hr_announcement_reads && announcement.hr_announcement_reads.length > 0;

  const canEditDelete = (announcement: Announcement) => isAdmin || announcement.created_by === employee?.id;

  const getTargetLabel = (a: Announcement) => {
    if (a.target_type === 'All') return 'All Employees';
    return `${a.target_type}: ${a.target_value}`;
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'unread' && isRead(a)) return false;
    if (filter === 'important' && !a.is_important) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Company Announcements</h1>
          <p className="text-muted-foreground">Stay updated with company news and updates</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              onClick={async () => {
                setCheckingBirthdays(true);
                toast({ title: 'Checking...', description: 'Looking for birthdays and anniversaries' });
                const result = await checkBirthdaysAndAnniversaries(employee?.id);
                if (result.birthdays > 0 || result.anniversaries > 0) {
                  toast({ title: 'Announcements Created!', description: `${result.birthdays} birthday(s) and ${result.anniversaries} anniversary(ies) found` });
                  fetchAnnouncements();
                } else {
                  toast({ title: 'No Events Today', description: 'No birthdays or work anniversaries found for today' });
                }
                setCheckingBirthdays(false);
              }}
              disabled={checkingBirthdays}
            >
              {checkingBirthdays ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cake className="mr-2 h-4 w-4" />}
              Check Birthdays
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Announcement
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unread')}>Unread</Button>
        <Button variant={filter === 'important' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('important')}>Important</Button>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No announcements</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((a) => (
            <Card
              key={a.id}
              className={`glass-card cursor-pointer transition-all ${a.is_important ? 'border-l-4 border-l-yellow-500' : ''} ${!isRead(a) ? 'border-l-4 border-l-primary' : ''}`}
              onClick={() => handleExpand(a.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {a.is_important && !a.title.includes('🎂') && !a.title.includes('🎊') && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
                          <Pin className="h-3 w-3 mr-1" /> Important
                        </Badge>
                      )}
                      {a.title.includes('🎂') && (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-800 border-pink-300">
                          <Cake className="h-3 w-3 mr-1" /> Birthday
                        </Badge>
                      )}
                      {a.title.includes('🎊') && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                          <PartyPopper className="h-3 w-3 mr-1" /> Work Anniversary
                        </Badge>
                      )}
                      <Badge variant="outline">{getTargetLabel(a)}</Badge>
                      {isRead(a) && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" /> Read
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{a.title}</h3>
                    <p className={`text-muted-foreground mt-2 ${expandedId === a.id ? '' : 'line-clamp-2'}`}>
                      {a.content}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span>By {a.creator?.full_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ''}</span>
                    </div>
                    {employee?.id && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <EmojiReactions announcementId={a.id} employeeId={employee.id} />
                      </div>
                    )}
                  </div>
                  {canEditDelete(a) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(a); }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setSelectedAnnouncement(a); setDeleteDialogOpen(true); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={createModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
            <DialogDescription>Share news and updates with your team</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title*</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" maxLength={200} />
            </div>
            <div>
              <Label>Content*</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Announcement content..." rows={4} maxLength={2000} />
            </div>
            <div>
              <Label>Target Audience*</Label>
              <Select value={form.targetType} onValueChange={(v) => setForm({ ...form, targetType: v, targetValue: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="All">All Employees</SelectItem>}
                  <SelectItem value="Department">Department</SelectItem>
                  {isAdmin && <SelectItem value="Role">Role</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {form.targetType === 'Department' && (
              <div>
                <Label>Select Department</Label>
                <Select value={form.targetValue} onValueChange={(v) => setForm({ ...form, targetValue: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NestOps">NestOps</SelectItem>
                    <SelectItem value="NestHQ">NestHQ</SelectItem>
                    <SelectItem value="NestTech">NestTech</SelectItem>
                    <SelectItem value="NestLabs">NestLabs</SelectItem>
                    <SelectItem value="Nest People">Nest People</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.targetType === 'Role' && (
              <div>
                <Label>Select Role</Label>
                <Select value={form.targetValue} onValueChange={(v) => setForm({ ...form, targetValue: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="important" checked={form.isImportant} onCheckedChange={(c) => setForm({ ...form, isImportant: !!c })} />
              <Label htmlFor="important" className="cursor-pointer">Mark as Important</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={selectedAnnouncement ? handleUpdate : handleCreate} disabled={processing}>
              {processing ? 'Publishing...' : selectedAnnouncement ? 'Update' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAnnouncement?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AnnouncementsPage;
