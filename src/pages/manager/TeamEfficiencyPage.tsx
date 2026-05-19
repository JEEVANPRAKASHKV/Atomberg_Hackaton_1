import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  employees, 
  getDirectReports,
  getAverageEfficiency,
} from '@/data/mockData';
import { cn } from '@/lib/utils';

const managerId = 'emp-002';

const TeamEfficiencyPage = () => {
  const [filter, setFilter] = useState<'team' | 'individual'>('team');
  const directReports = getDirectReports(managerId);

  // Group by department for team view
  const departments = ['Engineering', 'Design'];
  
  const getTeamEfficiency = (dept: string) => {
    const teamMembers = employees.filter(e => e.department === dept);
    if (teamMembers.length === 0) return 0;
    const sum = teamMembers.reduce((acc, member) => acc + getAverageEfficiency(member.id), 0);
    return Math.round(sum / teamMembers.length);
  };

  const getEfficiencyColor = (value: number) => {
    if (value >= 85) return 'bg-efficiency-high';
    if (value >= 70) return 'bg-efficiency-medium';
    return 'bg-efficiency-low';
  };

  const getEfficiencyTextColor = (value: number) => {
    if (value >= 85) return 'text-efficiency-high';
    if (value >= 70) return 'text-efficiency-medium';
    return 'text-efficiency-low';
  };

  // Generate weekly data for heatmap
  const generateWeeklyData = (baseEfficiency: number) => {
    return Array.from({ length: 5 }, () => {
      const variance = Math.random() * 20 - 10;
      return Math.round(Math.max(50, Math.min(100, baseEfficiency + variance)));
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Team Efficiency</h1>
          <p className="text-muted-foreground">Visual overview of team performance</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as 'team' | 'individual')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="team">By Team</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-efficiency-high" />
          <span className="text-sm text-muted-foreground">≥85% (On Target)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-efficiency-medium" />
          <span className="text-sm text-muted-foreground">70-84% (Close)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-efficiency-low" />
          <span className="text-sm text-muted-foreground">&lt;70% (Below)</span>
        </div>
      </div>

      {filter === 'team' ? (
        // Team View
        <div className="grid md:grid-cols-2 gap-6">
          {departments.map((dept) => {
            const teamEff = getTeamEfficiency(dept);
            const weeklyData = generateWeeklyData(teamEff);
            const teamMembers = employees.filter(e => e.department === dept);
            
            return (
              <Card key={dept} className="p-6 glass-card">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-semibold text-foreground">{dept}</h2>
                    <p className="text-sm text-muted-foreground">{teamMembers.length} members</p>
                  </div>
                  <div className={cn('text-3xl font-bold', getEfficiencyTextColor(teamEff))}>
                    {teamEff}%
                  </div>
                </div>

                {/* Weekly Heatmap */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">This Week</p>
                  <div className="flex gap-2">
                    {weeklyData.map((val, i) => (
                      <div
                        key={i}
                        className={cn('flex-1 h-10 rounded-lg flex items-center justify-center text-xs font-medium text-foreground', getEfficiencyColor(val))}
                        style={{ opacity: 0.7 + (val / 400) }}
                      >
                        {val}%
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                      <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-2">
                  {teamMembers.slice(0, 4).map((member) => {
                    const eff = getAverageEfficiency(member.id);
                    return (
                      <div key={member.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', getEfficiencyColor(eff))} />
                          <span className="text-sm text-foreground">{member.name}</span>
                        </div>
                        <span className={cn('text-sm font-medium', getEfficiencyTextColor(eff))}>
                          {eff}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        // Individual View
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Individual Efficiency Heatmap</h2>
          </div>
          <div className="p-4">
            <div className="grid gap-4">
              {/* Header Row */}
              <div className="grid grid-cols-7 gap-2">
                <div className="col-span-2"></div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Data Rows */}
              {directReports.map((member) => {
                const weeklyData = generateWeeklyData(getAverageEfficiency(member.id));
                return (
                  <div key={member.id} className="grid grid-cols-7 gap-2 items-center">
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">{member.avatar}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                    </div>
                    {weeklyData.map((val, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all hover:scale-105 cursor-default',
                          getEfficiencyColor(val),
                          'text-foreground'
                        )}
                        title={`${val}%`}
                      >
                        {val}%
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TeamEfficiencyPage;
