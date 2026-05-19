import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  Calendar, 
  Building2,
  Save,
  Info,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LEAVE_TYPES } from '@/lib/leaveTypes';

const SettingsPage = () => {
  const { toast } = useToast();
  const [carryingForward, setCarryingForward] = useState(false);
  
  const [attendanceSettings, setAttendanceSettings] = useState({
    workStartTime: '09:00',
    workEndTime: '18:00',
    graceMinutes: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    weekends: ['saturday', 'sunday'],
  });

  const [leaveSettings, setLeaveSettings] = useState({
    casualLeaveQuota: 6,
    sickLeaveQuota: 6,
    earnedLeaveQuota: 18,
    menstruationLeaveQuota: 12,
    specialLeaveQuota: 1,
    earnedLeaveCarryForwardLimit: 30,
    requireApproval: true,
  });

  const [companySettings, setCompanySettings] = useState({
    companyName: 'Atomberg',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
  });

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your changes have been saved successfully.',
    });
  };

  const handleCarryForwardEL = async () => {
    setCarryingForward(true);
    try {
      const { error } = await supabase.rpc('carry_forward_earned_leaves');
      
      if (error) throw error;
      
      toast({
        title: 'Carry Forward Complete',
        description: 'Earned Leave balances have been carried forward successfully (max 30 days).',
      });
    } catch (error) {
      console.error('Error carrying forward EL:', error);
      toast({
        title: 'Error',
        description: 'Failed to carry forward earned leaves. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCarryingForward(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure HR policies and system preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="leave" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Leave Policy
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company
          </TabsTrigger>
        </TabsList>

        {/* Attendance Settings */}
        <TabsContent value="attendance">
          <Card className="p-6 glass-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Attendance Policy
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Work Start Time</Label>
                  <Input 
                    type="time" 
                    value={attendanceSettings.workStartTime}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, workStartTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work End Time</Label>
                  <Input 
                    type="time" 
                    value={attendanceSettings.workEndTime}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, workEndTime: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Grace Period (minutes)</Label>
                  <Input 
                    type="number" 
                    value={attendanceSettings.graceMinutes}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, graceMinutes: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Late arrival tolerance</p>
                </div>
                <div className="space-y-2">
                  <Label>Half Day Hours</Label>
                  <Input 
                    type="number" 
                    value={attendanceSettings.halfDayHours}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, halfDayHours: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Day Hours</Label>
                  <Input 
                    type="number" 
                    value={attendanceSettings.fullDayHours}
                    onChange={(e) => setAttendanceSettings({ ...attendanceSettings, fullDayHours: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Leave Settings */}
        <TabsContent value="leave">
          <div className="space-y-6">
            <Card className="p-6 glass-card">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Leave Policy
              </h3>
              
              {/* Leave Types Reference */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-foreground mb-3">Leave Types Overview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <TooltipProvider>
                    {LEAVE_TYPES.map((type) => (
                      <div key={type.value} className="flex items-start gap-2 p-2 bg-background rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                          {type.genderRestriction && (
                            <p className="text-xs text-primary mt-1">({type.genderRestriction} only)</p>
                          )}
                        </div>
                        {type.carryForward && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Carries forward up to {type.maxCarryForward} days</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Casual Leave Quota</Label>
                    <Input 
                      type="number" 
                      value={leaveSettings.casualLeaveQuota}
                      onChange={(e) => setLeaveSettings({ ...leaveSettings, casualLeaveQuota: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Days per year (non-carry forward)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Sick Leave Quota</Label>
                    <Input 
                      type="number" 
                      value={leaveSettings.sickLeaveQuota}
                      onChange={(e) => setLeaveSettings({ ...leaveSettings, sickLeaveQuota: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Days per year (non-carry forward)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Earned Leave Quota
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>1.5 days accrued per month</p>
                            <p>Carries forward to max 30 days</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input 
                      type="number" 
                      value={leaveSettings.earnedLeaveQuota}
                      onChange={(e) => setLeaveSettings({ ...leaveSettings, earnedLeaveQuota: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Days per year (carries forward)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Menstruation Leave Quota</Label>
                    <Input 
                      type="number" 
                      value={leaveSettings.menstruationLeaveQuota}
                      onChange={(e) => setLeaveSettings({ ...leaveSettings, menstruationLeaveQuota: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Days per year (female employees)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Special Leave Quota</Label>
                    <Input 
                      type="number" 
                      value={leaveSettings.specialLeaveQuota}
                      onChange={(e) => setLeaveSettings({ ...leaveSettings, specialLeaveQuota: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Days per year (birthday/occasion)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      EL Carry Forward Limit
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Maximum earned leave days that can be accumulated</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input 
                      type="number" 
                      value={leaveSettings.earnedLeaveCarryForwardLimit}
                      onChange={(e) => setLeaveSettings({ ...leaveSettings, earnedLeaveCarryForwardLimit: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Max days (default: 30)</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Require Manager Approval</p>
                    <p className="text-sm text-muted-foreground">Leave requests need manager approval before HR</p>
                  </div>
                  <Switch 
                    checked={leaveSettings.requireApproval}
                    onCheckedChange={(checked) => setLeaveSettings({ ...leaveSettings, requireApproval: checked })}
                  />
                </div>
              </div>
            </Card>

            {/* Year-End Carry Forward */}
            <Card className="p-6 glass-card">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Year-End Operations
              </h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-foreground">Carry Forward Earned Leaves</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Process year-end carry forward for all employees. Unused Earned Leave will be carried forward to the next year, up to a maximum of 30 days.
                    </p>
                    <div className="mt-3 p-3 bg-background rounded border border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>How it works:</strong>
                      </p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                        <li>Only Earned Leave (EL) carries forward</li>
                        <li>Maximum carry forward: 30 days</li>
                        <li>Casual Leave, Sick Leave, and other types reset to their annual quota</li>
                        <li>Run this at the end of the year or beginning of new year</li>
                      </ul>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCarryForwardEL}
                    disabled={carryingForward}
                    variant="outline"
                    className="shrink-0"
                  >
                    {carryingForward ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Carry Forward EL
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card className="p-6 glass-card">
            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={companySettings.companyName}
                  onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={companySettings.timezone} onValueChange={(v) => setCompanySettings({ ...companySettings, timezone: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={companySettings.dateFormat} onValueChange={(v) => setCompanySettings({ ...companySettings, dateFormat: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={companySettings.currency} onValueChange={(v) => setCompanySettings({ ...companySettings, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
