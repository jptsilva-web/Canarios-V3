import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Heart, 
  Egg,
  Bird,
  Calendar,
  Edit,
  Trash2,
  ChevronRight,
  Play,
  CheckCircle2,
  X
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { pairsApi, cagesApi, birdsApi, clutchesApi, zonesApi } from '../lib/api';
import { cn, formatDate, getStatusColor } from '../lib/utils';
import { toast } from 'sonner';

// Egg Status Component with click to change status
const EggIcon = ({ egg, index, clutchId, clutchStatus, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [bandNumber, setBandNumber] = useState(egg.band_number || '');
  const [updating, setUpdating] = useState(false);

  const canChangeStatus = clutchStatus === 'incubating' || clutchStatus === 'hatching';
  
  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const updateData = { status: newStatus };
      
      if (newStatus === 'hatched') {
        updateData.hatched_date = new Date().toISOString().split('T')[0];
        if (bandNumber) {
          updateData.band_number = bandNumber;
          updateData.banded_date = new Date().toISOString().split('T')[0];
        }
      }
      
      await clutchesApi.updateEgg(clutchId, egg.id, updateData);
      toast.success(`Egg ${index + 1} marked as ${newStatus}`);
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update egg status');
    } finally {
      setUpdating(false);
    }
  };

  const handleBand = async () => {
    if (!bandNumber.trim()) {
      toast.error('Please enter a band/ring number');
      return;
    }
    
    setUpdating(true);
    try {
      await clutchesApi.updateEgg(clutchId, egg.id, {
        status: 'hatched',
        band_number: bandNumber,
        banded_date: new Date().toISOString().split('T')[0],
      });
      toast.success(`Egg ${index + 1} banded with ${bandNumber}`);
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to band egg');
    } finally {
      setUpdating(false);
    }
  };

  // Render hatched egg as a bird icon with band number displayed
  if (egg.status === 'hatched') {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex flex-col items-center gap-0.5 group"
            title={`Chick ${index + 1}: ${egg.band_number || 'Not banded'}`}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#00BFA6] text-white group-hover:bg-[#00BFA6]/80 transition-colors relative">
              <Bird size={20} />
            </div>
            {egg.band_number ? (
              <span className="text-[9px] font-mono font-bold text-[#FFC300] bg-[#1A2035] px-1.5 py-0.5 rounded border border-[#FFC300]/30 max-w-[60px] truncate">
                {egg.band_number}
              </span>
            ) : (
              <span className="text-[8px] text-slate-500 italic">no ring</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 bg-[#202940] border-white/10 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium">Chick {index + 1}</span>
              <span className="text-xs bg-[#00BFA6]/20 text-[#00BFA6] px-2 py-0.5 rounded">Hatched</span>
            </div>
            
            {egg.band_number ? (
              <div className="p-2 bg-[#1A2035] rounded">
                <p className="text-xs text-slate-400">Ring Number</p>
                <p className="text-[#FFC300] font-mono font-bold">{egg.band_number}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-slate-300 text-xs">Add Ring Number</Label>
                <Input
                  value={bandNumber}
                  onChange={(e) => setBandNumber(e.target.value)}
                  placeholder="e.g., PT2025-001"
                  className="bg-[#1A2035] border-white/10 text-white text-sm h-8"
                />
                <Button
                  size="sm"
                  onClick={handleBand}
                  disabled={updating}
                  className="w-full bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                >
                  Band Chick
                </Button>
              </div>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('dead')}
              disabled={updating}
              className="w-full border-[#E91E63]/50 text-[#E91E63] hover:bg-[#E91E63]/10"
            >
              Mark as Dead
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Render dead egg/chick
  if (egg.status === 'dead') {
    return (
      <div
        className="w-8 h-10 rounded-full flex items-center justify-center bg-slate-700 text-slate-400 opacity-50"
        style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
        title={`Egg ${index + 1}: Dead`}
      >
        <X size={14} />
      </div>
    );
  }

  // Render egg (fresh, fertile, infertile)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-8 h-10 flex items-center justify-center text-xs font-bold transition-all hover:scale-110',
            egg.status === 'fresh' && 'bg-white text-slate-700',
            egg.status === 'fertile' && 'bg-[#00BFA6] text-white',
            egg.status === 'infertile' && 'bg-[#E91E63] text-white',
          )}
          style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
          title={`Egg ${index + 1}: ${egg.status} - Click to change`}
          disabled={!canChangeStatus}
        >
          {index + 1}
        </button>
      </PopoverTrigger>
      {canChangeStatus && (
        <PopoverContent className="w-56 bg-[#202940] border-white/10 p-2">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 px-2 py-1">Egg {index + 1} Status</p>
            
            <button
              onClick={() => handleStatusChange('fertile')}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#00BFA6]/20 transition-colors"
            >
              <div className="w-4 h-5 bg-[#00BFA6] rounded-full" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
              <span className="text-sm text-white">Fertile</span>
              <span className="text-xs text-[#00BFA6] ml-auto">Green</span>
            </button>
            
            <button
              onClick={() => handleStatusChange('infertile')}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#E91E63]/20 transition-colors"
            >
              <div className="w-4 h-5 bg-[#E91E63] rounded-full" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
              <span className="text-sm text-white">Infertile</span>
              <span className="text-xs text-[#E91E63] ml-auto">Red</span>
            </button>
            
            {clutchStatus === 'hatching' && egg.status === 'fertile' && (
              <>
                <hr className="border-white/10 my-1" />
                <div className="px-2 py-1">
                  <Label className="text-slate-300 text-xs">Ring Number (optional)</Label>
                  <Input
                    value={bandNumber}
                    onChange={(e) => setBandNumber(e.target.value)}
                    placeholder="e.g., PT2025-001"
                    className="bg-[#1A2035] border-white/10 text-white text-sm h-8 mt-1"
                  />
                </div>
                <button
                  onClick={() => handleStatusChange('hatched')}
                  disabled={updating}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#00BFA6]/20 transition-colors"
                >
                  <Bird size={16} className="text-[#00BFA6]" />
                  <span className="text-sm text-white">Hatched (Born Alive)</span>
                </button>
              </>
            )}
            
            <hr className="border-white/10 my-1" />
            
            <button
              onClick={() => handleStatusChange('dead')}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-slate-700/50 transition-colors"
            >
              <X size={16} className="text-slate-400" />
              <span className="text-sm text-slate-400">Dead/Remove</span>
            </button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

const ClutchCard = ({ clutch, onUpdate, onDelete, onAddEgg }) => {
  const [updating, setUpdating] = useState(false);

  const handleStartIncubation = async () => {
    setUpdating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await clutchesApi.update(clutch.id, {
        status: 'incubating',
        incubation_start: today,
      });
      toast.success('Incubation started');
      onUpdate();
    } catch (error) {
      toast.error('Failed to start incubation');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkHatching = async () => {
    setUpdating(true);
    try {
      await clutchesApi.update(clutch.id, { status: 'hatching' });
      toast.success('Marked as hatching');
      onUpdate();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    setUpdating(true);
    try {
      await clutchesApi.update(clutch.id, { status: 'completed' });
      toast.success('Clutch completed');
      onUpdate();
    } catch (error) {
      toast.error('Failed to complete clutch');
    } finally {
      setUpdating(false);
    }
  };

  // Count eggs by status
  const eggCounts = {
    total: clutch.eggs?.length || 0,
    fertile: clutch.eggs?.filter(e => e.status === 'fertile').length || 0,
    infertile: clutch.eggs?.filter(e => e.status === 'infertile').length || 0,
    hatched: clutch.eggs?.filter(e => e.status === 'hatched').length || 0,
    dead: clutch.eggs?.filter(e => e.status === 'dead').length || 0,
  };

  return (
    <div className="p-4 rounded-lg bg-[#1A2035] border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('status-badge text-xs', getStatusColor(clutch.status))}>
            {clutch.status}
          </span>
          <span className="text-xs text-slate-500">
            Started {formatDate(clutch.start_date)}
          </span>
        </div>
        <button 
          onClick={() => onDelete(clutch.id)}
          className="text-slate-500 hover:text-[#E91E63] transition-colors"
          data-testid={`delete-clutch-${clutch.id}`}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Egg Status Legend */}
      {(clutch.status === 'incubating' || clutch.status === 'hatching') && clutch.eggs?.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-slate-400">Click eggs to change status:</span>
          <span className="text-[#00BFA6]">● Fertile</span>
          <span className="text-[#E91E63]">● Infertile</span>
          {clutch.status === 'hatching' && <span className="text-[#00BFA6]">🐤 Hatched</span>}
        </div>
      )}

      {/* Eggs */}
      <div className="flex flex-wrap gap-3 items-start pb-2">
        {clutch.eggs?.map((egg, index) => (
          <EggIcon
            key={egg.id}
            egg={egg}
            index={index}
            clutchId={clutch.id}
            clutchStatus={clutch.status}
            onUpdate={onUpdate}
          />
        ))}
        {clutch.status === 'laying' && (
          <button
            onClick={() => onAddEgg(clutch.id)}
            className="w-8 h-10 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center text-slate-500 hover:border-[#FFC300] hover:text-[#FFC300] transition-colors"
            style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
            data-testid={`add-egg-${clutch.id}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Egg Summary */}
      {clutch.eggs?.length > 0 && (clutch.status === 'incubating' || clutch.status === 'hatching' || clutch.status === 'completed') && (
        <div className="flex gap-3 text-xs">
          {eggCounts.fertile > 0 && (
            <span className="text-[#00BFA6]">{eggCounts.fertile} fertile</span>
          )}
          {eggCounts.infertile > 0 && (
            <span className="text-[#E91E63]">{eggCounts.infertile} infertile</span>
          )}
          {eggCounts.hatched > 0 && (
            <span className="text-[#00BFA6]">{eggCounts.hatched} hatched</span>
          )}
          {eggCounts.dead > 0 && (
            <span className="text-slate-500">{eggCounts.dead} dead</span>
          )}
        </div>
      )}

      {/* Dates */}
      {clutch.expected_hatch_date && (
        <div className="text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Expected Hatch:</span>
            <span className="text-[#00BFA6]">{formatDate(clutch.expected_hatch_date)}</span>
          </div>
          {clutch.expected_band_date && (
            <div className="flex justify-between">
              <span>Expected Band:</span>
              <span className="text-[#E91E63]">{formatDate(clutch.expected_band_date)}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {clutch.status === 'laying' && (
          <Button
            size="sm"
            onClick={handleStartIncubation}
            disabled={updating || clutch.eggs?.length === 0}
            className="flex-1 bg-[#FF9800] hover:bg-[#FF9800]/90 text-white"
            data-testid={`start-incubation-${clutch.id}`}
          >
            <Play size={14} className="mr-1" /> Start Incubation
          </Button>
        )}
        {clutch.status === 'incubating' && (
          <Button
            size="sm"
            onClick={handleMarkHatching}
            disabled={updating}
            className="flex-1 bg-[#00BFA6] hover:bg-[#00BFA6]/90 text-white"
            data-testid={`mark-hatching-${clutch.id}`}
          >
            <Egg size={14} className="mr-1" /> Mark Hatching
          </Button>
        )}
        {(clutch.status === 'hatching' || clutch.status === 'weaning') && (
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={updating}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
            data-testid={`complete-clutch-${clutch.id}`}
          >
            <CheckCircle2 size={14} className="mr-1" /> Complete
          </Button>
        )}
      </div>
    </div>
  );
};

const PairCard = ({ pair, cages, birds, onEdit, onDelete, onRefresh }) => {
  const [clutches, setClutches] = useState([]);
  const [showClutches, setShowClutches] = useState(false);
  const [loading, setLoading] = useState(false);

  const cage = cages.find(c => c.id === pair.cage_id);
  const male = birds.find(b => b.id === pair.male_id);
  const female = birds.find(b => b.id === pair.female_id);

  const fetchClutches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clutchesApi.getAll(pair.id);
      setClutches(res.data);
    } catch (error) {
      console.error('Error fetching clutches:', error);
    } finally {
      setLoading(false);
    }
  }, [pair.id]);

  useEffect(() => {
    if (showClutches) {
      fetchClutches();
    }
  }, [showClutches, fetchClutches]);

  const handleAddClutch = async () => {
    try {
      await clutchesApi.create({ pair_id: pair.id });
      toast.success('New clutch added');
      fetchClutches();
    } catch (error) {
      toast.error('Failed to add clutch');
    }
  };

  const handleDeleteClutch = async (clutchId) => {
    try {
      await clutchesApi.delete(clutchId);
      toast.success('Clutch deleted');
      fetchClutches();
    } catch (error) {
      toast.error('Failed to delete clutch');
    }
  };

  const handleAddEgg = async (clutchId) => {
    try {
      await clutchesApi.addEgg(clutchId, {});
      toast.success('Egg added');
      fetchClutches();
    } catch (error) {
      toast.error('Failed to add egg');
    }
  };

  const activeClutch = clutches.find(c => c.status !== 'completed');

  return (
    <Card className="bg-[#202940] border-white/5 hover:border-[#FFC300]/30 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-white font-['Barlow_Condensed']">
              {pair.name || `Pair ${pair.id.slice(0, 6)}`}
            </CardTitle>
            <p className="text-sm text-slate-400 font-mono">
              {cage?.label || 'No cage'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(pair)}
              className="p-2 rounded-lg text-slate-400 hover:text-[#FFC300] hover:bg-[#FFC300]/10 transition-colors"
              data-testid={`edit-pair-${pair.id}`}
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(pair)}
              className="p-2 rounded-lg text-slate-400 hover:text-[#E91E63] hover:bg-[#E91E63]/10 transition-colors"
              data-testid={`delete-pair-${pair.id}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Birds */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-[#1A2035] border border-white/5">
            <p className="text-xs text-[#00BFA6] uppercase tracking-wider font-['Barlow_Condensed'] mb-1">Male</p>
            {male ? (
              <>
                <p className="text-white font-mono text-sm">{male.band_number}</p>
                <p className="text-xs text-slate-400">{male.stam || male.color || 'No STAM'}</p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">Not assigned</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[#1A2035] border border-white/5">
            <p className="text-xs text-[#FF69B4] uppercase tracking-wider font-['Barlow_Condensed'] mb-1">Female</p>
            {female ? (
              <>
                <p className="text-white font-mono text-sm">{female.band_number}</p>
                <p className="text-xs text-slate-400">{female.stam || female.color || 'No STAM'}</p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">Not assigned</p>
            )}
          </div>
        </div>

        {/* Status */}
        {activeClutch && (
          <div className="flex items-center gap-2 text-sm">
            <span className={cn('status-badge', getStatusColor(activeClutch.status))}>
              {activeClutch.status}
            </span>
            <span className="text-slate-400">
              {activeClutch.eggs?.length || 0} eggs
            </span>
          </div>
        )}

        {/* Clutches Toggle */}
        <button
          onClick={() => setShowClutches(!showClutches)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#1A2035] hover:bg-[#1A2035]/80 transition-colors"
          data-testid={`toggle-clutches-${pair.id}`}
        >
          <span className="text-sm text-slate-300">
            Clutches ({clutches.length})
          </span>
          <ChevronRight 
            size={16} 
            className={cn(
              "text-slate-400 transition-transform",
              showClutches && "rotate-90"
            )}
          />
        </button>

        {/* Clutches List */}
        {showClutches && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#FFC300] mx-auto" />
              </div>
            ) : (
              <>
                {clutches.map((clutch) => (
                  <ClutchCard
                    key={clutch.id}
                    clutch={clutch}
                    onUpdate={fetchClutches}
                    onDelete={handleDeleteClutch}
                    onAddEgg={handleAddEgg}
                  />
                ))}
                <Button
                  onClick={handleAddClutch}
                  variant="outline"
                  className="w-full border-dashed border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
                  data-testid={`add-clutch-${pair.id}`}
                >
                  <Plus size={16} className="mr-2" /> Add New Clutch
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const Pairs = () => {
  const [pairs, setPairs] = useState([]);
  const [cages, setCages] = useState([]);
  const [birds, setBirds] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingPair, setEditingPair] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    cage_id: '',
    male_id: '',
    female_id: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [pairsRes, cagesRes, birdsRes, zonesRes] = await Promise.all([
        pairsApi.getAll(),
        cagesApi.getAll(),
        birdsApi.getAll(),
        zonesApi.getAll(),
      ]);
      setPairs(pairsRes.data);
      setCages(cagesRes.data);
      setBirds(birdsRes.data);
      setZones(zonesRes.data);
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
      if (editingPair) {
        await pairsApi.update(editingPair.id, formData);
        toast.success('Pair updated');
      } else {
        await pairsApi.create(formData);
        toast.success('Pair created');
      }
      setDialogOpen(false);
      setEditingPair(null);
      setFormData({ name: '', cage_id: '', male_id: '', female_id: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save pair');
    }
  };

  const handleEdit = (pair) => {
    setEditingPair(pair);
    setFormData({
      name: pair.name || '',
      cage_id: pair.cage_id || '',
      male_id: pair.male_id || '',
      female_id: pair.female_id || '',
      notes: pair.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await pairsApi.delete(deleteDialog.id);
      toast.success('Pair deleted');
      setDeleteDialog(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete pair');
    }
  };

  const males = birds.filter(b => b.gender === 'male');
  const females = birds.filter(b => b.gender === 'female');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pairs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Breeding Pairs
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your breeding pairs and clutches
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPair(null);
            setFormData({ name: '', cage_id: '', male_id: '', female_id: '', notes: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-pair-btn"
            >
              <Plus size={20} className="mr-2" /> Add Pair
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {editingPair ? 'Edit Pair' : 'Add New Pair'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">Pair Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Yellow Pair 1"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="pair-name-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">Cage</Label>
                <Select
                  value={formData.cage_id}
                  onValueChange={(value) => setFormData({ ...formData, cage_id: value })}
                >
                  <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="cage-select">
                    <SelectValue placeholder="Select a cage" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#202940] border-white/10">
                    {cages.map((cage) => (
                      <SelectItem key={cage.id} value={cage.id} className="text-white hover:bg-[#1A2035]">
                        {cage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Male</Label>
                  <Select
                    value={formData.male_id}
                    onValueChange={(value) => setFormData({ ...formData, male_id: value })}
                  >
                    <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="male-select">
                      <SelectValue placeholder="Select male" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202940] border-white/10">
                      {males.map((bird) => (
                        <SelectItem key={bird.id} value={bird.id} className="text-white hover:bg-[#1A2035]">
                          {bird.band_number} - {bird.stam || bird.color || 'No STAM'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Female</Label>
                  <Select
                    value={formData.female_id}
                    onValueChange={(value) => setFormData({ ...formData, female_id: value })}
                  >
                    <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="female-select">
                      <SelectValue placeholder="Select female" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202940] border-white/10">
                      {females.map((bird) => (
                        <SelectItem key={bird.id} value={bird.id} className="text-white hover:bg-[#1A2035]">
                          {bird.band_number} - {bird.stam || bird.color || 'No STAM'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                  data-testid="save-pair-btn"
                >
                  {editingPair ? 'Update' : 'Create'} Pair
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {pairs.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">No Pairs Yet</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              Start by adding your breeding pairs. You can then track eggs, incubation, and hatching for each pair.
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> Add Your First Pair
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pairs.map((pair) => (
            <PairCard
              key={pair.id}
              pair={pair}
              cages={cages}
              birds={birds}
              onEdit={handleEdit}
              onDelete={setDeleteDialog}
              onRefresh={fetchData}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Pair?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete this pair and all its clutch records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-pair"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
