import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Bird,
  Edit,
  Trash2,
  Search,
  Filter,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { birdsApi } from '../lib/api';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'sonner';
import { CANARY_CLASSES } from '../data/canaryClasses';
import { useLanguage } from '../lib/LanguageContext';

// Class Selector Component with Search
const ClassSelector = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedClass = CANARY_CLASSES.find(c => c.id.toString() === value);

  const filteredClasses = useMemo(() => {
    if (!searchValue) return CANARY_CLASSES;
    const search = searchValue.toLowerCase();
    return CANARY_CLASSES.filter(c => 
      c.id.toString().includes(search) || 
      c.name.toLowerCase().includes(search)
    );
  }, [searchValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-[#1A2035] border-white/10 text-white hover:bg-[#1A2035] hover:text-white"
          data-testid="class-selector"
        >
          {selectedClass ? (
            <span className="truncate">
              <span className="text-[#FFC300] font-mono mr-2">{selectedClass.id}</span>
              {selectedClass.name}
            </span>
          ) : (
            <span className="text-slate-400">Select class...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-[#202940] border-white/10" align="start">
        <Command className="bg-transparent">
          <CommandInput 
            placeholder="Search by number or name..." 
            value={searchValue}
            onValueChange={setSearchValue}
            className="text-white"
            data-testid="class-search-input"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-slate-400 py-4 text-center">
              No class found.
            </CommandEmpty>
            <CommandGroup>
              {filteredClasses.map((canaryClass) => (
                <CommandItem
                  key={canaryClass.id}
                  value={`${canaryClass.id} ${canaryClass.name}`}
                  onSelect={() => {
                    onChange(canaryClass.id.toString());
                    setOpen(false);
                    setSearchValue('');
                  }}
                  className="text-white hover:bg-[#1A2035] cursor-pointer"
                  data-testid={`class-option-${canaryClass.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === canaryClass.id.toString() ? "opacity-100 text-[#FFC300]" : "opacity-0"
                    )}
                  />
                  <span className="text-[#FFC300] font-mono mr-2 w-8">{canaryClass.id}</span>
                  <span className="truncate">{canaryClass.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// STAM Selector with autocomplete from saved STAMs
const StamSelector = ({ value, onChange, savedStams }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const filteredStams = useMemo(() => {
    if (!inputValue) return savedStams;
    const search = inputValue.toLowerCase();
    return savedStams.filter(s => s.toLowerCase().includes(search));
  }, [inputValue, savedStams]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelect = (stam) => {
    setInputValue(stam);
    onChange(stam);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder="e.g., PT-2025-001"
            className="bg-[#1A2035] border-white/10 text-white font-mono"
            required
            data-testid="stam-input"
          />
        </div>
      </PopoverTrigger>
      {savedStams.length > 0 && (
        <PopoverContent className="w-[300px] p-0 bg-[#202940] border-white/10" align="start">
          <Command className="bg-transparent">
            <CommandList className="max-h-[200px]">
              {filteredStams.length === 0 ? (
                <div className="py-3 px-4 text-sm text-slate-400">
                  New STAM - will be saved for future use
                </div>
              ) : (
                <CommandGroup heading="Saved STAMs">
                  {filteredStams.slice(0, 10).map((stam) => (
                    <CommandItem
                      key={stam}
                      value={stam}
                      onSelect={() => handleSelect(stam)}
                      className="text-white hover:bg-[#1A2035] cursor-pointer font-mono"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === stam ? "opacity-100 text-[#FFC300]" : "opacity-0"
                        )}
                      />
                      {stam}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
};

export const Birds = () => {
  const { t } = useLanguage();
  const [birds, setBirds] = useState([]);
  const [savedStams, setSavedStams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editingBird, setEditingBird] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [editingGender, setEditingGender] = useState(null); // Track which bird's gender is being edited inline

  // Default year is previous year
  const defaultYear = new Date().getFullYear() - 1;

  const [formData, setFormData] = useState({
    band_number: '',
    band_year: defaultYear,
    gender: 'male',
    species: 'Canary',
    stam: '',
    class_id: '',
    notes: '',
    birth_date: '',
    parent_male_id: '',
    parent_female_id: '',
  });

  const fetchBirds = async () => {
    try {
      const res = await birdsApi.getAll();
      setBirds(res.data);
    } catch (error) {
      console.error('Error fetching birds:', error);
      toast.error('Failed to load birds');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedStams = async () => {
    try {
      const res = await birdsApi.getUniqueStams();
      setSavedStams(res.data);
    } catch (error) {
      console.error('Error fetching STAMs:', error);
    }
  };

  useEffect(() => {
    fetchBirds();
    fetchSavedStams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.stam.trim()) {
      toast.error(t('messages.stamRequired'));
      return;
    }
    if (!formData.class_id) {
      toast.error(t('messages.classRequired'));
      return;
    }

    try {
      if (editingBird) {
        await birdsApi.update(editingBird.id, formData);
        toast.success(t('messages.birdUpdated'));
      } else {
        await birdsApi.create(formData);
        toast.success(t('messages.birdCreated'));
      }
      setDialogOpen(false);
      setEditingBird(null);
      resetForm();
      fetchBirds();
      fetchSavedStams(); // Refresh STAMs list
    } catch (error) {
      // Check for STAM duplicate error
      if (error.response?.data?.detail?.includes('STAM')) {
        toast.error(error.response.data.detail);
      } else {
        toast.error(t('messages.birdSaveError'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      band_number: '',
      band_year: defaultYear,
      gender: 'male',
      species: 'Canary',
      stam: '',
      class_id: '',
      notes: '',
      birth_date: '',
      parent_male_id: '',
      parent_female_id: '',
    });
  };

  const handleEdit = (bird) => {
    setEditingBird(bird);
    setFormData({
      band_number: bird.band_number || '',
      band_year: bird.band_year || defaultYear,
      gender: bird.gender || 'male',
      species: bird.species || 'Canary',
      stam: bird.stam || bird.color || '',
      class_id: bird.class_id || '',
      notes: bird.notes || '',
      birth_date: bird.birth_date || '',
      parent_male_id: bird.parent_male_id || '',
      parent_female_id: bird.parent_female_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await birdsApi.delete(deleteDialog.id);
      toast.success(t('messages.birdDeleted'));
      setDeleteDialog(null);
      fetchBirds();
      fetchSavedStams();
    } catch (error) {
      toast.error(t('messages.birdDeleteError'));
    }
  };

  // Handle inline gender change for newborns (unknown gender)
  const handleInlineGenderChange = async (bird, newGender) => {
    try {
      await birdsApi.partialUpdate(bird.id, { gender: newGender });
      setBirds(prev => prev.map(b => 
        b.id === bird.id ? { ...b, gender: newGender } : b
      ));
      toast.success(t('messages.sexUpdated'));
      setEditingGender(null);
    } catch (error) {
      console.error('Error updating gender:', error);
      toast.error(t('messages.error'));
    }
  };

  const getClassName = (classId) => {
    const canaryClass = CANARY_CLASSES.find(c => c.id.toString() === classId);
    return canaryClass ? canaryClass.name : '-';
  };

  const filteredBirds = birds.filter((bird) => {
    const matchesSearch = 
      bird.band_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bird.stam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getClassName(bird.class_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'all' || bird.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  const maleCount = birds.filter(b => b.gender === 'male').length;
  const femaleCount = birds.filter(b => b.gender === 'female').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="birds-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            {t('birds.title')}
          </h1>
          <p className="text-slate-400 mt-1">
            {birds.length} {t('nav.birds').toLowerCase()} ({maleCount} {t('birds.males')}, {femaleCount} {t('birds.females')})
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingBird(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90 font-bold"
              data-testid="add-bird-btn"
            >
              <Plus size={20} className="mr-2" /> {t('birds.addBird')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#202940] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-['Barlow_Condensed']">
                {editingBird ? t('birds.editBird') : t('birds.addBird')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{t('birds.bandNumber')} *</Label>
                  <Input
                    value={formData.band_number}
                    onChange={(e) => setFormData({ ...formData, band_number: e.target.value })}
                    placeholder="e.g., PT-001"
                    className="bg-[#1A2035] border-white/10 text-white font-mono"
                    required
                    data-testid="band-number-input"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">{t('birds.bandYear')}</Label>
                  <Input
                    type="number"
                    value={formData.band_year}
                    onChange={(e) => setFormData({ ...formData, band_year: parseInt(e.target.value) })}
                    className="bg-[#1A2035] border-white/10 text-white"
                    data-testid="band-year-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{t('birds.gender')} *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger className="bg-[#1A2035] border-white/10 text-white" data-testid="gender-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202940] border-white/10">
                      <SelectItem value="male" className="text-white hover:bg-[#1A2035]">Male</SelectItem>
                      <SelectItem value="female" className="text-white hover:bg-[#1A2035]">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">
                    STAM * 
                    <span className="text-xs text-slate-500 ml-1">(unique per year)</span>
                  </Label>
                  <StamSelector
                    value={formData.stam}
                    onChange={(value) => setFormData({ ...formData, stam: value })}
                    savedStams={savedStams}
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Class * <span className="text-xs text-slate-500">(search by number or name)</span></Label>
                <ClassSelector
                  value={formData.class_id}
                  onChange={(value) => setFormData({ ...formData, class_id: value })}
                />
              </div>
              <div>
                <Label className="text-slate-300">Species</Label>
                <Input
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  placeholder="Canary"
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="species-input"
                />
              </div>
              <div>
                <Label className="text-slate-300">Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  className="bg-[#1A2035] border-white/10 text-white"
                  data-testid="notes-input"
                />
              </div>
              {/* Parent Selection for Genealogy */}
              <div className="border-t border-white/10 pt-4 mt-2">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Parents (for Family Tree)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 text-xs">Father (Male)</Label>
                    <Select
                      value={formData.parent_male_id}
                      onValueChange={(value) => setFormData({ ...formData, parent_male_id: value })}
                    >
                      <SelectTrigger className="bg-[#1A2035] border-white/10 text-white text-sm" data-testid="parent-male-select">
                        <SelectValue placeholder="Select father..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#202940] border-white/10 max-h-[200px]">
                        <SelectItem value="none" className="text-slate-400 hover:bg-[#1A2035]">None</SelectItem>
                        {birds.filter(b => b.gender === 'male' && b.id !== editingBird?.id).map((bird) => (
                          <SelectItem key={bird.id} value={bird.id} className="text-white hover:bg-[#1A2035]">
                            {bird.band_number} - {bird.stam || 'No STAM'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Mother (Female)</Label>
                    <Select
                      value={formData.parent_female_id}
                      onValueChange={(value) => setFormData({ ...formData, parent_female_id: value })}
                    >
                      <SelectTrigger className="bg-[#1A2035] border-white/10 text-white text-sm" data-testid="parent-female-select">
                        <SelectValue placeholder="Select mother..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#202940] border-white/10 max-h-[200px]">
                        <SelectItem value="none" className="text-slate-400 hover:bg-[#1A2035]">None</SelectItem>
                        {birds.filter(b => b.gender === 'female' && b.id !== editingBird?.id).map((bird) => (
                          <SelectItem key={bird.id} value={bird.id} className="text-white hover:bg-[#1A2035]">
                            {bird.band_number} - {bird.stam || 'No STAM'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  data-testid="save-bird-btn"
                >
                  {editingBird ? 'Update' : 'Add'} Bird
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-[#202940] border-white/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('birds.searchPlaceholder')}
                className="pl-10 bg-[#1A2035] border-white/10 text-white"
                data-testid="search-input"
              />
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-[#1A2035] border-white/10 text-white" data-testid="gender-filter">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#202940] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-[#1A2035]">{t('birds.allBirds')}</SelectItem>
                <SelectItem value="male" className="text-white hover:bg-[#1A2035]">{t('birds.malesOnly')}</SelectItem>
                <SelectItem value="female" className="text-white hover:bg-[#1A2035]">{t('birds.femalesOnly')}</SelectItem>
                <SelectItem value="unknown" className="text-white hover:bg-[#1A2035]">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FFC300]" />
                    {t('birds.newbornsOnly')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Birds Table */}
      {birds.length === 0 ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bird className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">{t('birds.noBirds')}</h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              {t('birds.noBirds')}
            </p>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90"
            >
              <Plus size={20} className="mr-2" /> {t('birds.addBird')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#202940] border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">{t('birds.band')}</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">{t('birds.gender')}</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">{t('birds.stam')}</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">{t('birds.class')}</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">{t('birds.year')}</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase">{t('birds.added')}</TableHead>
                  <TableHead className="text-slate-400 font-['Barlow_Condensed'] uppercase text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBirds.map((bird) => (
                  <TableRow 
                    key={bird.id} 
                    className="border-white/5 hover:bg-[#FFC300]/5"
                    data-testid={`bird-row-${bird.id}`}
                  >
                    <TableCell className="font-mono text-white">{bird.band_number}</TableCell>
                    <TableCell>
                      {bird.gender === 'unknown' ? (
                        // Newborn bird - allow inline gender editing
                        editingGender === bird.id ? (
                          <Select
                            value={bird.gender}
                            onValueChange={(value) => handleInlineGenderChange(bird, value)}
                          >
                            <SelectTrigger className="w-28 h-8 bg-[#1A2035] border-white/10 text-white text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#202940] border-white/10">
                              <SelectItem value="unknown" className="text-white hover:bg-[#1A2035]">
                                {t('common.unknown')}
                              </SelectItem>
                              <SelectItem value="male" className="text-white hover:bg-[#1A2035]">
                                {t('common.male')}
                              </SelectItem>
                              <SelectItem value="female" className="text-white hover:bg-[#1A2035]">
                                {t('common.female')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={() => setEditingGender(bird.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#FFC300]/20 text-[#FFC300] hover:bg-[#FFC300]/30 transition-colors"
                            title={t('newborns.clickToChangeSex') || 'Clique para alterar'}
                          >
                            {t('common.unknown')}
                            <Edit size={10} />
                          </button>
                        )
                      ) : (
                        // Adult bird - display only (no editing)
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                          bird.gender === 'male' 
                            ? 'bg-[#00BFA6]/20 text-[#00BFA6]' 
                            : 'bg-[#FF69B4]/20 text-[#FF69B4]'
                        )}>
                          {bird.gender === 'male' ? t('common.male') : t('common.female')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#FFC300] font-mono">{bird.stam || bird.color || '-'}</TableCell>
                    <TableCell className="text-slate-300 max-w-[200px] truncate" title={getClassName(bird.class_id)}>
                      {bird.class_id && (
                        <span className="text-[#FFC300] font-mono mr-1">{bird.class_id}</span>
                      )}
                      {getClassName(bird.class_id)}
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono">{bird.band_year}</TableCell>
                    <TableCell className="text-slate-400">{formatDate(bird.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(bird)}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#FFC300] hover:bg-[#FFC300]/10 transition-colors"
                          data-testid={`edit-bird-${bird.id}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteDialog(bird)}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#E91E63] hover:bg-[#E91E63]/10 transition-colors"
                          data-testid={`delete-bird-${bird.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="bg-[#202940] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Bird?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete this bird from the registry. If this bird is part of a breeding pair, 
              you should remove it from the pair first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#E91E63] text-white hover:bg-[#E91E63]/90"
              data-testid="confirm-delete-bird"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
