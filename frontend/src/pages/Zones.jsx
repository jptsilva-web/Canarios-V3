import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Grid3X3,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { zonesApi, cagesApi, pairsApi } from '../lib/api';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const CageCell = ({ cage, pair, onClick }) => {
  const hasPair = !!pair;
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded border transition-all cursor-pointer p-2 min-w-[40px] min-h-[40px]',
        hasPair 
          ? 'bg-[#FFC300]/20 border-[#FFC300] text-[#FFC300] hover:bg-[#FFC300]/30' 
          : 'bg-[#151B2B] border-[#2A3548] hover:border-[#FFC300]/50 text-slate-400'
      )}
      data-testid={`cage-${cage.id}`}
      title={hasPair ? `Pair: ${pair.name || 'Unnamed'}` : `Cage ${cage.label} - Empty`}
    >
      <div className="text-center">
        <p className={cn(
          'text-sm font-bold font-mono',
          hasPair ? 'text-[#FFC300]' : 'text-slate-400'
        )}>
          {cage.label}
        </p>
        {hasPair && (
          <p className="text-[10px] text-[#FFC300]/70 truncate max-w-[50px]">
            {pair.name || 'Pair'}
          </p>
        )}
      </div>
    </div>
  );
};

const ZoneCard = ({ zone, cages, pairs, onDelete, onRefresh, onCageClick }) => {
  const [generating, setGenerating] = useState(false);
  
  const zoneCages = cages.filter(c => c.zone_id === zone.id);
  const gridCols = zone.columns;
  const pairedCagesCount = zoneCages.filter(c => pairs.find(p => p.cage_id === c.id)).length;

  const handleGenerateCages = async () => {
    setGenerating(true);
    try {
      await zonesApi.generateCages(zone.id);
      toast.success(`Generated ${zone.rows * zone.columns} cages`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to generate cages');
    } finally {
      setGenerating(false);
    }
  };

  const getCagePair = (cageId) => {
    return pairs.find(p => p.cage_id === cageId);
  };

  return (
    <Card className="bg-[#202940] border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg text-white font-['Barlow_Condensed']">
            {zone.name}
          </CardTitle>
          <p className="text-sm text-slate-400">
            {zone.rows} rows × {zone.columns} columns ({zoneCages.length} cages) • 
            <span className="text-[#FFC300] ml-1">{pairedCagesCount} paired</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateCages}
            disabled={generating}
            className="text-slate-400 hover:text-[#FFC300]"
            data-testid={`regenerate-cages-${zone.id}`}
          >
            <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(zone)}
            className="text-slate-400 hover:text-[#E91E63]"
            data-testid={`delete-zone-${zone.id}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="bg-[#151B2B] rounded-lg p-4 mx-4 mb-4">
        {zoneCages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No cages generated yet</p>
            <Button
              onClick={handleGenerateCages}
              disabled={generating}
              variant="outline"
              className="border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
              data-testid={`generate-cages-${zone.id}`}
            >
              <RefreshCw size={16} className={cn("mr-2", generating && "animate-spin")} />
              Generate Cages
            </Button>
          </div>
        ) : (
          <div 
            className="grid gap-1 overflow-x-auto"
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(40px, 1fr))` }}
          >
            {zoneCages
              .sort((a, b) => (a.row - b.row) || (a.column - b.column))
              .map((cage) => {
                const pair = getCagePair(cage.id);
                return (
                  <CageCell 
                    key={cage.id} 
                    cage={cage} 
                    pair={pair}
                    onClick={() => onCageClick(cage, pair)}
                  />
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const Zones = () => {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [cages, setCages] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    rows: 4,
    columns: 4,
  });

  const fetchData = async () => {
    try {
      const [zonesRes, cagesRes, pairsRes] = await Promise.all([
        zonesApi.getAll(),
        cagesApi.getAll(),
        pairsApi.getAll(),
      ]);
      setZones(zonesRes.data);
      setCages(cagesRes.data);
      setPairs(pairsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newZone = await zonesApi.create(formData);
      toast.success('Zone created');
      // Auto-generate cages
      await zonesApi.generateCages(newZone.data.id);
      toast.success(`Generated ${formData.rows * formData.columns} cages`);
      setDialogOpen(false);
      setFormData({ name: '', rows: 4, columns: 4 });
      fetchData();
    } catch (error) {
      toast.error('Failed to create zone');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await zonesApi.delete(deleteDialog.id);
      toast.success('Zone deleted');
      setDeleteDialog(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete zone');
    }
  };

  const handleCageClick = (cage, pair) => {
    if (pair) {
      // Navigate to pairs page if cage has a pair
      navigate('/pairs');
      toast.info(`Navigating to Pair: ${pair.name || 'Unnamed'}`);
    } else {
      // Navigate to pairs page to create a new pair for this cage
      toast.info(`Cage ${cage.label} is empty. Go to Pairs to assign a pair.`);
      navigate('/pairs');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="zones-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Zones & Cages
          </h1>
          <p className="text-slate-400 mt-1">
            Configure your aviary layout
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-zone-btn"
            >
              <Plus size={20} className="mr-2" /> Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                Add New Zone
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">Zone Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Module 1"
                  className="bg-[#1A2035] border-white/10 text-white"
                  required
                  data-testid="zone-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Rows (max 7)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    value={formData.rows}
                    onChange={(e) => setFormData({ ...formData, rows: Math.min(7, parseInt(e.target.value) || 1) })}
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="zone-rows-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Columns (max 50)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.columns}
                    onChange={(e) => setFormData({ ...formData, columns: Math.min(50, parseInt(e.target.value) || 1) })}
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="zone-columns-input"
                  />
                </div>
              </div>
              <p className="text-sm text-slate-400">
                This will create {formData.rows * formData.columns} cages
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                  data-testid="save-zone-btn"
                >
                  Create Zone
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Zones Grid */}
      {zones.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Grid3X3 className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">No Zones Yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              Create zones to represent different areas or modules in your aviary. Each zone contains a grid of cages.
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> Create Your First Zone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              cages={cages}
              pairs={pairs}
              onDelete={setDeleteDialog}
              onRefresh={fetchData}
              onCageClick={handleCageClick}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Zone?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete this zone and all its cages. Pairs assigned to these cages will 
              need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-zone"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
