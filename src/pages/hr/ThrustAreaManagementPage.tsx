import { useState } from 'react';
import { Layers, Plus, Pencil, ToggleLeft, ToggleRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useThrustAreas, useCreateThrustArea, useToggleThrustArea } from '@/hooks/useGoals';
import type { ThrustArea } from '@/types/goals';

const ThrustAreaManagementPage = () => {
  const { toast } = useToast();
  const { data: areas = [], isLoading } = useThrustAreas(false); // show all including inactive
  const createArea   = useCreateThrustArea();
  const toggleArea   = useToggleThrustArea();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', description: '' });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    try {
      await createArea.mutateAsync({ name: form.name.trim(), description: form.description.trim() || undefined });
      toast({ title: `✅ "${form.name}" thrust area created` });
      setShowForm(false);
      setForm({ name: '', description: '' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggle = async (area: ThrustArea) => {
    try {
      await toggleArea.mutateAsync({ id: area.id, is_active: !area.is_active });
      toast({ title: `${!area.is_active ? '✅ Activated' : '⏸ Deactivated'}: ${area.name}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const active   = areas.filter(a => a.is_active);
  const inactive = areas.filter(a => !a.is_active);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> Thrust Areas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define goal categories (Thrust Areas) employees can assign to their goals.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Thrust Area
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{active.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Active</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{inactive.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Inactive</p>
        </div>
      </div>

      {/* Area List */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-10">Loading…</p>
      ) : areas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border rounded-2xl bg-muted/30 text-center">
          <Layers className="w-10 h-10 text-muted-foreground" />
          <p className="font-semibold">No Thrust Areas Yet</p>
          <p className="text-sm text-muted-foreground">Add categories like "Sales", "Operations", "Quality" etc.</p>
          <Button onClick={() => setShowForm(true)} className="gap-2 mt-1">
            <Plus className="w-4 h-4" /> Add First Area
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map(area => (
            <div
              key={area.id}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                area.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'
              }`}
            >
              {/* Color dot */}
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${area.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{area.name}</p>
                {area.description && (
                  <p className="text-xs text-muted-foreground truncate">{area.description}</p>
                )}
              </div>

              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                area.is_active
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
                {area.is_active ? 'Active' : 'Inactive'}
              </span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleToggle(area)}
                disabled={toggleArea.isPending}
                title={area.is_active ? 'Deactivate' : 'Activate'}
              >
                {area.is_active
                  ? <ToggleRight className="w-5 h-5 text-green-600" />
                  : <ToggleLeft className="w-5 h-5 text-gray-400" />
                }
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Add Thrust Area
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="area-name">Area Name *</Label>
              <Input
                id="area-name"
                placeholder="e.g. Sales & Revenue"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area-desc">Description (optional)</Label>
              <Textarea
                id="area-desc"
                placeholder="Brief description of this thrust area…"
                rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setForm({ name: '', description: '' }); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createArea.isPending} className="gap-2">
              {createArea.isPending ? 'Saving…' : <><Check className="w-4 h-4" /> Save</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThrustAreaManagementPage;