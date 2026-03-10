import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { useLanguage } from '../lib/LanguageContext';
import { useSeasonChange } from '../hooks/useSeasonChange';

// Egg Status Component with click to change status
const EggIcon = ({ egg, index, clutchId, clutchStatus, onUpdate, t }) => {
  const [open, setOpen] = useState(false);
  const [bandNumber, setBandNumber] = useState(egg.band_number || '');
  const [updating, setUpdating] = useState(false);

  // Completed clutches cannot be modified at all
  const isClutchCompleted = clutchStatus === 'completed';
  
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
      toast.success(t('messages.eggStatusUpdated'));
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast.error(t('messages.eggError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleBand = async () => {
    if (!bandNumber.trim()) {
      toast.error(t('messages.eggBandRequired'));
      return;
    }
    
    setUpdating(true);
    try {
      await clutchesApi.updateEgg(clutchId, egg.id, {
        status: 'hatched',
        band_number: bandNumber,
        banded_date: new Date().toISOString().split('T')[0],
      });
      toast.success(t('messages.eggBanded'));
      setOpen(false);
      onUpdate();
    } catch (error) {
      toast.error(t('messages.eggError'));
    } finally {
      setUpdating(false);
    }
  };

  // DEAD egg/chick - no interaction allowed
  if (egg.status === 'dead') {
    return (
      <div
        className="w-8 h-10 rounded-full flex items-center justify-center bg-slate-700 text-slate-400 opacity-50"
        style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
        title={`${t('pairs.eggs')} ${index + 1}: ${t('pairs.eggStatus.dead')}`}
      >
        <X size={14} />
      </div>
    );
  }

  // HATCHED egg (chick) - can band if not banded, can mark as dead (until completed)
  if (egg.status === 'hatched') {
    return (
      <Popover open={open} onOpenChange={isClutchCompleted ? () => {} : setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex flex-col items-center gap-0.5 group",
              isClutchCompleted && "cursor-default"
            )}
            title={`${t('pairs.chick')} ${index + 1}: ${egg.band_number || t('pairs.noRing')}`}
            disabled={isClutchCompleted}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#00BFA6] text-white group-hover:bg-[#00BFA6]/80 transition-colors relative">
              <Bird size={20} />
            </div>
            {egg.band_number ? (
              <span className="text-[9px] font-mono font-bold text-[#FFC300] bg-[#1A2035] px-1.5 py-0.5 rounded border border-[#FFC300]/30 max-w-[60px] truncate">
                {egg.band_number}
              </span>
            ) : (
              <span className="text-[8px] text-slate-500 italic">{t('pairs.noRing')}</span>
            )}
          </button>
        </PopoverTrigger>
        {!isClutchCompleted && (
          <PopoverContent className="w-64 bg-[#202940] border-white/10 p-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t('pairs.chick')} {index + 1}</span>
                <span className="text-xs bg-[#00BFA6]/20 text-[#00BFA6] px-2 py-0.5 rounded">{t('pairs.eggStatus.hatched')}</span>
              </div>
              
              {egg.band_number ? (
                <div className="p-2 bg-[#1A2035] rounded">
                  <p className="text-xs text-slate-400">{t('pairs.ringNumber')}</p>
                  <p className="text-[#FFC300] font-mono font-bold">{egg.band_number}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">{t('pairs.ringNumber')}</Label>
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
                    {t('pairs.bandChick')}
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
                {t('pairs.markAsDead')}
              </Button>
            </div>
          </PopoverContent>
        )}
      </Popover>
    );
  }

  // INFERTILE egg - can only mark as dead (until completed)
  if (egg.status === 'infertile') {
    return (
      <Popover open={open} onOpenChange={isClutchCompleted ? () => {} : setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-8 h-10 flex items-center justify-center text-xs font-bold transition-all bg-[#E91E63] text-white',
              !isClutchCompleted && 'hover:scale-110'
            )}
            style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
            title={`${t('pairs.eggs')} ${index + 1}: ${t('pairs.eggStatus.infertile')}`}
            disabled={isClutchCompleted}
          >
            {index + 1}
          </button>
        </PopoverTrigger>
        {!isClutchCompleted && (
          <PopoverContent className="w-56 bg-[#202940] border-white/10 p-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-slate-400">{t('pairs.eggs')} {index + 1}</span>
                <span className="text-xs bg-[#E91E63]/20 text-[#E91E63] px-2 py-0.5 rounded">{t('pairs.eggStatus.infertile')}</span>
              </div>
              
              <hr className="border-white/10 my-1" />
              
              <button
                onClick={() => handleStatusChange('dead')}
                disabled={updating}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-slate-700/50 transition-colors"
              >
                <X size={16} className="text-slate-400" />
                <span className="text-sm text-slate-400">{t('pairs.markAsDead')}</span>
              </button>
            </div>
          </PopoverContent>
        )}
      </Popover>
    );
  }

  // FERTILE egg - can mark as hatched (with band) or dead (until completed)
  if (egg.status === 'fertile') {
    return (
      <Popover open={open} onOpenChange={isClutchCompleted ? () => {} : setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'w-8 h-10 flex items-center justify-center text-xs font-bold transition-all bg-[#00BFA6] text-white',
              !isClutchCompleted && 'hover:scale-110'
            )}
            style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
            title={`${t('pairs.eggs')} ${index + 1}: ${t('pairs.eggStatus.fertile')}`}
            disabled={isClutchCompleted}
          >
            {index + 1}
          </button>
        </PopoverTrigger>
        {!isClutchCompleted && (
          <PopoverContent className="w-56 bg-[#202940] border-white/10 p-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs text-slate-400">{t('pairs.eggs')} {index + 1}</span>
                <span className="text-xs bg-[#00BFA6]/20 text-[#00BFA6] px-2 py-0.5 rounded">{t('pairs.eggStatus.fertile')}</span>
              </div>
              
              <hr className="border-white/10 my-1" />
              
              {/* First: Mark as hatched (born) */}
              <button
                onClick={() => handleStatusChange('hatched')}
                disabled={updating}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#00BFA6]/20 transition-colors"
              >
                <Bird size={16} className="text-[#00BFA6]" />
                <span className="text-sm text-white">{t('pairs.eggStatus.hatched')}</span>
              </button>
              
              {/* Second: Ring number field (optional - can band at birth) */}
              <div className="px-2 py-1">
                <Label className="text-slate-300 text-xs">{t('pairs.ringNumber')} ({t('common.optional')})</Label>
                <Input
                  value={bandNumber}
                  onChange={(e) => setBandNumber(e.target.value)}
                  placeholder="e.g., PT2025-001"
                  className="bg-[#1A2035] border-white/10 text-white text-sm h-8 mt-1"
                />
              </div>
              
              <hr className="border-white/10 my-1" />
              
              {/* Third: Mark as dead */}
              <button
                onClick={() => handleStatusChange('dead')}
                disabled={updating}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-slate-700/50 transition-colors"
              >
                <X size={16} className="text-slate-400" />
                <span className="text-sm text-slate-400">{t('pairs.markAsDead')}</span>
              </button>
            </div>
          </PopoverContent>
        )}
      </Popover>
    );
  }

  // FRESH egg - can mark as fertile, infertile, or dead (until completed)
  return (
    <Popover open={open} onOpenChange={isClutchCompleted ? () => {} : setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-8 h-10 flex items-center justify-center text-xs font-bold transition-all bg-white text-slate-700',
            !isClutchCompleted && 'hover:scale-110'
          )}
          style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
          title={`${t('pairs.eggs')} ${index + 1}: ${t('pairs.eggStatus.fresh')} - ${t('pairs.clickToChange')}`}
          disabled={isClutchCompleted}
        >
          {index + 1}
        </button>
      </PopoverTrigger>
      {!isClutchCompleted && (
        <PopoverContent className="w-56 bg-[#202940] border-white/10 p-2">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 px-2 py-1">{t('pairs.eggs')} {index + 1} - {t('pairs.eggStatus.fresh')}</p>
            
            <button
              onClick={() => handleStatusChange('fertile')}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#00BFA6]/20 transition-colors"
            >
              <div className="w-4 h-5 bg-[#00BFA6] rounded-full" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
              <span className="text-sm text-white">{t('pairs.eggStatus.fertile')}</span>
            </button>
            
            <button
              onClick={() => handleStatusChange('infertile')}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#E91E63]/20 transition-colors"
            >
              <div className="w-4 h-5 bg-[#E91E63] rounded-full" style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />
              <span className="text-sm text-white">{t('pairs.eggStatus.infertile')}</span>
            </button>
            
            <hr className="border-white/10 my-1" />
            
            <button
              onClick={() => handleStatusChange('dead')}
              disabled={updating}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-slate-700/50 transition-colors"
            >
              <X size={16} className="text-slate-400" />
              <span className="text-sm text-slate-400">{t('pairs.markAsDead')}</span>
            </button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

const ClutchCard = ({ clutch, onUpdate, onDelete, onAddEgg, t }) => {
  const [updating, setUpdating] = useState(false);

  const handleStartIncubation = async () => {
    setUpdating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await clutchesApi.update(clutch.id, {
        status: 'incubating',
        incubation_start: today,
      });
      toast.success(t('messages.incubationStarted'));
      onUpdate();
    } catch (error) {
      toast.error(t('messages.clutchError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkHatching = async () => {
    setUpdating(true);
    try {
      await clutchesApi.update(clutch.id, { status: 'hatching' });
      toast.success(t('messages.hatchingMarked'));
      onUpdate();
    } catch (error) {
      toast.error(t('messages.clutchError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    setUpdating(true);
    try {
      await clutchesApi.update(clutch.id, { status: 'completed' });
      toast.success(t('messages.clutchCompleted'));
      onUpdate();
    } catch (error) {
      toast.error(t('messages.clutchError'));
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

  const getClutchStatusText = (status) => {
    const statusMap = {
      'laying': t('pairs.clutchStatus.laying'),
      'incubating': t('pairs.clutchStatus.incubating'),
      'hatching': t('pairs.clutchStatus.hatching'),
      'completed': t('pairs.clutchStatus.completed'),
    };
    return statusMap[status] || status;
  };

  return (
    <div className="p-4 rounded-lg bg-[#1A2035] border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('status-badge text-xs', getStatusColor(clutch.status))}>
            {getClutchStatusText(clutch.status)}
          </span>
          <span className="text-xs text-slate-500">
            {t('pairs.started')} {formatDate(clutch.start_date)}
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
          <span className="text-slate-400">{t('pairs.clickToChange')}:</span>
          <span className="text-[#00BFA6]">● {t('pairs.eggStatus.fertile')}</span>
          <span className="text-[#E91E63]">● {t('pairs.eggStatus.infertile')}</span>
          {clutch.status === 'hatching' && <span className="text-[#00BFA6]">🐤 {t('pairs.eggStatus.hatched')}</span>}
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
            t={t}
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
            <span className="text-[#00BFA6]">{eggCounts.fertile} {t('pairs.eggStatus.fertile').toLowerCase()}</span>
          )}
          {eggCounts.infertile > 0 && (
            <span className="text-[#E91E63]">{eggCounts.infertile} {t('pairs.eggStatus.infertile').toLowerCase()}</span>
          )}
          {eggCounts.hatched > 0 && (
            <span className="text-[#00BFA6]">{eggCounts.hatched} {t('pairs.eggStatus.hatched').toLowerCase()}</span>
          )}
          {eggCounts.dead > 0 && (
            <span className="text-slate-500">{eggCounts.dead} {t('pairs.eggStatus.dead').toLowerCase()}</span>
          )}
        </div>
      )}

      {/* Dates */}
      {clutch.expected_hatch_date && (
        <div className="text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>{t('pairs.expectedHatch')}:</span>
            <span className="text-[#00BFA6]">{formatDate(clutch.expected_hatch_date)}</span>
          </div>
          {clutch.expected_band_date && (
            <div className="flex justify-between">
              <span>{t('pairs.expectedBand')}:</span>
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
            <Play size={14} className="mr-1" /> {t('pairs.startIncubation')}
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
            <Egg size={14} className="mr-1" /> {t('pairs.markHatching')}
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
            <CheckCircle2 size={14} className="mr-1" /> {t('pairs.completeClutch')}
          </Button>
        )}
      </div>
    </div>
  );
};

const PairCard = ({ pair, cages, birds, onEdit, onDelete, onRefresh, t, isHighlighted }) => {
  const [clutches, setClutches] = useState([]);
  const [showClutches, setShowClutches] = useState(isHighlighted || false);
  const [loading, setLoading] = useState(true);

  // Auto-expand when highlighted
  useEffect(() => {
    if (isHighlighted) {
      setShowClutches(true);
    }
  }, [isHighlighted]);

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

  // Load clutches immediately on mount
  useEffect(() => {
    fetchClutches();
  }, [fetchClutches]);

  const handleAddClutch = async () => {
    try {
      await clutchesApi.create({ pair_id: pair.id });
      toast.success(t('messages.clutchCreated'));
      fetchClutches();
    } catch (error) {
      toast.error(t('messages.clutchError'));
    }
  };

  const handleDeleteClutch = async (clutchId) => {
    try {
      await clutchesApi.delete(clutchId);
      toast.success(t('messages.clutchDeleted'));
      fetchClutches();
    } catch (error) {
      toast.error(t('messages.clutchError'));
    }
  };

  const handleAddEgg = async (clutchId) => {
    try {
      await clutchesApi.addEgg(clutchId, {});
      toast.success(t('messages.eggAdded'));
      fetchClutches();
    } catch (error) {
      toast.error(t('messages.eggError'));
    }
  };

  const activeClutch = clutches.find(c => c.status !== 'completed');
  
  // Calculate real status based on eggs in ACTIVE clutches only
  const getEggBasedStatus = () => {
    // Check only active clutches (not completed)
    const activeClutches = clutches.filter(c => c.status !== 'completed');
    const allEggs = activeClutches.flatMap(c => c.eggs || []);
    if (allEggs.length === 0) return null;
    
    const hatchedAndBanded = allEggs.filter(e => e.status === 'hatched' && e.band_number);
    const hatchedNotBanded = allEggs.filter(e => e.status === 'hatched' && !e.band_number);
    const fertile = allEggs.filter(e => e.status === 'fertile');
    const fresh = allEggs.filter(e => e.status === 'fresh');
    
    if (hatchedAndBanded.length > 0) return 'banded';
    if (hatchedNotBanded.length > 0) return 'born';
    if (fertile.length > 0) return 'incubating';
    if (fresh.length > 0) return 'laying';
    return null;
  };
  
  // Get card background color based on egg status
  const getCardStyle = () => {
    const status = getEggBasedStatus();
    if (!status) return 'bg-[#202940] border-white/5';
    
    switch (status) {
      case 'laying':
        return 'bg-[#202940] border-l-4 border-l-[#EC4899] border-white/5';
      case 'incubating':
        return 'bg-[#202940] border-l-4 border-l-[#F97316] border-white/5';
      case 'born':
        return 'bg-[#202940] border-l-4 border-l-[#22C55E] border-white/5';
      case 'banded':
        return 'bg-[#202940] border-l-4 border-l-[#FACC15] border-white/5';
      case 'weaning':
        return 'bg-[#202940] border-l-4 border-l-[#A855F7] border-white/5';
      default:
        return 'bg-[#202940] border-white/5';
    }
  };

  return (
    <Card 
      className={cn(
        getCardStyle(), 
        'hover:border-[#FFC300]/30 transition-all',
        isHighlighted && 'ring-2 ring-[#FFC300] ring-offset-2 ring-offset-[#1A2035]'
      )}
      data-pair-id={pair.id}
    >
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
            <p className="text-xs text-[#00BFA6] uppercase tracking-wider font-['Barlow_Condensed'] mb-1">{t('common.male')}</p>
            {male ? (
              <>
                <p className="text-white font-mono text-sm">{male.band_number}</p>
                <p className="text-xs text-slate-400">{male.stam || male.color || t('birds.noBirds')}</p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">{t('pairs.notAssigned')}</p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-[#1A2035] border border-white/5">
            <p className="text-xs text-[#FF69B4] uppercase tracking-wider font-['Barlow_Condensed'] mb-1">{t('common.female')}</p>
            {female ? (
              <>
                <p className="text-white font-mono text-sm">{female.band_number}</p>
                <p className="text-xs text-slate-400">{female.stam || female.color || t('birds.noBirds')}</p>
              </>
            ) : (
              <p className="text-slate-500 text-sm">{t('pairs.notAssigned')}</p>
            )}
          </div>
        </div>

        {/* Status Badge based on eggs */}
        {(() => {
          const eggStatus = getEggBasedStatus();
          if (!eggStatus) return null;
          
          const allEggs = clutches.flatMap(c => c.eggs || []);
          const hatchedCount = allEggs.filter(e => e.status === 'hatched').length;
          const fertileCount = allEggs.filter(e => e.status === 'fertile').length;
          const freshCount = allEggs.filter(e => e.status === 'fresh').length;
          
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium uppercase',
                eggStatus === 'laying' && 'bg-[#EC4899]/20 text-[#EC4899]',
                eggStatus === 'incubating' && 'bg-[#F97316]/20 text-[#F97316]',
                eggStatus === 'born' && 'bg-[#22C55E]/20 text-[#22C55E]',
                eggStatus === 'banded' && 'bg-[#FACC15]/20 text-[#FACC15]',
                eggStatus === 'weaning' && 'bg-[#A855F7]/20 text-[#A855F7]',
              )}>
                {eggStatus === 'laying' && t('pairs.clutchStatus.laying')}
                {eggStatus === 'incubating' && t('pairs.clutchStatus.incubating')}
                {eggStatus === 'born' && t('zones.born')}
                {eggStatus === 'banded' && t('zones.banded')}
                {eggStatus === 'weaning' && t('zones.weaning')}
              </span>
              <span className="text-slate-400">
                {eggStatus === 'laying' && `${freshCount} ${t('pairs.eggs').toLowerCase()}`}
                {eggStatus === 'incubating' && `${fertileCount} ${t('pairs.eggs').toLowerCase()}`}
                {(eggStatus === 'born' || eggStatus === 'banded') && `${hatchedCount} ${t('zones.born').toLowerCase()}`}
              </span>
            </div>
          );
        })()}

        {/* Clutches Toggle */}
        <button
          onClick={() => setShowClutches(!showClutches)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[#1A2035] hover:bg-[#1A2035]/80 transition-colors"
          data-testid={`toggle-clutches-${pair.id}`}
        >
          <span className="text-sm text-slate-300">
            {t('pairs.clutches')} ({loading ? '...' : clutches.length})
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
                    t={t}
                  />
                ))}
                <Button
                  onClick={handleAddClutch}
                  variant="outline"
                  className="w-full border-dashed border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
                  data-testid={`add-clutch-${pair.id}`}
                >
                  <Plus size={16} className="mr-2" /> {t('pairs.addClutch')}
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
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pairs, setPairs] = useState([]);
  const [cages, setCages] = useState([]);
  const [birds, setBirds] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingPair, setEditingPair] = useState(null);
  const [newBirdDialog, setNewBirdDialog] = useState(null); // 'male' or 'female'
  const [newBirdData, setNewBirdData] = useState({
    band_number: '',
    band_year: new Date().getFullYear(),
    gender: 'male',
    species: 'Canário',
    stam: '',
    class_id: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    cage_id: '',
    male_id: '',
    female_id: '',
    notes: '',
  });

  // Check for cage parameter from URL (coming from Zones page)
  useEffect(() => {
    const cageId = searchParams.get('cage');
    if (cageId && !loading) {
      // Pre-select the cage and open the dialog
      setFormData(prev => ({ ...prev, cage_id: cageId }));
      setDialogOpen(true);
      // Clear the URL parameter
      setSearchParams({});
    }
  }, [searchParams, loading, setSearchParams]);

  // Check for pairId parameter from URL (coming from Zones page - view pair)
  const [highlightedPairId, setHighlightedPairId] = useState(null);
  
  useEffect(() => {
    const pairId = searchParams.get('pairId');
    if (pairId && !loading) {
      // Highlight the pair and scroll to it
      setHighlightedPairId(pairId);
      // Clear the URL parameter
      setSearchParams({});
      // Auto-scroll to the pair after a short delay
      setTimeout(() => {
        const pairElement = document.querySelector(`[data-pair-id="${pairId}"]`);
        if (pairElement) {
          pairElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [searchParams, loading, setSearchParams]);

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
      toast.error(t('messages.pairLoadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reload data when season changes
  useSeasonChange(() => {
    fetchData();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate: both male and female are required
    if (!formData.male_id || !formData.female_id) {
      toast.error(t('messages.pairRequiresBoth'));
      return;
    }
    
    try {
      if (editingPair) {
        await pairsApi.update(editingPair.id, formData);
        toast.success(t('messages.pairUpdated'));
      } else {
        await pairsApi.create(formData);
        toast.success(t('messages.pairCreated'));
      }
      setDialogOpen(false);
      setEditingPair(null);
      setFormData({ name: '', cage_id: '', male_id: '', female_id: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(t('messages.pairSaveError'));
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
      toast.success(t('messages.pairDeleted'));
      setDeleteDialog(null);
      fetchData();
    } catch (error) {
      toast.error(t('messages.pairDeleteError'));
    }
  };

  const handleOpenNewBirdDialog = (gender) => {
    setNewBirdData({
      band_number: '',
      band_year: new Date().getFullYear(),
      gender: gender,
      species: 'Canário',
      stam: '',
      class_id: '',
    });
    setNewBirdDialog(gender);
  };

  const handleCreateNewBird = async () => {
    if (!newBirdData.band_number.trim()) {
      toast.error(t('birds.bandNumber') + ' ' + t('common.required'));
      return;
    }
    try {
      const response = await birdsApi.create(newBirdData);
      toast.success(t('messages.birdCreated'));
      // Update the form with the new bird
      if (newBirdDialog === 'male') {
        setFormData({ ...formData, male_id: response.data.id });
      } else {
        setFormData({ ...formData, female_id: response.data.id });
      }
      setNewBirdDialog(null);
      fetchData(); // Refresh birds list
    } catch (error) {
      toast.error(t('messages.birdSaveError'));
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
            {t('pairs.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {t('pairs.subtitle')}
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
              <Plus size={20} className="mr-2" /> {t('pairs.addPair')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {editingPair ? t('pairs.editPair') : t('pairs.addPair')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">{t('pairs.pairName')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Yellow Pair 1"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="pair-name-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">{t('pairs.cage')}</Label>
                <Select
                  value={formData.cage_id}
                  onValueChange={(value) => setFormData({ ...formData, cage_id: value })}
                >
                  <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="cage-select">
                    <SelectValue placeholder={t('pairs.cage')} />
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
                  <Label className="text-slate-300">
                    {t('common.male')} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.male_id}
                    onValueChange={(value) => {
                      if (value === 'create_new') {
                        handleOpenNewBirdDialog('male');
                      } else {
                        setFormData({ ...formData, male_id: value });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="male-select">
                      <SelectValue placeholder={t('common.male')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202940] border-white/10">
                      <SelectItem value="create_new" className="text-[#FFC300] hover:bg-[#1A2035] font-medium">
                        <span className="flex items-center gap-2">
                          <Plus size={14} /> {t('pairs.createNewBird')}
                        </span>
                      </SelectItem>
                      <div className="h-px bg-white/10 my-1" />
                      {males.map((bird) => (
                        <SelectItem key={bird.id} value={bird.id} className="text-white hover:bg-[#1A2035]">
                          {bird.band_number} - {bird.stam || t('birds.stam')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">
                    {t('common.female')} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.female_id}
                    onValueChange={(value) => {
                      if (value === 'create_new') {
                        handleOpenNewBirdDialog('female');
                      } else {
                        setFormData({ ...formData, female_id: value });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="female-select">
                      <SelectValue placeholder={t('common.female')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202940] border-white/10">
                      <SelectItem value="create_new" className="text-[#FFC300] hover:bg-[#1A2035] font-medium">
                        <span className="flex items-center gap-2">
                          <Plus size={14} /> {t('pairs.createNewBird')}
                        </span>
                      </SelectItem>
                      <div className="h-px bg-white/10 my-1" />
                      {females.map((bird) => (
                        <SelectItem key={bird.id} value={bird.id} className="text-white hover:bg-[#1A2035]">
                          {bird.band_number} - {bird.stam || t('birds.stam')}
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
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="save-pair-btn"
                  disabled={!formData.male_id || !formData.female_id}
                >
                  {editingPair ? t('common.update') : t('common.create')}
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
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">{t('pairs.noPairs')}</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              {t('pairs.noPairs')}
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> {t('pairs.addPair')}
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
              t={t}
              isHighlighted={highlightedPairId === pair.id}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('pairs.deletePair')}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {t('pairs.deletePair')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-pair"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create New Bird Dialog */}
      <Dialog open={!!newBirdDialog} onOpenChange={() => setNewBirdDialog(null)}>
        <DialogContent className="bg-[#202940] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-['Barlow_Condensed'] text-xl flex items-center gap-2">
              <Bird className={newBirdDialog === 'male' ? 'text-[#00BFA6]' : 'text-[#FF69B4]'} size={20} />
              {t('pairs.createNewBird')} ({newBirdDialog === 'male' ? t('common.male') : t('common.female')})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">{t('birds.bandNumber')} *</Label>
                <Input
                  value={newBirdData.band_number}
                  onChange={(e) => setNewBirdData({ ...newBirdData, band_number: e.target.value })}
                  placeholder="PT2025-001"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="new-bird-band"
                />
              </div>
              <div>
                <Label className="text-slate-300">{t('birds.year')}</Label>
                <Input
                  type="number"
                  value={newBirdData.band_year}
                  onChange={(e) => setNewBirdData({ ...newBirdData, band_year: parseInt(e.target.value) })}
                  className="bg-[#1A2035] border-white/10 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">{t('birds.species')}</Label>
              <Select
                value={newBirdData.species || 'Canário'}
                onValueChange={(value) => setNewBirdData({ ...newBirdData, species: value })}
              >
                <SelectTrigger className="bg-[#1A2035] border-white/10 text-white">
                  <SelectValue placeholder={t('birds.species')} />
                </SelectTrigger>
                <SelectContent className="bg-[#202940] border-white/10">
                  <SelectItem value="Canário" className="text-white hover:bg-[#1A2035]">Canário</SelectItem>
                  <SelectItem value="Pintassilgo" className="text-white hover:bg-[#1A2035]">Pintassilgo</SelectItem>
                  <SelectItem value="Verdilhão" className="text-white hover:bg-[#1A2035]">Verdilhão</SelectItem>
                  <SelectItem value="Lugre" className="text-white hover:bg-[#1A2035]">Lugre</SelectItem>
                  <SelectItem value="Híbrido" className="text-white hover:bg-[#1A2035]">Híbrido</SelectItem>
                  <SelectItem value="Outro" className="text-white hover:bg-[#1A2035]">{t('common.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">{t('birds.stam')} *</Label>
                <Input
                  value={newBirdData.stam}
                  onChange={(e) => setNewBirdData({ ...newBirdData, stam: e.target.value })}
                  placeholder="STAM123"
                  className="bg-[#1A2035] border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">{t('birds.class')}</Label>
                <Input
                  value={newBirdData.class_id}
                  onChange={(e) => setNewBirdData({ ...newBirdData, class_id: e.target.value })}
                  placeholder="Classe"
                  className="bg-[#1A2035] border-white/10 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewBirdDialog(null)}
                className="flex-1 border-white/10 text-white hover:bg-white/5"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreateNewBird}
                className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                data-testid="create-new-bird-btn"
              >
                <Plus size={16} className="mr-2" /> {t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
