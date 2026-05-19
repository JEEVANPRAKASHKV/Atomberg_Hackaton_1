import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Heart, Star, Loader2, Check, ChevronsUpDown, Trash2,
  Handshake, Lightbulb, Award, HeartHandshake, Monitor,
  Crown, Rocket, Sparkles, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { sendAppreciationEmail } from '@/lib/emailService';

interface Appreciation {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  message: string;
  tag: string;
  is_public: boolean;
  visible_to_team?: string | null;
  created_at: string;
  from_employee?: { full_name: string; employee_code: string };
  to_employee?: { full_name: string; employee_code: string };
}

interface Employee {
  id: string;
  full_name: string;
  employee_code: string;
  role?: string;
  hr_employee_details?: { department: string | null }[] | null;
}

type VisibilityType = 'Public' | 'Team' | 'Private';

const TEAMS = ['NestOps', 'NestHQ', 'NestTech', 'NestLabs', 'Nest People'];

const TAG_CONFIG: Record<string, { bg: string; icon: React.ReactNode; description: string }> = {
  'Great Teamwork': { 
    bg: 'bg-blue-500', 
    icon: <Handshake className="w-4 h-4" />, 
    description: 'For exceptional collaboration' 
  },
  'Problem Solver': { 
    bg: 'bg-purple-500', 
    icon: <Lightbulb className="w-4 h-4" />, 
    description: 'For creative solutions' 
  },
  'Goes Above & Beyond': { 
    bg: 'bg-amber-500', 
    icon: <Award className="w-4 h-4" />, 
    description: 'For exceptional effort' 
  },
  'Helpful & Supportive': { 
    bg: 'bg-emerald-500', 
    icon: <HeartHandshake className="w-4 h-4" />, 
    description: 'For always helping others' 
  },
  'Technical Excellence': { 
    bg: 'bg-indigo-700', 
    icon: <Monitor className="w-4 h-4" />, 
    description: 'For outstanding technical work' 
  },
  'Leadership': { 
    bg: 'bg-red-500', 
    icon: <Crown className="w-4 h-4" />, 
    description: 'For inspiring and leading' 
  },
  'Innovation': { 
    bg: 'bg-orange-500', 
    icon: <Rocket className="w-4 h-4" />, 
    description: 'For innovative thinking' 
  },
  'Quality Focus': { 
    bg: 'bg-cyan-600', 
    icon: <Sparkles className="w-4 h-4" />, 
    description: 'For attention to quality' 
  },
  'Customer First': { 
    bg: 'bg-pink-500', 
    icon: <Heart className="w-4 h-4" />, 
    description: 'For putting customers first' 
  },
};

const TAGS = Object.keys(TAG_CONFIG);

const AppreciationsPage = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [appreciations, setAppreciations] = useState<Appreciation[]>([]);
  const [allAppreciations, setAllAppreciations] = useState<Appreciation[]>([]);
  const [receivedAppreciations, setReceivedAppreciations] = useState<Appreciation[]>([]);
  const [givenAppreciations, setGivenAppreciations] = useState<Appreciation[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'feed');
  
  // Modal state
  const [showGiveModal, setShowGiveModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openEmployeeSelect, setOpenEmployeeSelect] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityType>('Public');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const { role } = useAuth();
  const isAdmin = role === 'Admin';
  const isManagerOrAdmin = role === 'Manager' || role === 'Admin';

  const fetchAppreciations = async () => {
    if (!employee?.id) return;
    
    setLoading(true);
    try {
      // Fetch public appreciations for feed
      const { data: publicData, error: publicError } = await supabase
        .from('hr_appreciations')
        .select(`
          *,
          from_employee:hr_employees!from_employee_id(full_name, employee_code),
          to_employee:hr_employees!to_employee_id(full_name, employee_code)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (publicError) throw publicError;
      setAppreciations(publicData || []);

      // Admin: Fetch ALL appreciations across teams
      if (isAdmin) {
        const { data: allData, error: allError } = await supabase
          .from('hr_appreciations')
          .select(`
            *,
            from_employee:hr_employees!from_employee_id(full_name, employee_code),
            to_employee:hr_employees!to_employee_id(full_name, employee_code)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (allError) throw allError;
        setAllAppreciations(allData || []);
      }
      
      // Fetch received appreciations
      const { data: receivedData, error: receivedError } = await supabase
        .from('hr_appreciations')
        .select(`
          *,
          from_employee:hr_employees!from_employee_id(full_name, employee_code)
        `)
        .eq('to_employee_id', employee.id)
        .order('created_at', { ascending: false });
      
      if (receivedError) throw receivedError;
      setReceivedAppreciations(receivedData || []);
      
      // Fetch given appreciations
      const { data: givenData, error: givenError } = await supabase
        .from('hr_appreciations')
        .select(`
          *,
          to_employee:hr_employees!to_employee_id(full_name, employee_code)
        `)
        .eq('from_employee_id', employee.id)
        .order('created_at', { ascending: false });
      
      if (givenError) throw givenError;
      setGivenAppreciations(givenData || []);
      
    } catch (err) {
      console.error('Error fetching appreciations:', err);
      toast({
        title: 'Error',
        description: 'Failed to load appreciations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!employee?.id) return;
    
    // For employees: only show other employees (not managers/admins)
    // For managers/admins: show all active employees
    let query = supabase
      .from('hr_employees')
      .select('id, full_name, employee_code, role, hr_employee_details(department)')
      .neq('id', employee.id)
      .eq('status', 'Active');

    // Employees can only appreciate other employees (peer-to-peer)
    if (role === 'Employee') {
      query = query.eq('role', 'Employee');
    }

    const { data, error } = await query.order('full_name');
    
    if (error) {
      console.error('Error fetching employees:', error);
      return;
    }
    
    setEmployees(data || []);
  };

  useEffect(() => {
    fetchAppreciations();
    fetchEmployees();
  }, [employee?.id]);

  const handleGiveAppreciation = async () => {
    if (!selectedEmployee || !selectedTag || message.length < 20) return;

    // For team visibility, require team selection
    if (isManagerOrAdmin && visibility === 'Team' && !selectedTeam) {
      toast({
        title: 'Please select a team',
        description: 'Team selection is required for team-only visibility',
        variant: 'destructive',
      });
      return;
    }
    
    setSubmitting(true);
    try {
      // Determine visibility settings
      let visibleToTeam = 'All';
      let finalIsPublic = true;

      if (isManagerOrAdmin) {
        if (visibility === 'Team') {
          visibleToTeam = selectedTeam;
          finalIsPublic = false;
        } else if (visibility === 'Private') {
          visibleToTeam = 'Private';
          finalIsPublic = false;
        }
      } else {
        // Regular employee: use simple public toggle
        finalIsPublic = isPublic;
        visibleToTeam = isPublic ? 'All' : 'Private';
      }

      const { error } = await supabase
        .from('hr_appreciations')
        .insert({
          from_employee_id: employee!.id,
          to_employee_id: selectedEmployee.id,
          message,
          tag: selectedTag,
          is_public: finalIsPublic,
          visible_to_team: visibleToTeam,
        });
      
      if (error) throw error;

      // Create notification for the recipient
      await supabase.from('hr_notifications').insert({
        employee_id: selectedEmployee.id,
        type: 'appreciation_received',
        title: 'You received an appreciation!',
        message: `${employee!.full_name} appreciated you for ${selectedTag}`,
        link: '/app/appreciations?tab=received',
      });

      // Send email notification
      sendAppreciationEmail(
        selectedEmployee.id,
        employee!.full_name,
        selectedTag,
        message
      );
      
      toast({
        title: 'Appreciation sent! 🎉',
        description: `You appreciated ${selectedEmployee.full_name}`,
      });
      
      setShowGiveModal(false);
      resetForm();
      fetchAppreciations();
      
    } catch (err: any) {
      console.error('Error giving appreciation:', err);
      toast({
        title: 'Failed to send appreciation',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hr_appreciations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({ title: 'Appreciation deleted' });
      fetchAppreciations();
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setSelectedTag('');
    setMessage('');
    setIsPublic(true);
    setVisibility('Public');
    setSelectedTeam('');
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const canDelete = (appreciation: Appreciation) => {
    if (appreciation.from_employee_id !== employee?.id) return false;
    const createdAt = new Date(appreciation.created_at);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return createdAt > fiveMinutesAgo;
  };

  const isFormValid = selectedEmployee && selectedTag && message.length >= 20 && message.length <= 500 &&
    (isManagerOrAdmin ? (visibility !== 'Team' || selectedTeam) : true);

  const renderAppreciationCard = (appreciation: Appreciation, type: 'feed' | 'received' | 'given') => {
    const tagConfig = TAG_CONFIG[appreciation.tag] || { bg: 'bg-gray-500', icon: <Star className="w-4 h-4" /> };
    
    return (
      <Card key={appreciation.id} className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {/* Sender Avatar */}
          {type !== 'given' && appreciation.from_employee && (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary-foreground">
                {getInitials(appreciation.from_employee.full_name)}
              </span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {type === 'feed' && (
                <>
                  <span className="font-semibold text-foreground">
                    {appreciation.from_employee?.full_name}
                  </span>
                  <span className="text-muted-foreground">appreciated</span>
                  <span className="font-semibold text-foreground">
                    {appreciation.to_employee?.full_name}
                  </span>
                </>
              )}
              {type === 'received' && (
                <span className="text-muted-foreground">
                  From <span className="font-semibold text-foreground">{appreciation.from_employee?.full_name}</span>
                </span>
              )}
              {type === 'given' && (
                <span className="text-muted-foreground">
                  To <span className="font-semibold text-foreground">{appreciation.to_employee?.full_name}</span>
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                • {formatDistanceToNow(new Date(appreciation.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {/* Tag Badge */}
            <Badge className={cn(tagConfig.bg, 'text-white mb-3 gap-1.5')}>
              {tagConfig.icon}
              {appreciation.tag}
            </Badge>
            
            {/* Message */}
            <p className="text-foreground leading-relaxed">{appreciation.message}</p>
            
            {/* Visibility indicator */}
            {appreciation.is_public && appreciation.visible_to_team === 'All' ? null : (
              <Badge variant="outline" className="mt-2 text-xs">
                {appreciation.visible_to_team === 'Private' ? 'Private' : 
                 appreciation.visible_to_team && appreciation.visible_to_team !== 'All' ? 
                 `${appreciation.visible_to_team} Team Only` : 'Private'}
              </Badge>
            )}
          </div>
          
          {/* Delete button */}
          {canDelete(appreciation) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => handleDelete(appreciation.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-12 w-80" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Appreciations</h1>
          <p className="text-muted-foreground">Recognize and celebrate your colleagues</p>
        </div>
        <Button 
          onClick={() => setShowGiveModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Heart className="w-4 h-4 mr-2" />
          Give Appreciation
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn("grid w-full max-w-md", isAdmin ? "grid-cols-4" : "grid-cols-3")}>
          <TabsTrigger value="feed" className="gap-2">
            <Users className="w-4 h-4" />
            Feed
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="all" className="gap-2">
              All ({allAppreciations.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="received" className="gap-2">
            Received ({receivedAppreciations.length})
          </TabsTrigger>
          <TabsTrigger value="given" className="gap-2">
            Given ({givenAppreciations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          {appreciations.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No appreciations yet</h3>
              <p className="text-muted-foreground">Be the first to appreciate someone!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {appreciations.map((a) => renderAppreciationCard(a, 'feed'))}
            </div>
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all" className="mt-6">
            {allAppreciations.length === 0 ? (
              <Card className="p-12 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No appreciations yet</h3>
                <p className="text-muted-foreground">No appreciations have been given yet.</p>
              </Card>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">
                  All appreciations across the organization ({allAppreciations.length} total)
                </p>
                <div className="space-y-4">
                  {allAppreciations.map((a) => renderAppreciationCard(a, 'feed'))}
                </div>
              </>
            )}
          </TabsContent>
        )}

        <TabsContent value="received" className="mt-6">
          {receivedAppreciations.length === 0 ? (
            <Card className="p-12 text-center">
              <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No appreciations received yet</h3>
              <p className="text-muted-foreground">Keep up the good work!</p>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">You've received {receivedAppreciations.length} appreciation{receivedAppreciations.length !== 1 ? 's' : ''}</p>
              <div className="space-y-4">
                {receivedAppreciations.map((a) => renderAppreciationCard(a, 'received'))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="given" className="mt-6">
          {givenAppreciations.length === 0 ? (
            <Card className="p-12 text-center">
              <HeartHandshake className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">You haven't given any appreciations yet</h3>
              <p className="text-muted-foreground">Recognize your colleagues today!</p>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">You've given {givenAppreciations.length} appreciation{givenAppreciations.length !== 1 ? 's' : ''}</p>
              <div className="space-y-4">
                {givenAppreciations.map((a) => renderAppreciationCard(a, 'given'))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Give Appreciation Modal */}
      <Dialog open={showGiveModal} onOpenChange={setShowGiveModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Give Appreciation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Employee Selector */}
            <div className="space-y-2">
              <Label>Select Colleague *</Label>
              <Popover open={openEmployeeSelect} onOpenChange={setOpenEmployeeSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEmployeeSelect}
                    className="w-full justify-between"
                  >
                    {selectedEmployee 
                      ? `${selectedEmployee.employee_code} - ${selectedEmployee.full_name}`
                      : "Search by name or employee code..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.employee_code} ${emp.full_name}`}
                            onSelect={() => {
                              setSelectedEmployee(emp);
                              setOpenEmployeeSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedEmployee?.id === emp.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {emp.employee_code} - {emp.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tag Selection */}
            <div className="space-y-2">
              <Label>Select Tag *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TAGS.map((tag) => {
                  const config = TAG_CONFIG[tag];
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(config.bg, "p-1.5 rounded text-white")}>
                          {config.icon}
                        </span>
                        <span className="font-medium text-sm text-foreground">{tag}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Your Message *</Label>
              <Textarea
                placeholder="Why are you appreciating this person? Share specific examples..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                rows={4}
                className={cn(
                  message.length > 0 && message.length < 20 && "border-destructive"
                )}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {message.length < 20 && message.length > 0 && (
                    <span className="text-destructive">Minimum 20 characters</span>
                  )}
                </span>
                <span className={message.length >= 500 ? "text-destructive" : ""}>
                  {message.length} / 500
                </span>
              </div>
            </div>

            {/* Visibility Section */}
            {isManagerOrAdmin ? (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label className="font-medium">Visibility</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['Public', 'Team', 'Private'] as VisibilityType[]).map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={visibility === option ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVisibility(option)}
                      >
                        {option === 'Public' && 'Public - Everyone'}
                        {option === 'Team' && 'Team Only'}
                        {option === 'Private' && 'Private'}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {visibility === 'Public' && 'Everyone in the company can see this appreciation'}
                    {visibility === 'Team' && 'Only members of the selected team can see this'}
                    {visibility === 'Private' && 'Only you and the recipient can see this'}
                  </p>
                </div>

                {visibility === 'Team' && (
                  <div className="space-y-2">
                    <Label>Select Team</Label>
                    <div className="flex flex-wrap gap-2">
                      {TEAMS.map((team) => (
                        <Button
                          key={team}
                          type="button"
                          variant={selectedTeam === team ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTeam(team)}
                        >
                          {team}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Regular Employee: Simple Public Toggle */
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label htmlFor="public-toggle" className="font-medium">Make it Public?</Label>
                  <p className="text-sm text-muted-foreground">Public appreciations inspire the whole team!</p>
                </div>
                <Switch
                  id="public-toggle"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGiveModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGiveAppreciation}
              disabled={!isFormValid || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 mr-2" />
                  Send Appreciation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppreciationsPage;
