import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, Mail, Phone, Building, MapPin, Briefcase, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  location: string | null;
}

const ContactsPage = () => {
  const { employee: currentEmployee } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!currentEmployee?.id || !currentEmployee?.org_id) return;

      setLoading(true);

      // Build query based on role
      let query = supabase
        .from('hr_employees')
        .select('id, full_name, email, manager_id')
        .eq('org_id', currentEmployee.org_id)
        .eq('status', 'Active')
        .order('full_name');

      // Role-based filtering
      if (currentEmployee.role === 'Employee') {
        // Employee: See only own data
        query = query.eq('id', currentEmployee.id);
      } else if (currentEmployee.role === 'Manager') {
        // Manager: See own data + team members
        query = query.or(`id.eq.${currentEmployee.id},manager_id.eq.${currentEmployee.id}`);
      }
      // Admin: No filter, see all

      const { data: employeesData } = await query;

      if (!employeesData) {
        setLoading(false);
        return;
      }

      // Fetch employee details for visible employees only
      const employeeIds = employeesData.map(e => e.id);
      const { data: detailsData } = await supabase
        .from('hr_employee_details')
        .select('employee_id, phone, department, designation, location')
        .in('employee_id', employeeIds);

      const detailsMap = new Map(
        (detailsData || []).map(d => [d.employee_id, d])
      );

      const combinedData: Contact[] = employeesData.map(emp => {
        const details = detailsMap.get(emp.id);
        return {
          id: emp.id,
          full_name: emp.full_name,
          email: emp.email,
          phone: details?.phone || null,
          department: details?.department || null,
          designation: details?.designation || null,
          location: details?.location || null,
        };
      });

      setContacts(combinedData);
      setLoading(false);
    };

    fetchContacts();
  }, [currentEmployee?.id, currentEmployee?.org_id, currentEmployee?.role]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.full_name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      (contact.department?.toLowerCase().includes(searchLower) ?? false)
    );
  }, [contacts, searchQuery]);

  const handleRowClick = (contact: Contact) => {
    setSelectedContact(contact);
    setModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">Employee contact directory</p>
        </div>
        <Skeleton className="h-12 max-w-md" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const getRoleDescription = () => {
    if (currentEmployee?.role === 'Employee') return 'Your contact information';
    if (currentEmployee?.role === 'Manager') return 'Your team contacts';
    return 'All employee contacts';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground">{getRoleDescription()}</p>
        </div>
        <Badge variant="outline" className="w-fit">{currentEmployee?.role}</Badge>
      </div>

      {/* Search Bar */}
      <Card className="p-4 glass-card">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Empty State */}
      {filteredContacts.length === 0 ? (
        <Card className="p-8 text-center glass-card">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
          <p className="text-muted-foreground">Try adjusting your search query</p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="glass-card hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(contact)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary-foreground">
                            {getInitials(contact.full_name)}
                          </span>
                        </div>
                        <span className="font-medium">{contact.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.phone || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.department || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.designation || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredContacts.map((contact) => (
              <Card
                key={contact.id}
                className="p-4 glass-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleRowClick(contact)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary-foreground">
                      {getInitials(contact.full_name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{contact.full_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {contact.department && (
                        <span className="text-xs text-muted-foreground">{contact.department}</span>
                      )}
                      {contact.designation && (
                        <>
                          {contact.department && <span className="text-muted-foreground">•</span>}
                          <span className="text-xs text-muted-foreground">{contact.designation}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Contact Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {selectedContact ? getInitials(selectedContact.full_name) : ''}
                </span>
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedContact?.full_name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selectedContact?.designation || 'Employee'}</p>
              </div>
            </div>
          </DialogHeader>

          {selectedContact && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedContact.email}</p>
                </div>
              </div>

              {selectedContact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{selectedContact.phone}</p>
                  </div>
                </div>
              )}

              {selectedContact.department && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">{selectedContact.department}</p>
                  </div>
                </div>
              )}

              {selectedContact.designation && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Designation</p>
                    <p className="text-sm font-medium">{selectedContact.designation}</p>
                  </div>
                </div>
              )}

              {selectedContact.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{selectedContact.location}</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button
                  className="w-full"
                  onClick={() => window.location.href = `mailto:${selectedContact.email}`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactsPage;
