import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isWithinInterval, addDays, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Pencil, Trash2, CalendarDays, ListFilter, Calendar as CalendarViewIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  description: string | null;
  is_optional: boolean | null;
  year: number;
  created_by: string | null;
  created_at: string | null;
}

const HOLIDAY_TYPES = ['National', 'Regional', 'Company'];

const typeColors: Record<string, string> = {
  'National': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Regional': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Company': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const HolidaysPage = () => {
  const { employee, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'Admin';
  const currentYear = new Date().getFullYear();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [optionalFilter, setOptionalFilter] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    holiday_name: '',
    holiday_date: null as Date | null,
    holiday_type: '',
    description: '',
    is_optional: false,
  });
  
  // Edit/Delete state
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [deleteHoliday, setDeleteHoliday] = useState<Holiday | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Calendar view state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_holidays')
        .select('*')
        .eq('year', selectedYear)
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching holidays',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.holiday_name || !formData.holiday_date || !formData.holiday_type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('hr_holidays').insert({
        holiday_name: formData.holiday_name,
        holiday_date: format(formData.holiday_date, 'yyyy-MM-dd'),
        holiday_type: formData.holiday_type,
        description: formData.description || null,
        is_optional: formData.is_optional,
        year: formData.holiday_date.getFullYear(),
        created_by: employee?.id,
      });

      if (error) throw error;

      toast({ title: 'Holiday added successfully!' });
      setFormData({
        holiday_name: '',
        holiday_date: null,
        holiday_type: '',
        description: '',
        is_optional: false,
      });
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error adding holiday',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditHoliday = async () => {
    if (!editHoliday) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('hr_holidays')
        .update({
          holiday_name: editHoliday.holiday_name,
          holiday_date: editHoliday.holiday_date,
          holiday_type: editHoliday.holiday_type,
          description: editHoliday.description,
          is_optional: editHoliday.is_optional,
          year: new Date(editHoliday.holiday_date).getFullYear(),
        })
        .eq('id', editHoliday.id);

      if (error) throw error;

      toast({ title: 'Holiday updated successfully!' });
      setEditDialogOpen(false);
      setEditHoliday(null);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error updating holiday',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHoliday = async () => {
    if (!deleteHoliday) return;

    try {
      const { error } = await supabase
        .from('hr_holidays')
        .delete()
        .eq('id', deleteHoliday.id);

      if (error) throw error;

      toast({ title: 'Holiday deleted successfully!' });
      setDeleteHoliday(null);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error deleting holiday',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter holidays
  const filteredHolidays = holidays.filter(h => {
    if (typeFilter !== 'all' && h.holiday_type !== typeFilter) return false;
    if (optionalFilter === 'optional' && !h.is_optional) return false;
    if (optionalFilter === 'mandatory' && h.is_optional) return false;
    return true;
  });

  // Stats
  const upcomingHolidays = holidays.filter(h => {
    const holidayDate = new Date(h.holiday_date);
    const today = startOfDay(new Date());
    return isWithinInterval(holidayDate, { start: today, end: addDays(today, 30) });
  });
  const optionalCount = holidays.filter(h => h.is_optional).length;

  // Get unique years from data
  const availableYears = [...new Set([currentYear, currentYear - 1, currentYear + 1])].sort((a, b) => b - a);

  // Check if a date has a holiday for calendar view
  const getHolidayForDate = (date: Date) => {
    return holidays.find(h => format(new Date(h.holiday_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Holidays</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage company holidays' : `Holiday calendar for ${selectedYear}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Holidays</CardDescription>
            <CardTitle className="text-3xl">{holidays.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming (30 days)</CardDescription>
            <CardTitle className="text-3xl">{upcomingHolidays.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Optional Holidays</CardDescription>
            <CardTitle className="text-3xl">{optionalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Add Holiday Form - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Add Holiday</CardTitle>
            <CardDescription>Add a new holiday to the calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="holiday_name">Holiday Name *</Label>
                <Input
                  id="holiday_name"
                  value={formData.holiday_name}
                  onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })}
                  placeholder="e.g., Independence Day"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.holiday_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.holiday_date ? format(formData.holiday_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.holiday_date || undefined}
                      onSelect={(date) => setFormData({ ...formData, holiday_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  value={formData.holiday_date ? formData.holiday_date.getFullYear() : ''}
                  readOnly
                  disabled
                  placeholder="Auto-filled"
                />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.holiday_type}
                  onValueChange={(v) => setFormData({ ...formData, holiday_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLIDAY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox
                  id="is_optional"
                  checked={formData.is_optional}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_optional: checked as boolean })}
                />
                <Label htmlFor="is_optional" className="font-normal">This is an optional holiday</Label>
              </div>

              <div className="md:col-span-3">
                <Button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700">
                  {submitting ? 'Adding...' : 'Add Holiday'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Holidays List/Calendar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Holiday Calendar</CardTitle>
              <CardDescription>
                Showing {filteredHolidays.length} holidays in {selectedYear}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <ListFilter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {HOLIDAY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={optionalFilter} onValueChange={setOptionalFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="mandatory">Mandatory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarViewIcon className="h-4 w-4" />
                Calendar View
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              {filteredHolidays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarDays className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No holidays added for this year yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Holiday Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Optional</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHolidays.map(holiday => {
                        const holidayDate = new Date(holiday.holiday_date);
                        const isUpcoming = isWithinInterval(holidayDate, {
                          start: startOfDay(new Date()),
                          end: addDays(new Date(), 7),
                        });

                        return (
                          <TableRow key={holiday.id} className={isUpcoming && !isAdmin ? 'bg-accent/50' : ''}>
                            <TableCell className="font-medium">
                              {holiday.holiday_name}
                              {holiday.description && (
                                <p className="text-sm text-muted-foreground mt-1">{holiday.description}</p>
                              )}
                            </TableCell>
                            <TableCell>{format(holidayDate, 'd MMM yyyy')}</TableCell>
                            <TableCell>{format(holidayDate, 'EEEE')}</TableCell>
                            <TableCell>
                              <Badge className={typeColors[holiday.holiday_type] || 'bg-gray-100 text-gray-800'}>
                                {holiday.holiday_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {holiday.is_optional && (
                                <Badge variant="outline">Optional</Badge>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditHoliday(holiday);
                                      setEditDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => setDeleteHoliday(holiday)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="calendar">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    holiday: holidays.map(h => new Date(h.holiday_date)),
                  }}
                  modifiersStyles={{
                    holiday: { 
                      backgroundColor: 'hsl(var(--primary))', 
                      color: 'hsl(var(--primary-foreground))',
                      borderRadius: '50%' 
                    },
                  }}
                  components={{
                    Day: ({ date, ...props }) => {
                      const holiday = getHolidayForDate(date);
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              {...props}
                              className={cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
                                holiday && typeColors[holiday.holiday_type]?.replace('text-', 'text-').split(' ')[0],
                                holiday && "font-semibold"
                              )}
                            >
                              {date.getDate()}
                            </button>
                          </PopoverTrigger>
                          {holiday && (
                            <PopoverContent className="w-64 p-3">
                              <div className="space-y-2">
                                <p className="font-semibold">{holiday.holiday_name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className={typeColors[holiday.holiday_type]}>
                                    {holiday.holiday_type}
                                  </Badge>
                                  {holiday.is_optional && <Badge variant="outline">Optional</Badge>}
                                </div>
                                {holiday.description && (
                                  <p className="text-sm text-muted-foreground">{holiday.description}</p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(holiday.holiday_date), 'EEEE, MMMM d, yyyy')}
                                </p>
                              </div>
                            </PopoverContent>
                          )}
                        </Popover>
                      );
                    },
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>Update the holiday details</DialogDescription>
          </DialogHeader>
          {editHoliday && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Holiday Name</Label>
                <Input
                  value={editHoliday.holiday_name}
                  onChange={(e) => setEditHoliday({ ...editHoliday, holiday_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(new Date(editHoliday.holiday_date), "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(editHoliday.holiday_date)}
                      onSelect={(date) => date && setEditHoliday({ 
                        ...editHoliday, 
                        holiday_date: format(date, 'yyyy-MM-dd'),
                        year: date.getFullYear()
                      })}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editHoliday.holiday_type}
                  onValueChange={(v) => setEditHoliday({ ...editHoliday, holiday_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOLIDAY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editHoliday.description || ''}
                  onChange={(e) => setEditHoliday({ ...editHoliday, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={editHoliday.is_optional || false}
                  onCheckedChange={(checked) => setEditHoliday({ ...editHoliday, is_optional: checked as boolean })}
                />
                <Label className="font-normal">Optional holiday</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditHoliday} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteHoliday} onOpenChange={() => setDeleteHoliday(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteHoliday?.holiday_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHoliday} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HolidaysPage;
