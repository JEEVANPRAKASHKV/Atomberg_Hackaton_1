import { Card } from '@/components/ui/card';
import { EfficiencyDot } from '@/components/shared/EfficiencyDot';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatCard } from '@/components/shared/StatCard';
import { TrendingUp, Target, Calendar } from 'lucide-react';
import { getEfficiencyForEmployee, currentUser, employeeExpectations, getAverageEfficiency } from '@/data/mockData';
import { format } from 'date-fns';

const EfficiencyPage = () => {
  const efficiencyRecords = getEfficiencyForEmployee(currentUser.id);
  const employeeExpectation = employeeExpectations.find(e => e.employeeId === currentUser.id);
  const expectedEfficiency = employeeExpectation?.expectedEfficiency || 80;
  const averageEfficiency = getAverageEfficiency(currentUser.id);

  const todayRecord = efficiencyRecords[0];
  const weeklyRecords = efficiencyRecords.slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Efficiency</h1>
        <p className="text-muted-foreground">Track your work output and efficiency trends</p>
      </div>

      {/* Info Note */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> Efficiency is based on work output, not hours. 
          It measures your productivity and contribution to team goals.
        </p>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Today's Efficiency" 
          value={`${todayRecord?.efficiency || 0}%`}
          icon={TrendingUp}
          trend={todayRecord?.efficiency >= expectedEfficiency ? { value: 5, isPositive: true } : undefined}
        />
        <StatCard 
          title="Expected" 
          value={`${expectedEfficiency}%`}
          subtitle={`${employeeExpectation?.period || 'daily'}`}
          icon={Target}
        />
        <StatCard 
          title="Weekly Average" 
          value={`${averageEfficiency}%`}
          icon={Calendar}
          trend={averageEfficiency >= expectedEfficiency ? { value: 3, isPositive: true } : { value: 2, isPositive: false }}
        />
      </div>

      {/* Today's Progress */}
      <Card className="p-6 glass-card">
        <h2 className="font-semibold text-foreground mb-4">Today's Progress</h2>
        <ProgressBar 
          value={todayRecord?.efficiency || 0} 
          expected={expectedEfficiency}
        />
      </Card>

      {/* Last 7 Days */}
      <Card className="p-6 glass-card">
        <h2 className="font-semibold text-foreground mb-4">Last 7 Days</h2>
        <div className="flex items-center justify-center gap-4 py-4">
          {weeklyRecords.map((record) => (
            <div key={record.id} className="flex flex-col items-center gap-2">
              <EfficiencyDot 
                value={record.efficiency} 
                expected={expectedEfficiency}
                date={format(new Date(record.date), 'MMM d')}
              />
              <span className="text-xs text-muted-foreground">
                {format(new Date(record.date), 'EEE')}
              </span>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 pt-4 border-t border-border mt-4">
          <div className="flex items-center gap-2">
            <div className="efficiency-dot efficiency-high" />
            <span className="text-xs text-muted-foreground">On Target (≥{expectedEfficiency}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="efficiency-dot efficiency-medium" />
            <span className="text-xs text-muted-foreground">Close ({expectedEfficiency - 15}%-{expectedEfficiency - 1}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="efficiency-dot efficiency-low" />
            <span className="text-xs text-muted-foreground">Below (&lt;{expectedEfficiency - 15}%)</span>
          </div>
        </div>
      </Card>

      {/* Detailed History */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Efficiency History</h2>
        </div>
        <div className="divide-y divide-border">
          {efficiencyRecords.map((record) => (
            <div key={record.id} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <EfficiencyDot 
                  value={record.efficiency} 
                  expected={record.expected}
                  showTooltip={false}
                />
                <div>
                  <p className="font-medium text-foreground">
                    {format(new Date(record.date), 'EEEE, MMM d')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Actual</p>
                  <p className="font-semibold text-foreground">{record.efficiency}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Expected</p>
                  <p className="font-medium text-muted-foreground">{record.expected}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default EfficiencyPage;
