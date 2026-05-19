import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const salaryHistory = [
  { id: 'sal-1', month: 'January 2024', gross: 8500, net: 6375, status: 'paid' },
  { id: 'sal-2', month: 'December 2023', gross: 8500, net: 6375, status: 'paid' },
  { id: 'sal-3', month: 'November 2023', gross: 8500, net: 6375, status: 'paid' },
  { id: 'sal-4', month: 'October 2023', gross: 8500, net: 6375, status: 'paid' },
  { id: 'sal-5', month: 'September 2023', gross: 8000, net: 6000, status: 'paid' },
];

const SalaryPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Salary</h1>
        <p className="text-muted-foreground">View your salary information and history</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard 
          title="Current Monthly Salary" 
          value="$8,500" 
          subtitle="Gross"
          icon={DollarSign}
        />
        <StatCard 
          title="Net Pay (Est.)" 
          value="$6,375" 
          subtitle="After deductions"
          icon={TrendingUp}
        />
        <StatCard 
          title="Next Pay Date" 
          value="Feb 28" 
          subtitle="2024"
          icon={Calendar}
        />
      </div>

      {/* Salary Breakdown */}
      <Card className="p-6 glass-card">
        <h2 className="font-semibold text-foreground mb-4">Current Salary Breakdown</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Earnings</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground">Base Salary</span>
                <span className="font-medium text-foreground">$8,000</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground">Bonus</span>
                <span className="font-medium text-foreground">$500</span>
              </div>
              <div className="flex justify-between py-2 font-semibold">
                <span className="text-foreground">Total Gross</span>
                <span className="text-primary">$8,500</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Deductions</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground">Federal Tax</span>
                <span className="font-medium text-foreground">-$1,275</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground">State Tax</span>
                <span className="font-medium text-foreground">-$425</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground">Health Insurance</span>
                <span className="font-medium text-foreground">-$250</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground">401(k)</span>
                <span className="font-medium text-foreground">-$175</span>
              </div>
              <div className="flex justify-between py-2 font-semibold">
                <span className="text-foreground">Net Pay</span>
                <span className="text-primary">$6,375</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Salary History */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Salary History</h2>
        </div>
        <div className="divide-y divide-border">
          {salaryHistory.map((record) => (
            <div key={record.id} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div>
                <p className="font-medium text-foreground">{record.month}</p>
                <p className="text-sm text-muted-foreground">
                  Gross: ${record.gross.toLocaleString()} • Net: ${record.net.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="status-badge status-present">Paid</span>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SalaryPage;
