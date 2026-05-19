import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { 
  employees, 
  getDirectReports,
  teamExpectations,
  employeeExpectations,
  getAverageEfficiency,
  TeamExpectation,
  EmployeeExpectation
} from '@/data/mockData';
import { Target, Users, User, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const managerId = 'emp-002';

const ExpectationsPage = () => {
  const { toast } = useToast();
  const directReports = getDirectReports(managerId);
  
  const [localTeamExpectations, setLocalTeamExpectations] = useState<TeamExpectation[]>(teamExpectations);
  const [localEmployeeExpectations, setLocalEmployeeExpectations] = useState<EmployeeExpectation[]>(employeeExpectations);
  
  const [selectedTeam, setSelectedTeam] = useState<string>('team-eng');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  const currentTeamExp = localTeamExpectations.find(t => t.teamId === selectedTeam);
  const currentEmployeeExp = localEmployeeExpectations.find(e => e.employeeId === selectedEmployee);

  const handleTeamExpectationChange = (value: number[]) => {
    setLocalTeamExpectations(prev => 
      prev.map(t => t.teamId === selectedTeam ? { ...t, expectedEfficiency: value[0] } : t)
    );
  };

  const handleEmployeeExpectationChange = (value: number[]) => {
    if (!selectedEmployee) return;
    
    const existing = localEmployeeExpectations.find(e => e.employeeId === selectedEmployee);
    if (existing) {
      setLocalEmployeeExpectations(prev => 
        prev.map(e => e.employeeId === selectedEmployee ? { ...e, expectedEfficiency: value[0] } : e)
      );
    } else {
      const employee = employees.find(e => e.id === selectedEmployee);
      setLocalEmployeeExpectations(prev => [
        ...prev,
        {
          id: `emp-exp-new-${selectedEmployee}`,
          employeeId: selectedEmployee,
          employeeName: employee?.name || '',
          expectedEfficiency: value[0],
          period: 'daily',
        }
      ]);
    }
  };

  const handleSave = () => {
    toast({
      title: "Expectations Saved",
      description: "Team and individual expectations have been updated.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Expectations</h1>
          <p className="text-muted-foreground">Set efficiency expectations for your team</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> Expectations are for visibility and goal-setting only. 
          No penalties or automatic actions are triggered when expectations are not met.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Team Expectations */}
        <Card className="p-6 glass-card">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Team Expectations</h2>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Select Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team-eng">Engineering</SelectItem>
                  <SelectItem value="team-design">Design</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label>Expected Efficiency</Label>
                <span className="text-sm font-medium text-primary">
                  {currentTeamExp?.expectedEfficiency || 80}%
                </span>
              </div>
              <Slider
                value={[currentTeamExp?.expectedEfficiency || 80]}
                onValueChange={handleTeamExpectationChange}
                min={50}
                max={100}
                step={5}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <Label>Period</Label>
              <Select defaultValue="weekly">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Overview */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Current Team Average</h3>
              <ProgressBar 
                value={85} 
                expected={currentTeamExp?.expectedEfficiency || 80}
              />
            </div>
          </div>
        </Card>

        {/* Individual Expectations */}
        <Card className="p-6 glass-card">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Individual Expectations</h2>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Select Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {directReports.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEmployee && (
              <>
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Expected Efficiency</Label>
                    <span className="text-sm font-medium text-primary">
                      {currentEmployeeExp?.expectedEfficiency || 80}%
                    </span>
                  </div>
                  <Slider
                    value={[currentEmployeeExp?.expectedEfficiency || 80]}
                    onValueChange={handleEmployeeExpectationChange}
                    min={50}
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div>
                  <Label>Period</Label>
                  <Select defaultValue={currentEmployeeExp?.period || 'daily'}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Individual Overview */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">Current Performance</h3>
                  <ProgressBar 
                    value={getAverageEfficiency(selectedEmployee)} 
                    expected={currentEmployeeExp?.expectedEfficiency || 80}
                  />
                </div>
              </>
            )}

            {!selectedEmployee && (
              <div className="py-8 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select an employee to set individual expectations</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* All Employee Expectations */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">All Individual Expectations</h2>
        </div>
        <div className="divide-y divide-border">
          {directReports.map((emp) => {
            const expectation = localEmployeeExpectations.find(e => e.employeeId === emp.id);
            const actual = getAverageEfficiency(emp.id);
            return (
              <div key={emp.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{emp.avatar}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{emp.name}</p>
                    <p className="text-sm text-muted-foreground">{emp.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Expected</p>
                    <p className="font-semibold text-foreground">{expectation?.expectedEfficiency || 80}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Actual</p>
                    <p className={`font-semibold ${actual >= (expectation?.expectedEfficiency || 80) ? 'text-efficiency-high' : 'text-efficiency-low'}`}>
                      {actual}%
                    </p>
                  </div>
                  <div className="w-32">
                    <ProgressBar 
                      value={actual} 
                      expected={expectation?.expectedEfficiency || 80}
                      showLabels={false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default ExpectationsPage;
