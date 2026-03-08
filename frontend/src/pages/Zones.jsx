import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Grid3X3,
  Trash2,
  RefreshCw,
  Heart
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
import { zonesApi, cagesApi, pairsApi, clutchesApi } from '../lib/api';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '../lib/LanguageContext';

// Stage colors - Breeding stages
const STAGE_COLORS = {
  empty: { bg: 'bg-[#151B2B]', border: 'border-[#2A3548]', text: 'text-slate-400', color: '#64748B' },
  paired: { bg: 'bg-[#3B82F6]/20', border: 'border-[#3B82F6]', text: 'text-[#3B82F6]', color: '#3B82F6' }, // Blue - Emparelhado
  laying: { bg: 'bg-[#EC4899]/20', border: 'border-[#EC4899]', text: 'text-[#EC4899]', color: '#EC4899' }, // Pink - Postura (ovos frescos)
  incubating: { bg: 'bg-[#F97316]/20', border: 'border-[#F97316]', text: 'text-[#F97316]', color: '#F97316' }, // Orange - Incubação (ovos férteis)
  born: { bg: 'bg-[#22C55E]/20', border: 'border-[#22C55E]', text: 'text-[#22C55E]', color: '#22C55E' }, // Green - Nascidos
  banded: { bg: 'bg-[#FACC15]/20', border: 'border-[#FACC15]', text: 'text-[#FACC15]', color: '#FACC15' }, // Yellow - Anilhados
  separator: { bg: 'bg-[#06B6D4]/20', border: 'border-[#06B6D4]', text: 'text-[#06B6D4]', color: '#06B6D4' }, // Cyan - Separador
  weaning: { bg: 'bg-[#A855F7]/20', border: 'border-[#A855F7]', text: 'text-[#A855F7]', color: '#A855F7' }, // Purple - Desmame
  completed: { bg: 'bg-[#64748B]/20', border: 'border-[#64748B]', text: 'text-[#64748B]', color: '#64748B' }, // Gray - Completo
};

const CageCell = ({ cage, pair, cageStatus, onClick, t }) => {
  const hasPair = !!pair;
  const stage = cageStatus || (hasPair ? 'paired' : 'empty');
  const colors = STAGE_COLORS[stage] || STAGE_COLORS.empty;
  
  const getStageLabel = (s) => {
    const labels = {
      'empty': t('zones.empty'),
      'paired': t('zones.paired'),
      'laying': t('pairs.clutchStatus.laying'),
      'incubating': t('pairs.clutchStatus.incubating'),
      'born': t('zones.born'),
      'banded': t('zones.banded'),
      'separator': t('zones.separator') || 'Separador',
      'weaning': t('zones.weaning'),
    };
    return labels[s] || s;
  };
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded border transition-all cursor-pointer p-2 min-w-[40px] min-h-[40px]',
        colors.bg, colors.border,
        'hover:opacity-80'
      )}
      data-testid={`cage-${cage.id}`}
      title={hasPair ? `${t('pairs.title')}: ${pair.name || t('pairs.pairName')} - ${getStageLabel(stage)}` : `${t('zones.cage')} ${cage.label} - ${t('zones.empty')}`}
    >
      <div className="text-center">
        <p className={cn('text-sm font-bold font-mono', colors.text)}>
          {cage.label}
        </p>
        {hasPair && (
          <p className={cn('text-[10px] truncate max-w-[50px]', colors.text)} style={{ opacity: 0.7 }}>
            {pair.name || t('pairs.pairName')}
          </p>
        )}
      </div>
    </div>
  );
};

const ZoneCard = ({ zone, cages, pairs, clutches, breedingSettings, onDelete, onRefresh, onCageClick, t }) => {
  const [generating, setGenerating] = useState(false);
  
  const zoneCages = cages.filter(c => c.zone_id === zone.id);
  const gridCols = zone.columns;
  const pairedCagesCount = zoneCages.filter(c => pairs.find(p => p.cage_id === c.id)).length;

  const handleGenerateCages = async () => {
    setGenerating(true);
    try {
      await zonesApi.generateCages(zone.id);
      toast.success(`${zone.rows * zone.columns} ${t('messages.cagesGenerated')}`);
      onRefresh();
    } catch (error) {
      toast.error(t('messages.zoneLoadError'));
    } finally {
      setGenerating(false);
    }
  };

  const getCagePair = (cageId) => {
    return pairs.find(p => p.cage_id === cageId);
  };

  // Helper to calculate days between two dates
  const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2 - d1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate cage status based on clutch status and breeding cycle
  // Logic:
  // 1. laying (rosa) - postura iniciada, ovos frescos
  // 2. incubating (laranja) - incubação iniciada
  // 3. born (verde) - ovos nascidos (hatched) mas sem anilha
  // 4. banded (amarelo) - ovos com anilha
  // 5. separator (usar weaning temporariamente) - dias para separador atingidos
  // 6. weaning (roxo) - dias para desmame atingidos
  // 7. empty - postura terminada ou sem postura ativa
  const getCageStatus = (cageId) => {
    const pair = getCagePair(cageId);
    if (!pair) return null;
    
    // Get only active clutches (not completed) for this pair
    const activeClutches = clutches.filter(c => c.pair_id === pair.id && c.status !== 'completed');
    if (activeClutches.length === 0) return null;
    
    // Get the most recent active clutch
    const clutch = activeClutches[activeClutches.length - 1];
    const allEggs = clutch.eggs || [];
    
    if (allEggs.length === 0) {
      // Clutch exists but no eggs yet - still laying phase
      return 'laying';
    }
    
    // Count eggs by status
    const hatchedEggs = allEggs.filter(e => e.status === 'hatched');
    const hatchedAndBanded = hatchedEggs.filter(e => e.band_number);
    const hatchedNotBanded = hatchedEggs.filter(e => !e.band_number);
    
    // Get breeding cycle settings
    const daysSeparator = breedingSettings?.days_separator || 21;
    const daysWeaning = breedingSettings?.days_weaning || 35;
    
    // If there are hatched eggs, check the timeline
    if (hatchedEggs.length > 0) {
      // Find the earliest hatch date
      const hatchDates = hatchedEggs
        .filter(e => e.hatched_date)
        .map(e => new Date(e.hatched_date));
      
      if (hatchDates.length > 0) {
        const earliestHatch = new Date(Math.min(...hatchDates));
        const today = new Date();
        const daysSinceHatch = daysBetween(earliestHatch, today);
        
        // Check weaning first (highest priority for time-based)
        if (daysSinceHatch >= daysWeaning) {
          return 'weaning';
        }
        
        // Check separator days
        if (daysSinceHatch >= daysSeparator) {
          return 'separator';
        }
      }
      
      // If all hatched eggs are banded
      if (hatchedAndBanded.length > 0 && hatchedNotBanded.length === 0) {
        return 'banded';
      }
      
      // If some eggs hatched but not banded
      if (hatchedNotBanded.length > 0) {
        return 'born';
      }
      
      // All hatched eggs are banded
      return 'banded';
    }
    
    // Check clutch status for non-hatched states
    if (clutch.status === 'hatching') {
      return 'born';
    }
    
    if (clutch.status === 'incubating') {
      return 'incubating';
    }
    
    // Default to laying if clutch exists with eggs
    return 'laying';
  };

  // Count cages by status
  const statusCounts = {
    laying: 0,
    incubating: 0,
    born: 0,
    banded: 0,
    separator: 0,
    weaning: 0,
  };
  
  zoneCages.forEach(cage => {
    const status = getCageStatus(cage.id);
    if (status && statusCounts[status] !== undefined) {
      statusCounts[status]++;
    }
  });

  return (
    <Card className="bg-[#202940] border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg text-white font-['Barlow_Condensed']">
            {zone.name}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-slate-400">
              {zone.rows}×{zone.columns} ({zoneCages.length} {t('zones.cages')})
            </span>
            {pairedCagesCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#3B82F6]/20 text-[#3B82F6]">
                {pairedCagesCount} {t('zones.paired')}
              </span>
            )}
            {statusCounts.laying > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#EC4899]/20 text-[#EC4899]">
                {statusCounts.laying} {t('pairs.clutchStatus.laying')}
              </span>
            )}
            {statusCounts.incubating > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#F97316]/20 text-[#F97316]">
                {statusCounts.incubating} {t('pairs.clutchStatus.incubating')}
              </span>
            )}
            {statusCounts.born > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E]">
                {statusCounts.born} {t('zones.born')}
              </span>
            )}
            {statusCounts.banded > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#FACC15]/20 text-[#FACC15]">
                {statusCounts.banded} {t('zones.banded')}
              </span>
            )}
            {statusCounts.separator > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#06B6D4]/20 text-[#06B6D4]">
                {statusCounts.separator} {t('zones.separator') || 'Separador'}
              </span>
            )}
            {statusCounts.weaning > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#A855F7]/20 text-[#A855F7]">
                {statusCounts.weaning} {t('zones.weaning')}
              </span>
            )}
          </div>
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
            <p className="text-slate-400 mb-4">{t('zones.noCages')}</p>
            <Button
              onClick={handleGenerateCages}
              disabled={generating}
              variant="outline"
              className="border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
              data-testid={`generate-cages-${zone.id}`}
            >
              <RefreshCw size={16} className={cn("mr-2", generating && "animate-spin")} />
              {t('zones.generateCages')}
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
                const cageStatus = getCageStatus(cage.id);
                return (
                  <CageCell 
                    key={cage.id} 
                    cage={cage} 
                    pair={pair}
                    cageStatus={cageStatus}
                    onClick={() => onCageClick(cage, pair)}
                    t={t}
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
  const { t } = useLanguage();
  const [zones, setZones] = useState([]);
  const [cages, setCages] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [clutches, setClutches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [breedingSettings, setBreedingSettings] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    rows: 4,
    columns: 4,
  });
  const [selectedCage, setSelectedCage] = useState(null);

  const fetchData = async () => {
    try {
      const [zonesRes, cagesRes, pairsRes, clutchesRes, settingsRes] = await Promise.all([
        zonesApi.getAll(),
        cagesApi.getAll(),
        pairsApi.getAll(),
        clutchesApi.getAll(),
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/settings`).then(r => r.json()),
      ]);
      setZones(zonesRes.data);
      setCages(cagesRes.data);
      setPairs(pairsRes.data);
      setClutches(clutchesRes.data);
      setBreedingSettings(settingsRes.breeding || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('messages.zoneLoadError'));
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
      toast.success(t('messages.zoneCreated'));
      // Auto-generate cages
      await zonesApi.generateCages(newZone.data.id);
      toast.success(`${formData.rows * formData.columns} ${t('messages.cagesGenerated')}`);
      setDialogOpen(false);
      setFormData({ name: '', rows: 4, columns: 4 });
      fetchData();
    } catch (error) {
      toast.error(t('messages.zoneLoadError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await zonesApi.delete(deleteDialog.id);
      toast.success(t('messages.zoneDeleted'));
      setDeleteDialog(null);
      fetchData();
    } catch (error) {
      toast.error(t('messages.deleteError'));
    }
  };

  const handleCageClick = (cage, pair) => {
    // Get clutch data for this cage's pair
    const pairClutches = pair ? clutches.filter(c => c.pair_id === pair.id) : [];
    const activeClutch = pairClutches.find(c => c.status !== 'completed');
    
    setSelectedCage({
      cage,
      pair,
      clutches: pairClutches,
      activeClutch,
      stats: {
        totalClutches: pairClutches.length,
        totalEggs: pairClutches.reduce((acc, c) => acc + (c.eggs?.length || 0), 0),
        hatchedEggs: pairClutches.reduce((acc, c) => acc + (c.eggs?.filter(e => e.status === 'hatched')?.length || 0), 0),
        fertileEggs: pairClutches.reduce((acc, c) => acc + (c.eggs?.filter(e => e.status === 'fertile')?.length || 0), 0),
      }
    });
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
            {t('zones.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {t('zones.subtitle')}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-zone-btn"
            >
              <Plus size={20} className="mr-2" /> {t('zones.addZone')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {t('zones.addZone')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">{t('zones.zoneName')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Modulo 1"
                  className="bg-[#1A2035] border-white/10 text-white"
                  required
                  data-testid="zone-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{t('zones.rows')} (max 7)</Label>
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
                  <Label className="text-slate-300">{t('zones.columns')} (max 50)</Label>
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
                {formData.rows * formData.columns} {t('zones.cages')}
              </p>
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
                  className="flex-1 bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
                  data-testid="save-zone-btn"
                >
                  {t('common.create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Color Legend */}
      <Card className="bg-[#202940] border-white/5">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="text-slate-400 font-medium">{t('zones.legend')}:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#151B2B] border border-[#2A3548]" />
              <span className="text-slate-400">{t('zones.empty')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#3B82F6]/20 border border-[#3B82F6]" />
              <span className="text-[#3B82F6]">{t('zones.paired')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#EC4899]/20 border border-[#EC4899]" />
              <span className="text-[#EC4899]">{t('pairs.clutchStatus.laying')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#F97316]/20 border border-[#F97316]" />
              <span className="text-[#F97316]">{t('pairs.clutchStatus.incubating')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#22C55E]/20 border border-[#22C55E]" />
              <span className="text-[#22C55E]">{t('zones.born')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#FACC15]/20 border border-[#FACC15]" />
              <span className="text-[#FACC15]">{t('zones.banded')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#06B6D4]/20 border border-[#06B6D4]" />
              <span className="text-[#06B6D4]">{t('zones.separator') || 'Separador'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-[#A855F7]/20 border border-[#A855F7]" />
              <span className="text-[#A855F7]">{t('zones.weaning')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zones Grid */}
      {zones.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Grid3X3 className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">{t('zones.noZones')}</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              {t('zones.noZones')}
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> {t('zones.addZone')}
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
              clutches={clutches}
              breedingSettings={breedingSettings}
              onDelete={setDeleteDialog}
              onRefresh={fetchData}
              onCageClick={handleCageClick}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Cage Details Dialog */}
      <Dialog open={!!selectedCage} onOpenChange={() => setSelectedCage(null)}>
        <DialogContent className="bg-[#202940] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-['Barlow_Condensed'] text-xl flex items-center gap-2">
              <Grid3X3 className="text-[#FFC300]" size={20} />
              {t('zones.cage')} {selectedCage?.cage?.label}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCage?.pair ? (
            <div className="space-y-4">
              {/* Pair Info */}
              <div className="p-4 rounded-lg bg-[#1A2035]">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="text-[#E91E63]" size={16} />
                  <span className="text-white font-medium">{selectedCage.pair.name || t('pairs.pairName')}</span>
                  <span className={cn(
                    'ml-auto px-2 py-0.5 rounded text-xs',
                    selectedCage.activeClutch 
                      ? 'bg-[#00BFA6]/20 text-[#00BFA6]' 
                      : 'bg-slate-600/20 text-slate-400'
                  )}>
                    {selectedCage.activeClutch ? t(`pairs.clutchStatus.${selectedCage.activeClutch.status}`) : t('common.active')}
                  </span>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-[#FFC300]">{selectedCage.stats.totalClutches}</p>
                    <p className="text-xs text-slate-400">{t('pairs.clutches')}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-[#FF9800]">{selectedCage.stats.totalEggs}</p>
                    <p className="text-xs text-slate-400">{t('pairs.eggs')}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-[#00BFA6]">{selectedCage.stats.fertileEggs}</p>
                    <p className="text-xs text-slate-400">{t('pairs.eggStatus.fertile')}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-[#00BFA6]">{selectedCage.stats.hatchedEggs}</p>
                    <p className="text-xs text-slate-400">{t('pairs.eggStatus.hatched')}</p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  const pairId = selectedCage?.pair?.id;
                  setSelectedCage(null);
                  navigate(`/pairs?pairId=${pairId}`);
                }}
                className="w-full bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
              >
                {t('common.view')} {t('pairs.title')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Empty Cage */}
              <div className="p-6 rounded-lg bg-[#1A2035] text-center">
                <Grid3X3 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-white font-medium">{t('zones.empty')}</p>
                <p className="text-sm text-slate-400 mt-1">{t('zones.noPairAssigned')}</p>
                
                {/* Zero Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-slate-500">0</p>
                    <p className="text-xs text-slate-400">{t('pairs.clutches')}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-slate-500">0</p>
                    <p className="text-xs text-slate-400">{t('pairs.eggs')}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-slate-500">0</p>
                    <p className="text-xs text-slate-400">{t('pairs.eggStatus.fertile')}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-[#202940]">
                    <p className="text-2xl font-bold text-slate-500">0</p>
                    <p className="text-xs text-slate-400">{t('pairs.eggStatus.hatched')}</p>
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => {
                  const cageId = selectedCage?.cage?.id;
                  setSelectedCage(null);
                  navigate(`/pairs?cage=${cageId}`);
                }}
                className="w-full bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
              >
                <Plus size={16} className="mr-2" /> {t('pairs.addPair')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{t('zones.deleteZone')}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {t('zones.deleteZone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-zone"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
