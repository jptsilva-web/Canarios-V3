import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitBranch,
  Bird,
  Users,
  ChevronRight,
  X,
  Search,
  Check,
  ChevronsUpDown,
  Filter,
  Baby
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
import { birdsApi, genealogyApi } from '../lib/api';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { CANARY_CLASSES } from '../data/canaryClasses';

const getGenderColor = (gender) => {
  switch (gender) {
    case 'male': return '#00BFA6';
    case 'female': return '#FF69B4';
    default: return '#FFC300'; // unknown/newborn
  }
};

const BirdNode = ({ bird, onClick, highlight, size = 'normal' }) => {
  if (!bird) {
    return (
      <div className={cn(
        "rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500",
        size === 'small' ? "w-20 h-16 text-xs" : "w-28 h-20"
      )}>
        <span>Unknown</span>
      </div>
    );
  }

  const getClassName = (classId) => {
    const c = CANARY_CLASSES.find(cls => cls.id.toString() === classId);
    return c ? c.name : '';
  };

  const genderColor = getGenderColor(bird.gender);

  return (
    <div 
      onClick={() => onClick && onClick(bird)}
      className={cn(
        "rounded-lg border-2 transition-all cursor-pointer",
        highlight && "ring-2 ring-[#FFC300] ring-offset-2 ring-offset-[#1A2035]",
        size === 'small' ? "w-20 h-16 p-1" : "w-28 h-20 p-2"
      )}
      style={{
        backgroundColor: `${genderColor}15`,
        borderColor: `${genderColor}50`,
      }}
      data-testid={`bird-node-${bird.id}`}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center gap-1">
          <Bird size={size === 'small' ? 10 : 14} style={{ color: genderColor }} />
          <span className={cn(
            "font-mono font-bold truncate",
            size === 'small' ? "text-[10px]" : "text-xs",
            "text-white"
          )}>
            {bird.band_number}
          </span>
        </div>
        <div className={cn(
          "text-slate-400 truncate",
          size === 'small' ? "text-[8px]" : "text-[10px]"
        )}>
          {bird.stam || '-'}
        </div>
        {size !== 'small' && (
          <div className="text-[9px] text-slate-500 truncate">
            {getClassName(bird.class_id) || bird.species}
          </div>
        )}
      </div>
    </div>
  );
};

const ConnectionLine = ({ direction = 'vertical' }) => (
  <div className={cn(
    "bg-slate-600",
    direction === 'vertical' ? "w-0.5 h-4" : "h-0.5 w-6"
  )} />
);

const TreeLevel = ({ label, children }) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-4">
      {children}
    </div>
  </div>
);

export const Genealogy = () => {
  const [birds, setBirds] = useState([]);
  const [selectedBird, setSelectedBird] = useState(null);
  const [genealogy, setGenealogy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingGenealogy, setLoadingGenealogy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [showNewbornsOnly, setShowNewbornsOnly] = useState(false);

  useEffect(() => {
    fetchBirds();
  }, []);

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

  const fetchGenealogy = async (birdId) => {
    setLoadingGenealogy(true);
    try {
      const res = await genealogyApi.getBirdGenealogy(birdId);
      setGenealogy(res.data);
    } catch (error) {
      console.error('Error fetching genealogy:', error);
      toast.error('Failed to load genealogy');
    } finally {
      setLoadingGenealogy(false);
    }
  };

  const getClassName = (classId) => {
    const c = CANARY_CLASSES.find(cls => cls.id.toString() === classId);
    return c ? c.name : '';
  };

  // Filter birds based on search query, gender, and newborn status
  const filteredBirds = useMemo(() => {
    return birds.filter(bird => {
      // Gender filter
      const matchesGender = genderFilter === 'all' || bird.gender === genderFilter;
      
      // Newborns filter - birds with unknown gender OR notes containing "Newborn"
      const isNewborn = bird.gender === 'unknown' || bird.notes?.toLowerCase().includes('newborn');
      const matchesNewborn = !showNewbornsOnly || isNewborn;
      
      // Search filter
      if (!searchQuery) return matchesGender && matchesNewborn;
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        bird.band_number?.toLowerCase().includes(query) ||
        bird.stam?.toLowerCase().includes(query) ||
        getClassName(bird.class_id)?.toLowerCase().includes(query) ||
        bird.species?.toLowerCase().includes(query);
      
      return matchesSearch && matchesGender && matchesNewborn;
    });
  }, [birds, searchQuery, genderFilter, showNewbornsOnly]);
  
  // Count newborns
  const newbornCount = useMemo(() => {
    return birds.filter(b => b.gender === 'unknown' || b.notes?.toLowerCase().includes('newborn')).length;
  }, [birds]);

  const handleSelectBird = (birdId) => {
    const bird = birds.find(b => b.id === birdId);
    setSelectedBird(bird);
    setSearchOpen(false);
    setSearchQuery('');
    if (birdId) {
      fetchGenealogy(birdId);
    } else {
      setGenealogy(null);
    }
  };

  const handleBirdClick = (bird) => {
    if (bird && bird.id !== selectedBird?.id) {
      setSelectedBird(bird);
      fetchGenealogy(bird.id);
    }
  };

  const clearSelection = () => {
    setSelectedBird(null);
    setGenealogy(null);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="genealogy-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-['Barlow_Condensed'] tracking-tight">
            Family Tree
          </h1>
          <p className="text-slate-400 mt-1">
            View bird genealogy and lineage
          </p>
        </div>
      </div>

      {/* Bird Selector with Search */}
      <Card className="bg-[#202940] border-white/5">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Searchable Bird Selector */}
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={searchOpen}
                    className="w-full sm:w-96 justify-between bg-[#1A2035] border-white/10 text-white hover:bg-[#1A2035] hover:text-white"
                    data-testid="bird-search-selector"
                  >
                    {selectedBird ? (
                      <div className="flex items-center gap-2">
                        <Bird size={16} className={selectedBird.gender === 'male' ? 'text-[#00BFA6]' : 'text-[#FF69B4]'} />
                        <span className="font-mono">{selectedBird.band_number}</span>
                        <span className="text-slate-400">- {selectedBird.stam || 'No STAM'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-2">
                        <Search size={16} />
                        Search bird by band, STAM, or class...
                      </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-[#202940] border-white/10" align="start">
                  <Command className="bg-transparent">
                    <CommandInput 
                      placeholder="Search by band number, STAM, class..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                      className="text-white"
                      data-testid="genealogy-search-input"
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty className="text-slate-400 py-6 text-center">
                        <Bird className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No birds found matching "{searchQuery}"
                      </CommandEmpty>
                      <CommandGroup heading={`${filteredBirds.length} birds found`}>
                        {filteredBirds.map((bird) => (
                          <CommandItem
                            key={bird.id}
                            value={`${bird.band_number} ${bird.stam || ''} ${getClassName(bird.class_id)}`}
                            onSelect={() => handleSelectBird(bird.id)}
                            className="text-white hover:bg-[#1A2035] cursor-pointer py-2"
                            data-testid={`bird-option-${bird.id}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedBird?.id === bird.id ? "opacity-100 text-[#FFC300]" : "opacity-0"
                              )}
                            />
                            <Bird 
                              size={16} 
                              style={{ color: getGenderColor(bird.gender) }}
                              className="mr-2"
                            />
                            <div className="flex-1 flex items-center gap-2">
                              <span className="font-mono font-medium">{bird.band_number}</span>
                              <span className="text-slate-400">·</span>
                              <span className="text-[#FFC300] text-sm">{bird.stam || '-'}</span>
                              {bird.class_id && (
                                <>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-xs text-slate-500 truncate max-w-[120px]">
                                    {getClassName(bird.class_id)}
                                  </span>
                                </>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">{bird.band_year}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Gender Filter */}
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger 
                  className="w-full sm:w-40 bg-[#1A2035] border-white/10 text-white"
                  data-testid="gender-filter"
                >
                  <Filter size={16} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#202940] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#1A2035]">All Birds</SelectItem>
                  <SelectItem value="male" className="text-white hover:bg-[#1A2035]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00BFA6]" />
                      Males Only
                    </span>
                  </SelectItem>
                  <SelectItem value="female" className="text-white hover:bg-[#1A2035]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF69B4]" />
                      Females Only
                    </span>
                  </SelectItem>
                  <SelectItem value="unknown" className="text-white hover:bg-[#1A2035]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FFC300]" />
                      Unknown Gender
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Newborns Filter */}
              <Button
                variant={showNewbornsOnly ? "default" : "outline"}
                onClick={() => setShowNewbornsOnly(!showNewbornsOnly)}
                className={cn(
                  "transition-colors",
                  showNewbornsOnly 
                    ? "bg-[#FFC300] text-[#1A2035] hover:bg-[#FFC300]/90" 
                    : "border-[#FFC300]/50 text-[#FFC300] hover:bg-[#FFC300]/10"
                )}
                data-testid="newborns-filter"
              >
                <Baby size={16} className="mr-2" />
                Newborns ({newbornCount})
              </Button>

              {/* Clear Button */}
              {selectedBird && (
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  className="border-white/10 text-white hover:bg-white/5"
                  data-testid="clear-selection-btn"
                >
                  <X size={16} className="mr-2" /> Clear
                </Button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="text-slate-500">
                Total: <span className="text-white font-medium">{birds.length}</span> birds
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-[#00BFA6]">
                {birds.filter(b => b.gender === 'male').length} males
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-[#FF69B4]">
                {birds.filter(b => b.gender === 'female').length} females
              </span>
              {genderFilter !== 'all' && (
                <>
                  <span className="text-slate-500">|</span>
                  <span className="text-[#FFC300]">
                    Showing: {filteredBirds.length} {genderFilter}s
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Tree Visualization */}
      {!selectedBird ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="w-16 h-16 text-slate-500 mb-4" />
            <h3 className="text-xl font-['Barlow_Condensed'] text-white mb-2">Select a Bird</h3>
            <p className="text-slate-400 text-center max-w-md">
              Choose a bird from the dropdown above to view its family tree, including parents, grandparents, children, and siblings.
            </p>
          </CardContent>
        </Card>
      ) : loadingGenealogy ? (
        <Card className="bg-[#202940] border-white/5">
          <CardContent className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFC300]" />
          </CardContent>
        </Card>
      ) : genealogy ? (
        <div className="space-y-6">
          {/* Ancestors Tree */}
          <Card className="bg-[#202940] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
                <GitBranch size={20} className="text-[#FFC300]" />
                Ancestry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 py-4 overflow-x-auto">
                {/* Grandparents */}
                <TreeLevel label="Grandparents">
                  <div className="flex items-center gap-8">
                    {/* Paternal Grandparents */}
                    <div className="flex items-center gap-2">
                      <BirdNode 
                        bird={genealogy.grandparents?.paternal?.male} 
                        onClick={handleBirdClick}
                        size="small"
                      />
                      <BirdNode 
                        bird={genealogy.grandparents?.paternal?.female} 
                        onClick={handleBirdClick}
                        size="small"
                      />
                    </div>
                    {/* Maternal Grandparents */}
                    <div className="flex items-center gap-2">
                      <BirdNode 
                        bird={genealogy.grandparents?.maternal?.male} 
                        onClick={handleBirdClick}
                        size="small"
                      />
                      <BirdNode 
                        bird={genealogy.grandparents?.maternal?.female} 
                        onClick={handleBirdClick}
                        size="small"
                      />
                    </div>
                  </div>
                </TreeLevel>

                {/* Connection lines */}
                <div className="flex items-center gap-32">
                  <ConnectionLine />
                  <ConnectionLine />
                </div>

                {/* Parents */}
                <TreeLevel label="Parents">
                  <BirdNode 
                    bird={genealogy.parents?.male} 
                    onClick={handleBirdClick}
                  />
                  <BirdNode 
                    bird={genealogy.parents?.female} 
                    onClick={handleBirdClick}
                  />
                </TreeLevel>

                {/* Connection to selected bird */}
                <ConnectionLine />

                {/* Selected Bird */}
                <TreeLevel label="Selected Bird">
                  <BirdNode 
                    bird={genealogy.bird} 
                    highlight={true}
                  />
                </TreeLevel>
              </div>
            </CardContent>
          </Card>

          {/* Siblings */}
          {genealogy.siblings?.length > 0 && (
            <Card className="bg-[#202940] border-white/5">
              <CardHeader>
                <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
                  <Users size={20} className="text-[#FF9800]" />
                  Siblings ({genealogy.siblings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {genealogy.siblings.map((sibling) => (
                    <BirdNode 
                      key={sibling.id}
                      bird={sibling} 
                      onClick={handleBirdClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Children */}
          {genealogy.children?.length > 0 && (
            <Card className="bg-[#202940] border-white/5">
              <CardHeader>
                <CardTitle className="text-lg font-['Barlow_Condensed'] text-white uppercase tracking-wider flex items-center gap-2">
                  <Bird size={20} className="text-[#00BFA6]" />
                  Offspring ({genealogy.children.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {genealogy.children.map((child) => (
                    <BirdNode 
                      key={child.id}
                      bird={child} 
                      onClick={handleBirdClick}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No relatives message */}
          {!genealogy.parents?.male && !genealogy.parents?.female && 
           genealogy.siblings?.length === 0 && genealogy.children?.length === 0 && (
            <Card className="bg-[#202940] border-white/5">
              <CardContent className="py-8 text-center">
                <p className="text-slate-400">
                  No family relationships found for this bird. 
                  Add parent information when creating birds to build the family tree.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
};
